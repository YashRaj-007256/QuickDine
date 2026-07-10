import "dotenv/config";
import express, { Request, Response } from 'express';
import cors from "cors";
import connectToMongoDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import restaurantRoutes from "./routes/restaurantRoutes.js";
import bookingRoutes from "./routes/bookingRoutes.js";

const app = express();
//Connect to MongoDB
await connectToMongoDB();

// Middleware
app.use(cors());
app.use(express.json());

// Static folder for restaurant image uploads
app.use("/uploads", express.static("uploads"));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/restaurants", restaurantRoutes);
app.use("/api/bookings", bookingRoutes);

const port = process.env.PORT || 5000;

app.get('/', (req: Request, res: Response) => {
    res.send('Server is Live!');
});

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});