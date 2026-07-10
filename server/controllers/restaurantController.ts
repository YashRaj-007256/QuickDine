import { Request, Response } from "express";
import Restaurant from "../models/Restaurant.js";
import Booking from "../models/Booking.js";
import { AuthRequest } from "../middleware/authMiddleware.js";

// Helper to generate a URL slug from name
const generateSlug = (name: string): string => {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)+/g, "");
};

// @desc    Get all approved restaurants with optional query filters
// @route   GET /api/restaurants
// @access  Public
export const getRestaurants = async (req: Request, res: Response): Promise<void> => {
    try {
        const { search, location, cuisine, priceRange } = req.query;
        const filter: any = { status: "approved" };

        if (search) {
            filter.name = { $regex: search as string, $options: "i" };
        }
        if (location) {
            filter.location = { $regex: location as string, $options: "i" };
        }
        // Handle array or single string for cuisine
        if (cuisine) {
            if (Array.isArray(cuisine)) {
                filter.cuisine = { $in: cuisine.map(c => new RegExp(`^${c}$`, "i")) };
            } else {
                filter.cuisine = { $regex: `^${cuisine}$`, $options: "i" };
            }
        }
        // Handle array or single string for priceRange
        if (priceRange) {
            if (Array.isArray(priceRange)) {
                filter.priceRange = { $in: priceRange };
            } else {
                filter.priceRange = priceRange;
            }
        }

        const restaurants = await Restaurant.find(filter).populate("owner", "name email");
        res.json(restaurants);
    } catch (error: any) {
        console.error("Get restaurants error:", error);
        res.status(500).json({ message: error.message || "Server Error" });
    }
};

// @desc    Get trending/featured restaurants
// @route   GET /api/restaurants/trending
// @access  Public
export const getTrendingRestaurants = async (req: Request, res: Response): Promise<void> => {
    try {
        // Find approved and featured, fallback to any approved
        let trending = await Restaurant.find({ status: "approved", featured: true }).limit(3);
        if (trending.length === 0) {
            trending = await Restaurant.find({ status: "approved" }).limit(3);
        }
        res.json(trending);
    } catch (error: any) {
        console.error("Get trending error:", error);
        res.status(500).json({ message: error.message || "Server Error" });
    }
};

// @desc    Get a single restaurant by slug
// @route   GET /api/restaurants/:slug
// @access  Public
export const getRestaurantBySlug = async (req: Request, res: Response): Promise<void> => {
    try {
        const restaurant = await Restaurant.findOne({ slug: req.params.slug }).populate("owner", "name email");
        if (!restaurant) {
            res.status(404).json({ message: "Restaurant not found" });
            return;
        }
        res.json(restaurant);
    } catch (error: any) {
        console.error("Get restaurant by slug error:", error);
        res.status(500).json({ message: error.message || "Server Error" });
    }
};

// @desc    Get the logged in owner's restaurant profile
// @route   GET /api/restaurants/my-restaurant
// @access  Private (Owner)
export const getMyRestaurant = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const restaurant = await Restaurant.findOne({ owner: req.user?._id });
        if (!restaurant) {
            res.status(200).json(null);
            return;
        }
        res.json(restaurant);
    } catch (error: any) {
        console.error("Get my restaurant error:", error);
        res.status(500).json({ message: error.message || "Server Error" });
    }
};

// @desc    Register a new restaurant (Owner Wizard)
// @route   POST /api/restaurants
// @access  Private (Owner)
export const createRestaurant = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { name, description, cuisine, priceRange, location, address, chef, tags, availableSlots, totalSeats } = req.body;

        if (!name || !description || !cuisine || !priceRange || !location || !address || !chef || !totalSeats) {
            res.status(400).json({ message: "Please provide all required fields" });
            return;
        }

        // Check if owner already has a restaurant registered
        const existing = await Restaurant.findOne({ owner: req.user?._id });
        if (existing) {
            res.status(400).json({ message: "You have already registered a restaurant profile" });
            return;
        }

        let slug = generateSlug(name);
        // Ensure slug is unique
        let suffix = 1;
        while (await Restaurant.findOne({ slug })) {
            slug = `${generateSlug(name)}-${suffix}`;
            suffix++;
        }

        // Handle uploaded image file
        let imagePath = "/restaurant_5.png";
        if (req.file) {
            imagePath = `/uploads/${req.file.filename}`;
        }

        const tagsArray = typeof tags === "string" ? tags.split(",").map((t: string) => t.trim()) : tags;
        const slotsArray = typeof availableSlots === "string" ? availableSlots.split(",").map((s: string) => s.trim()) : availableSlots;

        const restaurant = await Restaurant.create({
            name,
            slug,
            description,
            cuisine,
            priceRange,
            location,
            address,
            image: imagePath,
            chef,
            tags: tagsArray || [],
            availableSlots: slotsArray || ["18:00", "19:00", "20:00", "21:00", "22:00"],
            owner: req.user?._id,
            totalSeats: Number(totalSeats),
            status: "pending",
        });

        res.status(201).json(restaurant);
    } catch (error: any) {
        console.error("Create restaurant error:", error);
        res.status(500).json({ message: error.message || "Server Error" });
    }
};

