import mongoose from "mongoose";

const connectDb = async () => {
  try {
    const connection = await mongoose.connect(`${process.env.MONGODB_URI}`);
    console.log("Mongodb connection successful", connection.connection.host);
  } catch (error) {
    console.log("Mongodb connection failed", error);
    process.exit(1);
  }
};

export default connectDb;
