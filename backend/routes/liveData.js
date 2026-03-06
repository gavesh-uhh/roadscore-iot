// =============================================
// LIVE DATA ROUTES
// Handles real-time sensor data from ESP32 devices
// =============================================

const express = require('express');
const router = express.Router();
const { getDoc, getCollection, setDoc, deleteDoc } = require('../utils/db');


// ----- GET ALL LIVE DATA -----
router.get('/', async (req, res) => {
  try {
    const liveData = await getCollection('liveData');
    res.json(liveData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// ----- GET LIVE DATA FOR ONE DEVICE -----
router.get('/:deviceId', async (req, res) => {
  try {
    const deviceId = req.params.deviceId;
    const data = await getDoc('liveData', deviceId);
    
    if (!data) {
      return res.status(404).json({ error: 'Device not found' });
    }
    
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// ----- UPDATE LIVE DATA FROM ESP32 -----
// This is called by the ESP32 to send sensor readings
router.post('/:deviceId', async (req, res) => {
  try {
    const deviceId = req.params.deviceId;
    
    // Get sensor values from request (with defaults)
    const speed = req.body.speed || 0;
    const acceleration = req.body.acceleration || { x: 0, y: 0, z: 0 };
    const gyroscope = req.body.gyroscope || { pitch: 0, roll: 0, yaw: 0 };
    const gps = req.body.gps || { lat: 0, lng: 0 };
    const vibration = req.body.vibration || false;
    const soundDetected = req.body.soundDetected || false;
    const vehicleId = req.body.vehicleId || null;
    
    // Create live data object
    const liveData = {
      vehicleId: vehicleId,
      speed: speed,
      acceleration: acceleration,
      gyroscope: gyroscope,
      gps: gps,
      vibration: vibration,
      soundDetected: soundDetected,
      timestamp: Date.now()
    };
    
    const result = await setDoc('liveData', deviceId, liveData);
    res.json(result);
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// ----- UPDATE SPECIFIC FIELDS -----
router.put('/:deviceId', async (req, res) => {
  try {
    const deviceId = req.params.deviceId;
    const existing = await getDoc('liveData', deviceId);
    
    if (!existing) {
      return res.status(404).json({ error: 'Device not found' });
    }
    
    // Merge existing data with new data
    const updatedData = {
      ...existing,
      ...req.body,
      timestamp: Date.now()
    };
    
    const result = await setDoc('liveData', deviceId, updatedData);
    res.json(result);
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// ----- DELETE DEVICE DATA -----
router.delete('/:deviceId', async (req, res) => {
  try {
    const deviceId = req.params.deviceId;
    const existing = await getDoc('liveData', deviceId);
    
    if (!existing) {
      return res.status(404).json({ error: 'Device not found' });
    }
    
    await deleteDoc('liveData', deviceId);
    res.json({ message: 'Device data deleted successfully' });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
