import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

const connectDB = async(req,res)=>{
    try {
        await mongoose.connect(process.env.MONGODB_URI)
        console.log("Database connected");
    } catch (error) {
        console.log("error connecting",error.message);
    }
}

export default  connectDB;
