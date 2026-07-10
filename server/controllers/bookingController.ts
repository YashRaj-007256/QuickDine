import { Response } from "express";
import Booking from "../models/Booking.js";
import Restaurant from "../models/Restaurant.js";
import User from "../models/User.js";
import { AuthRequest } from "../middleware/authMiddleware.js";

// Helper to generate a unique booking reference ID
const generateBookingId = (): string => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "";
    for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `GR-${code}`;
};

// @desc    Create a new booking/reservation
// @route   POST /api/bookings
// @access  Private
export const createBooking = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { restaurantId, date, time, guests, occasion, specialRequests } = req.body;

        if (!restaurantId || !date || !time || !guests) {
            res.status(400).json({ message: "Please provide restaurantId, date, time, and guests" });
            return;
        }

        const restaurant = await Restaurant.findById(restaurantId);
        if (!restaurant) {
            res.status(404).json({ message: "Restaurant not found" });
            return;
        }

        if (restaurant.status !== "approved") {
            res.status(400).json({ message: "Cannot book a table at this restaurant right now" });
            return;
        }

        const bookingDate = new Date(date);
        const startOfDay = new Date(bookingDate.setHours(0, 0, 0, 0));
        const endOfDay = new Date(bookingDate.setHours(23, 59, 59, 999));

        // Calculate current reservations for this time slot
        const existingBookings = await Booking.find({
            restaurant: restaurant._id,
            date: { $gte: startOfDay, $lte: endOfDay },
            time,
            status: "confirmed",
        });

        const seatsTaken = existingBookings.reduce((sum, b) => sum + b.guests, 0);
        const availableSeats = restaurant.totalSeats - seatsTaken;

        if (availableSeats < Number(guests)) {
            res.status(400).json({
                message: `Fully Booked. Only ${availableSeats} seat(s) are remaining for ${time} on this date.`,
            });
            return;
        }

        // Generate a unique booking ID
        let bookingId = generateBookingId();
        while (await Booking.findOne({ bookingId })) {
            bookingId = generateBookingId();
        }

        const booking = await Booking.create({
            user: req.user?._id,
            restaurant: restaurant._id,
            date,
            time,
            guests: Number(guests),
            occasion: occasion || "",
            specialRequests: specialRequests || "",
            status: "confirmed",
            bookingId,
        });

        const populatedBooking = await Booking.findById(booking._id).populate("restaurant", "name location address image");
        res.status(201).json(populatedBooking);
    } catch (error: any) {
        console.error("Create booking error:", error);
        res.status(500).json({ message: error.message || "Server Error" });
    }
};

// @desc    Get user bookings
// @route   GET /api/bookings/my-bookings
// @access  Private
export const getMyBookings = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const bookings = await Booking.find({ user: req.user?._id })
            .populate("restaurant", "name slug location address image")
            .sort({ date: -1, time: -1 });
        res.json(bookings);
    } catch (error: any) {
        console.error("Get my bookings error:", error);
        res.status(500).json({ message: error.message || "Server Error" });
    }
};

// @desc    Get owner's restaurant bookings
// @route   GET /api/bookings/owner-bookings
// @access  Private (Owner)
export const getOwnerBookings = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const restaurant = await Restaurant.findOne({ owner: req.user?._id });
        if (!restaurant) {
            res.json([]);
            return;
        }

        const bookings = await Booking.find({ restaurant: restaurant._id })
            .populate("user", "name email phone")
            .sort({ date: -1, time: -1 });

        res.json(bookings);
    } catch (error: any) {
        console.error("Get owner bookings error:", error);
        res.status(500).json({ message: error.message || "Server Error" });
    }
};

// @desc    Get master stats (Admin Console)
// @route   GET /api/admin/stats
// @access  Private (Admin)
export const getAdminStats = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const totalUsers = await User.countDocuments({ role: "user" });
        const totalOwners = await User.countDocuments({ role: "owner" });
        const totalAllUsers = await User.countDocuments({});

        const totalRestaurants = await Restaurant.countDocuments({});
        const totalBookings = await Booking.countDocuments({});

        const latestBookings = await Booking.find({})
            .populate("user", "name email")
            .populate("restaurant", "name")
            .sort({ createdAt: -1 })
            .limit(5);

        res.json({
            users: {
                totalUsers,
                totalOwners,
                total: totalAllUsers,
            },
            restaurants: {
                total: totalRestaurants,
            },
            bookings: {
                total: totalBookings,
            },
            latestBookings,
        });
    } catch (error: any) {
        console.error("Get admin stats error:", error);
        res.status(500).json({ message: error.message || "Server Error" });
    }
};

// @desc    Cancel a booking
// @route   PUT /api/bookings/:id/cancel
// @access  Private
export const cancelBooking = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const booking = await Booking.findById(req.params.id);
        if (!booking) {
            res.status(404).json({ message: "Booking not found" });
            return;
        }

        // Check if user is the booking owner or restaurant owner
        if (booking.user.toString() !== req.user?._id.toString()) {
            const restaurant = await Restaurant.findById(booking.restaurant);
            if (!restaurant || restaurant.owner.toString() !== req.user?._id.toString()) {
                res.status(403).json({ message: "Not authorized to cancel this booking" });
                return;
            }
        }

        booking.status = "cancelled";
        await booking.save();
        res.json(booking);
    } catch (error: any) {
        console.error("Cancel booking error:", error);
        res.status(500).json({ message: error.message || "Server Error" });
    }
};
