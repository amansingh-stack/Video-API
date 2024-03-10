import mongoose from "mongoose";
import { DB_NAME } from "../constant.js";

async function connectDB() {
  try {
    let connection = await mongoose.connect(
      `${process.env.MONGODB_URI}/${DB_NAME}`
    );
    console.log(`MongoDB Host !! ${connection.connections[0].host}`);
  } catch (error) {
    console.log("Error in db file", error);
    process.exit(1);
  }
}

export default connectDB;