// @desc    Update owner's restaurant profile
// @route   PUT /api/restaurants/my-restaurant
// @access  Private (Owner)
export const updateRestaurant = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const restaurant = await Restaurant.findOne({ owner: req.user?._id });
        if (!restaurant) {
            res.status(404).json({ message: "Restaurant profile not found" });
            return;
        }

        const { name, description, cuisine, priceRange, location, address, chef, tags, availableSlots, totalSeats } = req.body;

        if (name && name !== restaurant.name) {
            restaurant.name = name;
            let slug = generateSlug(name);
            let suffix = 1;
            while (await Restaurant.findOne({ slug, _id: { $ne: restaurant._id } })) {
                slug = `${generateSlug(name)}-${suffix}`;
                suffix++;
            }
            restaurant.slug = slug;
        }

        if (description) restaurant.description = description;
        if (cuisine) restaurant.cuisine = cuisine;
        if (priceRange) restaurant.priceRange = priceRange;
        if (location) restaurant.location = location;
        if (address) restaurant.address = address;
        if (chef) restaurant.chef = chef;

        if (tags) {
            restaurant.tags = typeof tags === "string" ? tags.split(",").map((t: string) => t.trim()) : tags;
        }
        if (availableSlots) {
            restaurant.availableSlots = typeof availableSlots === "string" ? availableSlots.split(",").map((s: string) => s.trim()) : availableSlots;
        }
        if (totalSeats) {
            restaurant.totalSeats = Number(totalSeats);
        }

        // Handle uploaded image file
        if (req.file) {
            restaurant.image = `/uploads/${req.file.filename}`;
        }

        await restaurant.save();
        res.json(restaurant);
    } catch (error: any) {
        console.error("Update restaurant error:", error);
        res.status(500).json({ message: error.message || "Server Error" });
    }
};

// @desc    Check capacity & slot availability on a specific date
// @route   GET /api/restaurants/:slug/availability
// @access  Public
export const getSlotAvailability = async (req: Request, res: Response): Promise<void> => {
    try {
        const { date } = req.query;
        if (!date) {
            res.status(400).json({ message: "Please provide a date query parameter" });
            return;
        }

        const restaurant = await Restaurant.findOne({ slug: req.params.slug });
        if (!restaurant) {
            res.status(404).json({ message: "Restaurant not found" });
            return;
        }

        const queryDate = new Date(date as string);
        // Start and end of the query date to filter bookings
        const startOfDay = new Date(queryDate.setHours(0, 0, 0, 0));
        const endOfDay = new Date(queryDate.setHours(23, 59, 59, 999));

        // Get all active bookings for this restaurant on this date
        const bookings = await Booking.find({
            restaurant: restaurant._id,
            date: { $gte: startOfDay, $lte: endOfDay },
            status: "confirmed",
        });

        // Compute seats booked per time slot
        const slotBookings: { [time: string]: number } = {};
        bookings.forEach(b => {
            slotBookings[b.time] = (slotBookings[b.time] || 0) + b.guests;
        });

        // Calculate availability list
        const availability = restaurant.availableSlots.map((time: string) => {
            const seatsTaken = slotBookings[time] || 0;
            const availableSeats = Math.max(0, restaurant.totalSeats - seatsTaken);
            return {
                time,
                availableSeats,
                isAvailable: availableSeats > 0,
            };
        });

        res.json(availability);
    } catch (error: any) {
        console.error("Get availability error:", error);
        res.status(500).json({ message: error.message || "Server Error" });
    }
};

// @desc    Get all restaurants (Admin console)
// @route   GET /api/admin/restaurants
// @access  Private (Admin)
export const adminGetRestaurants = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const restaurants = await Restaurant.find({}).populate("owner", "name email");
        res.json(restaurants);
    } catch (error: any) {
        console.error("Admin get restaurants error:", error);
        res.status(500).json({ message: error.message || "Server Error" });
    }
};

// @desc    Approve/Reject pending restaurant
// @route   PUT /api/admin/restaurants/:restaurantId/status
// @access  Private (Admin)
export const adminUpdateRestaurantStatus = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { status } = req.body;
        if (!status || !["approved", "rejected"].includes(status)) {
            res.status(400).json({ message: "Please provide a valid status ('approved' or 'rejected')" });
            return;
        }

        const restaurant = await Restaurant.findById(req.params.restaurantId);
        if (!restaurant) {
            res.status(404).json({ message: "Restaurant not found" });
            return;
        }

        restaurant.status = status;
        await restaurant.save();

        res.json(restaurant);
    } catch (error: any) {
        console.error("Admin update status error:", error);
        res.status(500).json({ message: error.message || "Server Error" });
    }
};
