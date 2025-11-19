const mongoose = require("mongoose")

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URL);
        console.log("connection successfully!")
    } catch (error) {
        console.log(error)
        console.log("connection faild!")

    }
}
module.exports = connectDB;
