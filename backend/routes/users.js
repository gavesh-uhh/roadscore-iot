const express = require('express');
const router = express.Router();
const { generateId, getDoc, getCollection, setDoc, deleteDoc } = require('../utils/db');

router.get('/', async (req, res) => {
  try {
    const usersObj = await getCollection('users');
    const users = Object.keys(usersObj).map(id => ({ id, ...usersObj[id] }));
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

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

router.post('/', async (req, res) => {
  try {
    const name = req.body.name;
    const email = req.body.email;
    const role = req.body.role || 'driver';

    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required' });
    }

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

router.put('/:uid', async (req, res) => {
  try {
    const uid = req.params.uid;
    const existing = await getDoc('users', uid);

    if (!existing) {
      return res.status(404).json({ error: 'User not found' });
    }

    const updatedData = { ...existing, ...req.body };
    const result = await setDoc('users', uid, updatedData);
    res.json(result);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:uid', async (req, res) => {
  try {
    const uid = req.params.uid;
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
