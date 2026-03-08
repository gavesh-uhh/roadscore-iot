const express = require('express');
const router = express.Router();
const { generateId, getDoc, getCollection, setDoc, deleteDoc } = require('../utils/db');

router.get('/', async (req, res) => {
  try {
    const alertsObj = await getCollection('alerts');
    const alerts = Object.keys(alertsObj).map(id => ({ id, ...alertsObj[id] }));
    alerts.sort((a, b) => b.timestamp - a.timestamp);
    res.json(alerts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/user/:uid', async (req, res) => {
  try {
    const uid = req.params.uid;
    const alertsObj = await getCollection('alerts');
    const alerts = Object.keys(alertsObj)
      .map(id => ({ id, ...alertsObj[id] }))
      .filter(alert => alert.uid === uid)
      .sort((a, b) => b.timestamp - a.timestamp);
    res.json(alerts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:alertId', async (req, res) => {
  try {
    const alertId = req.params.alertId;
    const alert = await getDoc('alerts', alertId);
    
    if (!alert) {
      return res.status(404).json({ error: 'Alert not found' });
    }
    
    res.json({ id: alertId, ...alert });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const uid = req.body.uid;
    const vehicleId = req.body.vehicleId;
    const type = req.body.type;
    const severity = req.body.severity || 'medium';
    const message = req.body.message;

    if (!type || !message) {
      return res.status(400).json({ error: 'type and message are required' });
    }

    const validTypes = ['crash_detected', 'overspeed', 'hard_brake', 'geofence_exit', 'low_battery', 'device_offline'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ 
        error: 'Invalid alert type. Must be: ' + validTypes.join(', ')
      });
    }
    
    const alertId = generateId('ALERT');
    const alertData = {
      uid: uid || null,
      vehicleId: vehicleId || null,
      type: type,
      severity: severity,
      message: message,
      timestamp: Date.now(),
      acknowledged: false
    };
    
    const result = await setDoc('alerts', alertId, alertData);
    res.status(201).json({ id: alertId, ...alertData });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:alertId/acknowledge', async (req, res) => {
  try {
    const alertId = req.params.alertId;
    const existing = await getDoc('alerts', alertId);
    
    if (!existing) {
      return res.status(404).json({ error: 'Alert not found' });
    }
    
    const updatedAlert = {
      ...existing,
      acknowledged: true,
      acknowledgedAt: Date.now()
    };
    
    await setDoc('alerts', alertId, updatedAlert);
    res.json({ id: alertId, ...updatedAlert });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:alertId', async (req, res) => {
  try {
    const alertId = req.params.alertId;
    const existing = await getDoc('alerts', alertId);
    
    if (!existing) {
      return res.status(404).json({ error: 'Alert not found' });
    }
    
    await deleteDoc('alerts', alertId);
    res.json({ message: 'Alert deleted successfully' });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


module.exports = router;
