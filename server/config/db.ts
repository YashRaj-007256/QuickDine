import mongoose from "mongoose";
import dns from "dns";

const connectDB = async () => {
    // Set DNS servers to Google's public DNS to bypass local resolver issues for MongoDB Atlas SRV
    try {
        dns.setServers(["8.8.8.8", "8.8.4.4"]);
        console.log("DNS servers set to Google DNS for Atlas resolution");
    } catch (dnsErr) {
        console.warn("Could not set custom DNS servers, using system default:", dnsErr);
    }

    mongoose.connection.on("connected", () =>
        console.log("MongoDB connected")
    );

    console.log("MONGODB_URI:", process.env.MONGODB_URI);

    await mongoose.connect(process.env.MONGODB_URI!);
};

export default connectDB;