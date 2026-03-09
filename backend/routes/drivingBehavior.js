const express = require('express');
const router = express.Router();
const { getDoc, getCollection } = require('../utils/db');

// Get all driving behavior data
router.get('/', async (req, res) => {
  try {
    const behaviorObj = await getCollection('drivingBehavior');
    const behaviors = Object.keys(behaviorObj).map(id => ({ id, ...behaviorObj[id] }));
    res.json(behaviors);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get driving behavior by vehicle ID
router.get('/vehicle/:vehicleId', async (req, res) => {
  try {
    const vehicleId = req.params.vehicleId;
    const behavior = await getDoc('drivingBehavior', vehicleId);
    
    if (!behavior) {
      return res.json({
        vehicleId,
        metrics: {},
        recentEvents: [],
        lastUpdated: 0
      });
    }
    
    res.json({ id: vehicleId, ...behavior });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get crash events for a vehicle
router.get('/vehicle/:vehicleId/crashes', async (req, res) => {
  try {
    const vehicleId = req.params.vehicleId;
    const behavior = await getDoc('drivingBehavior', vehicleId);
    
    if (!behavior || !behavior.recentEvents) {
      return res.json([]);
    }
    
    // Filter for crash events
    const crashes = behavior.recentEvents.filter(event => 
      event.type === 'Crash Detected' || event.type === 'crash_detected'
    );
    
    res.json(crashes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
