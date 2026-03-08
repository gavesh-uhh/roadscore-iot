const { generateId, getDoc, getCollection, setDoc } = require('../utils/db');
const { calculateScore } = require('./scoreCalculator');

const POLL_INTERVAL = 1000;
const OFFLINE_THRESHOLD = 30000;
const previousReadings = {};
const deviceStatus = {};
let intervalId = null;

async function tick() {
    try {
        const [liveDataAll, vehiclesAll] = await Promise.all([
            getCollection('liveData'),
            getCollection('vehicles')
        ]);

        const deviceToVehicle = {};
        for (const vehicleId of Object.keys(vehiclesAll)) {
            const vehicle = vehiclesAll[vehicleId];
            if (vehicle.deviceId) {
                deviceToVehicle[vehicle.deviceId] = {
                    vehicleId,
                    ownerUid: vehicle.ownerUid || null
                };
            }
        }

        for (const deviceId of Object.keys(deviceToVehicle)) {
            const liveData = liveDataAll[deviceId];
            const lastTimestamp = liveData?.timestamp || 0;
            const age = Date.now() - lastTimestamp;
            const wasOnline = deviceStatus[deviceId] !== false;

            if (age > OFFLINE_THRESHOLD) {
                if (wasOnline) {
                    console.log('[Worker] ' + deviceId + ' is OFFLINE (no data for ' + Math.round(age / 1000) + 's)');
                    deviceStatus[deviceId] = false;
                }
                continue;
            }

            if (!wasOnline) {
                console.log('[Worker] ' + deviceId + ' is back ONLINE');
            }
            deviceStatus[deviceId] = true;
        }

        for (const deviceId of Object.keys(liveDataAll)) {
          try {
            const current = liveDataAll[deviceId];
            if (!current || !current.timestamp) continue;

            const prev = previousReadings[deviceId] || null;
            if (prev && prev.timestamp === current.timestamp) continue;

            const vehicleInfo = deviceToVehicle[deviceId];
            if (!vehicleInfo) {
                previousReadings[deviceId] = current;
                continue;
            }

            const { vehicleId, ownerUid } = vehicleInfo;
            const timeDelta = prev ? (current.timestamp - prev.timestamp) : null;
            const existingScore = await getDoc('driverScores', vehicleId);

            const data = {
                deviceId,
                vehicleId,
                current: {
                    speed: current.speed || 0,
                    acceleration: current.acceleration || { x: 0, y: 0, z: 0 },
                    gyroscope: current.gyroscope || { pitch: 0, roll: 0, yaw: 0 },
                    gps: current.gps || { lat: 0, lng: 0 },
                    vibration: Boolean(current.vibration),
                    soundDetected: Boolean(current.soundDetected),
                    timestamp: current.timestamp
                },
                previous: prev ? {
                    speed: prev.speed || 0,
                    acceleration: prev.acceleration || { x: 0, y: 0, z: 0 },
                    gyroscope: prev.gyroscope || { pitch: 0, roll: 0, yaw: 0 },
                    gps: prev.gps || { lat: 0, lng: 0 },
                    vibration: Boolean(prev.vibration),
                    soundDetected: Boolean(prev.soundDetected),
                    timestamp: prev.timestamp
                } : null,
                timeDelta,
                currentScore: existingScore ? {
                    currentScore: existingScore.currentScore || 1000,
                    previousScore: existingScore.previousScore || 1000,
                    averageScore: existingScore.averageScore || 1000,
                    totalTrips: existingScore.totalTrips || 0,
                    lastCalculated: existingScore.lastCalculated || 0
                } : null
            };

            const result = calculateScore(data);
            previousReadings[deviceId] = current;
            if (result === null) continue;

            console.log('[Worker] Score update for ' + vehicleId + ': ' + result.score);

            const oldScore = data.currentScore ? data.currentScore.currentScore : 1000;
            await setDoc('driverScores', vehicleId, {
                vehicleId,
                deviceId,
                uid: ownerUid,
                currentScore: result.score,
                previousScore: oldScore,
                lastCalculated: Date.now(),
                totalTrips: data.currentScore ? data.currentScore.totalTrips : 0,
                averageScore: data.currentScore
                    ? Math.round(((data.currentScore.averageScore * data.currentScore.totalTrips) + result.score) / (data.currentScore.totalTrips + 1))
                    : result.score
            });

            if (result.events.length > 0 || result.metrics) {
                const existingBehavior = await getDoc('drivingBehavior', vehicleId);
                const oldMetrics = existingBehavior?.metrics || {};
                const newMetrics = { ...oldMetrics, ...(result.metrics || {}) };
                const oldEvents = existingBehavior?.recentEvents || [];
                const newEvents = result.events.map(event => ({
                    type: event.type,
                    value: event.value,
                    timestamp: current.timestamp,
                    location: current.gps || { lat: 0, lng: 0 },
                    rawData: {
                        speed: current.speed || 0,
                        acceleration: current.acceleration || { x: 0, y: 0, z: 0 },
                        gyroscope: current.gyroscope || { pitch: 0, roll: 0, yaw: 0 },
                        vibration: Boolean(current.vibration),
                        soundDetected: Boolean(current.soundDetected)
                    }
                }));

                const allEvents = [...oldEvents, ...newEvents].slice(-50);

                await setDoc('drivingBehavior', vehicleId, {
                    vehicleId,
                    deviceId,
                    uid: ownerUid,
                    metrics: newMetrics,
                    recentEvents: allEvents,
                    lastUpdated: Date.now()
                });
            }

            for (const event of result.events) {
                const alertId = generateId('ALERT');
                await setDoc('alerts', alertId, {
                    uid: ownerUid,
                    vehicleId,
                    deviceId,
                    type: event.alertType,
                    severity: event.severity,
                    message: event.message,
                    timestamp: current.timestamp,
                    acknowledged: false
                });
            }

            const historyKey = deviceId + '_' + current.timestamp;
            await setDoc('liveDataHistory', historyKey, {
                vehicleId,
                deviceId,
                speed: current.speed || 0,
                acceleration: current.acceleration || { x: 0, y: 0, z: 0 },
                gyroscope: current.gyroscope || { pitch: 0, roll: 0, yaw: 0 },
                gps: current.gps || { lat: 0, lng: 0 },
                vibration: Boolean(current.vibration),
                soundDetected: Boolean(current.soundDetected),
                calculatedScore: result.score,
                timestamp: current.timestamp
            });

            const today = new Date();
            const dateStr = today.toISOString().split('T')[0];
            const scoreHistoryKey = vehicleId + '_' + current.timestamp;
            await setDoc('scoreHistory', scoreHistoryKey, {
                vehicleId,
                uid: ownerUid,
                score: result.score,
                date: dateStr,
                timestamp: current.timestamp,
                tripData: {
                    distance: 0,
                    duration: timeDelta ? timeDelta / 1000 : 0,
                    avgSpeed: current.speed || 0
                }
            });
          } catch (deviceError) {
            console.error('[Worker] Error processing ' + deviceId + ':', deviceError.message);
          }
        }
    } catch (error) {
        console.error('[Worker] Error:', error.message);
    }
}

function startWorker() {
    if (intervalId) return;
    console.log('[Worker] Score worker started (polling every ' + POLL_INTERVAL / 1000 + 's)');
    tick();
    intervalId = setInterval(tick, POLL_INTERVAL);
}

function stopWorker() {
    if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
        console.log('[Worker] Score worker stopped');
    }
}

module.exports = { startWorker, stopWorker };
