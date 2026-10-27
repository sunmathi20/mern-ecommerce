import mongoose from 'mongoose';
import dns from 'dns';

// Set public DNS fallback for reliable SRV resolution on Windows
try {
  dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
} catch (e) {
  // Ignore in environments where setting DNS servers is not allowed
}

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/aurelia');
    console.log(`✓ MongoDB connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`✗ MongoDB connection error: ${error.message}`);
    // Don't crash — let the server start; health endpoint will report DB status
    return null;
  }
};

export default connectDB;
