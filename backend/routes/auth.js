const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const { getDoc, setDoc } = require('../utils/db');

const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY || 'AIzaSyBPUZ0bFw1jK6mcjvoOxr4CJ0A6i7snvpQ';

router.post('/login', async (req, res) => {
  try {
    const email = req.body.email;
    const password = req.body.password;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

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

    if (!response.ok) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    let userProfile = await getDoc('users', data.localId);

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

router.post('/signup', async (req, res) => {
  try {
    const name = req.body.name;
    const email = req.body.email;
    const password = req.body.password;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email and password are required' });
    }

    const userRecord = await admin.auth().createUser({
      email: email,
      password: password,
      displayName: name
    });

    const userData = {
      name: name,
      email: email,
      role: 'driver',
      status: 'active',
      createdAt: Date.now()
    };

    await setDoc('users', userRecord.uid, userData);

    res.status(201).json({
      message: 'Account created successfully',
      user: {
        uid: userRecord.uid,
        name: name,
        email: email,
        role: 'driver'
      }
    });

  } catch (error) {
    if (error.code === 'auth/email-already-exists') {
      return res.status(409).json({ error: 'Email already registered' });
    }
    if (error.code === 'auth/weak-password') {
      return res.status(400).json({ error: 'Password should be at least 6 characters' });
    }
    res.status(500).json({ error: error.message });
  }
});

router.get('/me', async (req, res) => {
  try {
    const uid = req.headers['x-user-id'];

    if (!uid) {
      return res.status(401).json({ error: 'Not logged in' });
    }

    const user = await getDoc('users', uid);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

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
