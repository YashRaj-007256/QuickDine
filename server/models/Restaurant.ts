import mongoose, { Schema, Document } from "mongoose";

export interface IRestaurant extends Document {
    name: string;
    slug: string;
    description: string;
    cuisine: string;
    priceRange: string;
    rating: number;
    reviewCount: number;
    location: string;
    address: string;
    image: string;
    chef: string;
    tags: string[];
    availableSlots: string[];
    featured: boolean;
    exclusive: boolean;
    owner: mongoose.Types.ObjectId;
    status: "pending" | "approved" | "rejected";
    totalSeats: number;
    createdAt: Date;
    updatedAt: Date;
}

const RestaurantSchema: Schema = new Schema(
    {
        name: { type: String, required: true, trim: true },
        slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
        description: { type: String, required: true },
        cuisine: { type: String, required: true, trim: true },
        priceRange: { type: String, required: true, enum: ["$", "$$", "$$$", "$$$$"] },
        rating: { type: Number, default: 0 },
        reviewCount: { type: Number, default: 0 },
        location: { type: String, required: true, trim: true },
        address: { type: String, required: true },
        image: { type: String, default: "/restaurant_5.png" },
        chef: { type: String, required: true, trim: true },
        tags: [{ type: String }],
        availableSlots: [{ type: String }],
        featured: { type: Boolean, default: false },
        exclusive: { type: Boolean, default: false },
        owner: { type: Schema.Types.ObjectId, ref: "User", required: true },
        status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
        totalSeats: { type: Number, required: true },
    },
    {
        timestamps: true,
    }
);

export default mongoose.models.Restaurant || mongoose.model<IRestaurant>("Restaurant", RestaurantSchema);
