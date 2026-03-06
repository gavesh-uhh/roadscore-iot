// =============================================
// AUTHENTICATION ROUTES
// Handles user login and signup
// =============================================

const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const { getDoc, setDoc } = require('../utils/db');

// Firebase API Key from environment variable
const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY || 'AIzaSyBPUZ0bFw1jK6mcjvoOxr4CJ0A6i7snvpQ';


// ----- LOGIN -----
// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    // Get email and password from request
    const email = req.body.email;
    const password = req.body.password;
    
    // Check if both are provided
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    
    // Send login request to Firebase
    const response = await fetch(
      'https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=' + FIREBASE_API_KEY,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email,
          password: password,
          returnSecureToken: true
        })
      }
    );
    
    const data = await response.json();
    
    // Check if login failed
    if (!response.ok) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    
    // Get user profile from database
    let userProfile = await getDoc('users', data.localId);
    
    // If user doesn't exist in database (manually created in Firebase Auth), create profile
    if (!userProfile) {
      userProfile = {
        name: data.displayName || email.split('@')[0],
        email: email,
        role: 'driver',
        status: 'active',
        createdAt: Date.now()
      };
      await setDoc('users', data.localId, userProfile);
    }
    
    // Send success response
    res.json({ 
      message: 'Login successful',
      user: { 
        uid: data.localId,
        email: data.email,
        name: userProfile.name,
        role: userProfile.role
      },
      token: data.idToken
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// ----- SIGNUP -----
// POST /api/auth/signup
router.post('/signup', async (req, res) => {
  try {
    // Get user details from request
    const name = req.body.name;
    const email = req.body.email;
    const password = req.body.password;
    
    // Check if all fields are provided
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email and password are required' });
    }
    
    // Create user in Firebase Authentication
    const userRecord = await admin.auth().createUser({
      email: email,
      password: password,
      displayName: name
    });
    
    // Save user profile to database
    const userData = {
      name: name,
      email: email,
      role: 'driver',
      status: 'active',
      createdAt: Date.now()
    };
    
    await setDoc('users', userRecord.uid, userData);
    
    // Send success response
    res.status(201).json({ 
      message: 'Account created successfully',
      user: { 
        uid: userRecord.uid,
        name: name,
        email: email,
        role: 'user'
      }
    });
    
  } catch (error) {
    // Handle specific errors
    if (error.code === 'auth/email-already-exists') {
      return res.status(409).json({ error: 'Email already registered' });
    }
    if (error.code === 'auth/weak-password') {
      return res.status(400).json({ error: 'Password should be at least 6 characters' });
    }
    res.status(500).json({ error: error.message });
  }
});


// ----- GET CURRENT USER -----
// GET /api/auth/me
router.get('/me', async (req, res) => {
  try {
    // Get user ID from request header
    const uid = req.headers['x-user-id'];
    
    if (!uid) {
      return res.status(401).json({ error: 'Not logged in' });
    }
    
    // Get user from database
    const user = await getDoc('users', uid);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Send user data (without password)
    res.json({
      uid: uid,
      name: user.name,
      email: user.email,
      role: user.role
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
