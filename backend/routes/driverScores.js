const express = require('express');
const router = express.Router();
const { getDoc, getCollection, setDoc } = require('../utils/db');

router.get('/', async (req, res) => {
  try {
    const scoresObj = await getCollection('driverScores');
    const scores = Object.keys(scoresObj).map(id => ({ id, ...scoresObj[id] }));
    res.json(scores);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/vehicle/:vehicleId', async (req, res) => {
  try {
    const vehicleId = req.params.vehicleId;
    const score = await getDoc('driverScores', vehicleId);
    
    if (!score) {
      return res.json({
        vehicleId,
        currentScore: 1000,
        previousScore: 1000,
        averageScore: 1000,
        totalTrips: 0,
        lastCalculated: 0
      });
    }
    
    res.json({ id: vehicleId, ...score });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/user/:uid', async (req, res) => {
  try {
    const uid = req.params.uid;
    const scoresObj = await getCollection('driverScores');
    const userScores = Object.keys(scoresObj)
      .map(id => ({ id, ...scoresObj[id] }))
      .filter(score => score.uid === uid);
    
    if (userScores.length === 0) {
      return res.json({
        uid,
        currentScore: 1000,
        previousScore: 1000,
        averageScore: 1000,
        totalTrips: 0,
        lastCalculated: 0
      });
    }
    
    res.json(userScores[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/vehicle/:vehicleId/reset', async (req, res) => {
  try {
    const vehicleId = req.params.vehicleId;
    const existing = await getDoc('driverScores', vehicleId);

    const resetData = {
      vehicleId,
      deviceId: existing?.deviceId || '',
      uid: existing?.uid || '',
      currentScore: 1000,
      previousScore: existing?.currentScore ?? 1000,
      averageScore: 1000,
      totalTrips: 0,
      lastCalculated: Date.now()
    };

    await setDoc('driverScores', vehicleId, resetData);
    res.json({ id: vehicleId, ...resetData });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/vehicle/:vehicleId', async (req, res) => {
  try {
    const vehicleId = req.params.vehicleId;
    const { currentScore } = req.body;

    if (currentScore === undefined || currentScore < 0 || currentScore > 1000) {
      return res.status(400).json({ error: 'currentScore must be between 0 and 1000' });
    }

    const existing = await getDoc('driverScores', vehicleId);
    const updateData = {
      vehicleId,
      deviceId: existing?.deviceId || '',
      uid: existing?.uid || '',
      currentScore: Math.round(currentScore),
      previousScore: existing?.currentScore ?? 1000,
      averageScore: existing?.averageScore ?? 1000,
      totalTrips: existing?.totalTrips || 0,
      lastCalculated: Date.now()
    };

    await setDoc('driverScores', vehicleId, updateData);
    res.json({ id: vehicleId, ...updateData });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
