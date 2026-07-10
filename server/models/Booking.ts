import mongoose, { Schema, Document } from "mongoose";

export interface IBooking extends Document {
    user: mongoose.Types.ObjectId;
    restaurant: mongoose.Types.ObjectId;
    date: Date;
    time: string;
    guests: number;
    occasion?: string;
    specialRequests?: string;
    status: "confirmed" | "cancelled";
    bookingId: string;
    createdAt: Date;
    updatedAt: Date;
}

const BookingSchema: Schema = new Schema(
    {
        user: { type: Schema.Types.ObjectId, ref: "User", required: true },
        restaurant: { type: Schema.Types.ObjectId, ref: "Restaurant", required: true },
        date: { type: Date, required: true },
        time: { type: String, required: true },
        guests: { type: Number, required: true },
        occasion: { type: String, default: "" },
        specialRequests: { type: String, default: "" },
        status: { type: String, enum: ["confirmed", "cancelled"], default: "confirmed" },
        bookingId: { type: String, required: true, unique: true },
    },
    {
        timestamps: true,
    }
);

export default mongoose.models.Booking || mongoose.model<IBooking>("Booking", BookingSchema);
