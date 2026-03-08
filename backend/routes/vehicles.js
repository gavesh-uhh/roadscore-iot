const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const { generateId, getDoc, getCollection, setDoc, deleteDoc } = require('../utils/db');

async function requireAdmin(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    const token = authHeader.split(' ')[1];
    const decoded = await admin.auth().verifyIdToken(token);
    const userProfile = await getDoc('users', decoded.uid);
    
    if (!userProfile || userProfile.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    req.user = { uid: decoded.uid, ...userProfile };
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
}

router.get('/', async (req, res) => {
  try {
    const vehiclesObj = await getCollection('vehicles');
    const vehicles = Object.keys(vehiclesObj).map(id => ({ id, ...vehiclesObj[id] }));
    res.json(vehicles);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:vehicleId', async (req, res) => {
  try {
    const vehicleId = req.params.vehicleId;
    const vehicle = await getDoc('vehicles', vehicleId);
    
    if (!vehicle) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }
    
    res.json(vehicle);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:vehicleId/live', async (req, res) => {
  try {
    const vehicleId = req.params.vehicleId;
    const vehicle = await getDoc('vehicles', vehicleId);
    
    if (!vehicle) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }
    
    const liveData = await getDoc('liveData', vehicle.deviceId);
    
    if (!liveData) {
      return res.status(404).json({ error: 'No live data available' });
    }
    
    res.json(liveData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', requireAdmin, async (req, res) => {
  try {
    const plateNumber = req.body.plateNumber;
    const model = req.body.model;
    const deviceId = req.body.deviceId;
    const ownerUid = req.body.ownerUid || null;

    if (!plateNumber || !model || !deviceId) {
      return res.status(400).json({ error: 'plateNumber, model, and deviceId are required' });
    }
    
    const vehicleId = generateId('VEH');
    const vehicleData = {
      plateNumber: plateNumber,
      model: model,
      deviceId: deviceId,
      ownerUid: ownerUid,
      createdAt: Date.now()
    };
    
    const result = await setDoc('vehicles', vehicleId, vehicleData);
    res.status(201).json(result);
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:vehicleId', requireAdmin, async (req, res) => {
  try {
    const vehicleId = req.params.vehicleId;
    const existing = await getDoc('vehicles', vehicleId);
    
    if (!existing) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }
    
    const updatedData = { ...existing, ...req.body };
    const result = await setDoc('vehicles', vehicleId, updatedData);
    res.json(result);
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:vehicleId', requireAdmin, async (req, res) => {
  try {
    const vehicleId = req.params.vehicleId;
    const existing = await getDoc('vehicles', vehicleId);
    
    if (!existing) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }
    
    await deleteDoc('vehicles', vehicleId);
    res.json({ message: 'Vehicle deleted successfully' });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
