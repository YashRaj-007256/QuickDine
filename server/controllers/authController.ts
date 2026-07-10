import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { AuthRequest } from "../middleware/authMiddleware.js";

const JWT_SECRET = process.env.JWT_SECRET || "quickdine_jwt_secret_key_12345";

const generateToken = (id: string): string => {
    return jwt.sign({ id }, JWT_SECRET, { expiresIn: "30d" });
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
export const registerUser = async (req: Request, res: Response): Promise<void> => {
    try {
        const { name, email, password, phone, role } = req.body;

        if (!name || !email || !password) {
            res.status(400).json({ message: "Please provide name, email, and password" });
            return;
        }

        const userExists = await User.findOne({ email });
        if (userExists) {
            res.status(400).json({ message: "User already exists with this email" });
            return;
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        // Create user
        const user = await User.create({
            name,
            email,
            passwordHash,
            phone,
            role: role || "user",
        });

        if (user) {
            res.status(201).json({
                _id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                role: user.role,
                token: generateToken(user._id as string),
                createdAt: user.createdAt,
                updatedAt: user.updatedAt,
            });
        } else {
            res.status(400).json({ message: "Invalid user data" });
        }
    } catch (error: any) {
        console.error("Registration error:", error);
        res.status(500).json({ message: error.message || "Server Error" });
    }
};

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
// @access  Public
export const loginUser = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            res.status(400).json({ message: "Please provide email and password" });
            return;
        }

        const user = await User.findOne({ email });
        if (!user) {
            res.status(401).json({ message: "Invalid email or password" });
            return;
        }

        const isMatch = await bcrypt.compare(password, user.passwordHash);
        if (!isMatch) {
            res.status(401).json({ message: "Invalid email or password" });
            return;
        }

        res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            role: user.role,
            token: generateToken(user._id as string),
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
        });
    } catch (error: any) {
        console.error("Login error:", error);
        res.status(500).json({ message: error.message || "Server Error" });
    }
};

// @desc    Get current user details
// @route   GET /api/auth/me
// @access  Private
export const getCurrentUser = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(404).json({ message: "User not found" });
            return;
        }
        res.json(req.user);
    } catch (error: any) {
        console.error("Get user profile error:", error);
        res.status(500).json({ message: error.message || "Server Error" });
    }
};
