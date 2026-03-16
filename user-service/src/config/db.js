const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000
    });
    console.log(`[User Service] MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`[User Service] MongoDB connection error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
