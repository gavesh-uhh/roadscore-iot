// =============================================
// IoT BACKEND SERVER
// Main entry point for the application
// =============================================

// Load environment variables from .env file
require('dotenv').config();

const express = require('express');
const cors = require('cors');

// Import route files
const authRoutes = require('./routes/auth');
const usersRoutes = require('./routes/users');
const vehiclesRoutes = require('./routes/vehicles');
const liveDataRoutes = require('./routes/liveData');
const alertsRoutes = require('./routes/alerts');

// Create Express app
const app = express();
const PORT = process.env.PORT || 3000;

// ----- MIDDLEWARE -----
// Allow requests from frontend (CORS)
app.use(cors());
// Parse JSON request bodies
app.use(express.json());

// ----- API ROUTES -----
app.use('/auth', authRoutes);        // Login & Signup
app.use('/users', usersRoutes);      // User management
app.use('/vehicles', vehiclesRoutes); // Vehicle management
app.use('/live-data', liveDataRoutes); // ESP32 sensor data
app.use('/alerts', alertsRoutes);    // System alerts

// ----- HEALTH CHECK -----
// Simple endpoint to check if server is running
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running!' });
});

// ----- ERROR HANDLING -----
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(500).json({ error: 'Something went wrong!' });
});

// ----- START SERVER -----
app.listen(PORT, () => {
  console.log('');
  console.log('========================================');
  console.log('  IoT Backend Server Started!');
  console.log('  URL: http://localhost:' + PORT);
  console.log('========================================');
  console.log('');
});
