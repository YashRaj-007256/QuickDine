import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
    name: string;
    email: string;
    passwordHash: string;
    phone?: string;
    role: "user" | "admin" | "owner";
    createdAt: Date;
    updatedAt: Date;
}

const UserSchema: Schema = new Schema(
    {
        name: { type: String, required: true, trim: true },
        email: { type: String, required: true, unique: true, lowercase: true, trim: true },
        passwordHash: { type: String, required: true },
        phone: { type: String, trim: true },
        role: { type: String, enum: ["user", "admin", "owner"], default: "user" },
    },
    {
        timestamps: true,
    }
);

export default mongoose.models.User || mongoose.model<IUser>("User", UserSchema);
