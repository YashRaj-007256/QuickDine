import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import User, { IUser } from "../models/User.js";

const JWT_SECRET = process.env.JWT_SECRET || "quickdine_jwt_secret_key_12345";

export interface AuthRequest extends Request {
    user?: IUser;
}

export const authProtect = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        let token: string | undefined;

        if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
            token = req.headers.authorization.split(" ")[1];
        }

        if (!token) {
            res.status(401).json({ message: "Not authorized, no token provided" });
            return;
        }

        const decoded = jwt.verify(token, JWT_SECRET) as { id: string };

        const user = await User.findById(decoded.id).select("-passwordHash");
        if (!user) {
            res.status(401).json({ message: "Not authorized, user not found" });
            return;
        }

        req.user = user;
        next();
    } catch (error) {
        console.error("Auth verification error:", error);
        res.status(401).json({ message: "Not authorized, invalid token" });
    }
};

export const requireRole = (roles: Array<"user" | "owner" | "admin">) => {
    return (req: AuthRequest, res: Response, next: NextFunction): void => {
        if (!req.user || !roles.includes(req.user.role)) {
            res.status(403).json({ message: "Forbidden, insufficient permissions" });
            return;
        }
        next();
    };
};
