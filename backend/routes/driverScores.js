const express = require('express');
const router = express.Router();
const { getDoc, getCollection } = require('../utils/db');

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

router.put('/reset/:vehicleId', async (req, res) => {
  try {
    const vehicleId = req.params.vehicleId;
    const { setDoc } = require('../utils/db');
    
    const resetData = {
      currentScore: 1000,
      previousScore: 1000,
      averageScore: 1000,
      totalTrips: 0,
      lastCalculated: Date.now()
    };
    
    await setDoc('driverScores', vehicleId, resetData);
    
    res.json({
      success: true,
      message: 'Driver score reset successfully',
      data: { id: vehicleId, ...resetData }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
