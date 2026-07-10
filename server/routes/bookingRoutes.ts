import express from "express";
import {
    createBooking,
    getMyBookings,
    getOwnerBookings,
    getAdminStats,
    cancelBooking,
} from "../controllers/bookingController.js";
import { authProtect, requireRole } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", authProtect, createBooking);
router.get("/my-bookings", authProtect, getMyBookings);
router.get("/owner-bookings", authProtect, requireRole(["owner"]), getOwnerBookings);
router.get("/admin/stats", authProtect, requireRole(["admin"]), getAdminStats);
router.put("/:id/cancel", authProtect, cancelBooking);

export default router;
