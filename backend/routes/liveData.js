const express = require('express');
const router = express.Router();
const { getDoc, getCollection, setDoc, deleteDoc } = require('../utils/db');

router.get('/', async (req, res) => {
  try {
    const liveData = await getCollection('liveData');
    res.json(liveData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

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

router.post('/:deviceId', async (req, res) => {
  try {
    const deviceId = req.params.deviceId;
    const speed = req.body.speed || 0;
    const acceleration = req.body.acceleration || { x: 0, y: 0, z: 0 };
    const gyroscope = req.body.gyroscope || { pitch: 0, roll: 0, yaw: 0 };
    const gps = req.body.gps || { lat: 0, lng: 0 };
    const vibration = req.body.vibration || false;
    const soundDetected = req.body.soundDetected || false;
    const vehicleId = req.body.vehicleId || null;

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

router.put('/:deviceId', async (req, res) => {
  try {
    const deviceId = req.params.deviceId;
    const existing = await getDoc('liveData', deviceId);

    if (!existing) {
      return res.status(404).json({ error: 'Device not found' });
    }

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
