import express from "express";
import multer from "multer";
import fs from "fs";
import {
    getRestaurants,
    getTrendingRestaurants,
    getRestaurantBySlug,
    getMyRestaurant,
    createRestaurant,
    updateRestaurant,
    getSlotAvailability,
    adminGetRestaurants,
    adminUpdateRestaurantStatus,
} from "../controllers/restaurantController.js";
import { authProtect, requireRole } from "../middleware/authMiddleware.js";

const router = express.Router();

// Ensure upload directory exists
const uploadDir = "./uploads";
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer Config
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g, "_")}`);
    },
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

// Public Routes
router.get("/", getRestaurants);
router.get("/trending", getTrendingRestaurants);
router.get("/:slug/availability", getSlotAvailability);
router.get("/detail/:slug", getRestaurantBySlug); // We can query by slug at /detail/:slug or /:slug. Let's support /detail/:slug to avoid clashing with other endpoints!

// Owner Routes
router.get("/owner/my-restaurant", authProtect, requireRole(["owner"]), getMyRestaurant);
router.post("/", authProtect, requireRole(["owner"]), upload.single("image"), createRestaurant);
router.put("/owner/my-restaurant", authProtect, requireRole(["owner"]), upload.single("image"), updateRestaurant);

// Admin Routes
router.get("/admin/all", authProtect, requireRole(["admin"]), adminGetRestaurants);
router.put("/admin/:restaurantId/status", authProtect, requireRole(["admin"]), adminUpdateRestaurantStatus);

export default router;
