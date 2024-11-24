import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

const connectDB = async ()=>{
    try{
       const connection=await mongoose.connect(`${process.env.MONGODB_uri}/${DB_NAME}`);
       console.log(`MongoDb connected ${connection.connection.host}`)
    }catch(error){
        console.error("MONGODB not connected", error);
        process.exit(1);
    }
}

export default connectDB