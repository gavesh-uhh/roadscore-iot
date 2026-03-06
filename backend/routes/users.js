// =============================================
// USER ROUTES
// Handles getting, creating, updating, deleting users
// =============================================

const express = require('express');
const router = express.Router();
const { generateId, getDoc, getCollection, setDoc, deleteDoc } = require('../utils/db');


// ----- GET ALL USERS -----
// GET /api/users
router.get('/', async (req, res) => {
  try {
    const usersObj = await getCollection('users');
    // Convert object to array with id included
    const users = Object.keys(usersObj).map(id => ({ id, ...usersObj[id] }));
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// ----- GET ONE USER -----
// GET /api/users/:uid
router.get('/:uid', async (req, res) => {
  try {
    const uid = req.params.uid;
    const user = await getDoc('users', uid);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// ----- CREATE NEW USER -----
// POST /api/users
router.post('/', async (req, res) => {
  try {
    const name = req.body.name;
    const email = req.body.email;
    const role = req.body.role || 'driver';
    
    // Check required fields
    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required' });
    }
    
    // Create new user
    const uid = generateId('UID');
    const userData = {
      name: name,
      email: email,
      role: role,
      status: 'active',
      createdAt: Date.now()
    };
    
    const result = await setDoc('users', uid, userData);
    res.status(201).json(result);
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// ----- UPDATE USER -----
// PUT /api/users/:uid
router.put('/:uid', async (req, res) => {
  try {
    const uid = req.params.uid;
    
    // Check if user exists
    const existing = await getDoc('users', uid);
    if (!existing) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Update user with new data
    const updatedData = {
      ...existing,
      ...req.body
    };
    
    const result = await setDoc('users', uid, updatedData);
    res.json(result);
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// ----- DELETE USER -----
// DELETE /api/users/:uid
router.delete('/:uid', async (req, res) => {
  try {
    const uid = req.params.uid;
    
    // Check if user exists
    const existing = await getDoc('users', uid);
    if (!existing) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    await deleteDoc('users', uid);
    res.json({ message: 'User deleted successfully' });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
