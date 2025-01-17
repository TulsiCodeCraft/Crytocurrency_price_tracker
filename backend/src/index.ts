import express, { Request, Response, NextFunction } from 'express';
import http from 'http';
import dotenv from 'dotenv';
import { setupSocketIO, updateAndBroadcast, cleanupSocketIO } from './socket/socketManager';
import connectDB from './config/database';
import cors from 'cors';
import helmet from 'helmet';
import { Server } from 'socket.io';
import mongoose from 'mongoose';

dotenv.config();

const app = express();
const server = http.createServer(app);


// Middleware
app.use(helmet()); // Security headers
app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:5173",
  methods: ['GET', 'POST']
}));
app.use(express.json());

// Basic error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok' });
});

const port = process.env.PORT || 5000;
const UPDATE_INTERVAL = Number(process.env.UPDATE_INTERVAL) || 10000; // 10 seconds
let updateInterval: NodeJS.Timeout;
let io: Server;

async function startServer(): Promise<void> {
  try {
    // Connect to MongoDB
    await connectDB();
    console.log('Connected to MongoDB');

    // Setup Socket.IO
    io = setupSocketIO(server);
    console.log('Socket.IO initialized');

    // Start price updates
    updateInterval = setInterval(() => updateAndBroadcast(io), UPDATE_INTERVAL);

    server.listen(port, () => {
      console.log(`Server is running on port ${port}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
async function shutdown(signal: string): Promise<void> {
  console.log(`${signal} received. Starting graceful shutdown...`);

  // Clear the update interval
  if (updateInterval) {
    clearInterval(updateInterval);
  }

  // Cleanup Socket.IO connections
  if (io) {
    await cleanupSocketIO(io);
  }

  // Close the HTTP server
  server.close(() => {
    console.log('HTTP server closed');
    
    // Close database connection
    try {
      if (mongoose.connection.readyState === 1) {
        mongoose.connection.close();
        console.log('MongoDB connection closed');
      }
    } catch (err) {
      console.error('Error closing MongoDB connection:', err);
    }

    console.log('Graceful shutdown completed');
    process.exit(0);
  });

  // Force close if graceful shutdown fails
  setTimeout(() => {
    console.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
}

// Handle different shutdown signals
['SIGTERM', 'SIGINT', 'SIGQUIT'].forEach(signal => {
  process.on(signal, () => shutdown(signal));
});

// Handle uncaught exceptions and rejections
process.on('uncaughtException', (error: Error) => {
  console.error('Uncaught Exception:', error);
  shutdown('Uncaught Exception');
});

process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  shutdown('Unhandled Rejection');
});

// Start the server
startServer().catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});

export default app;

