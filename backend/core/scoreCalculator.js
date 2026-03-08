/**
Live data type structure
@param {Object} data
@param {string} data.deviceId          - e.g. "ESP32_001"
@param {string} data.vehicleId         - e.g. "VEH_001"
@param {Object} data.current           - { speed, acceleration{x,y,z}, gyroscope{pitch,roll,yaw}, gps{lat,lng}, vibration, soundDetected, timestamp }
@param {Object|null} data.previous          - same shape as current, or null on first tick
@param {number|null} data.timeDelta         - ms between readings, or null on first tick
@param {Object|null} data.currentScore      - { currentScore, previousScore, averageScore, totalTrips, lastCalculated } or null
@description Return null to skip, or { score (0-1000), events[], metrics{} }
@author Gavesh Saparamadu
*/

const EVENTS = {
    CRASH: { type: 'Crash Detected', alertType: 'crash_detected', severity: 'high', penalty: 100 },
    HARD_BRAKE: { type: 'Hard Break Found', alertType: 'hard_brake', severity: 'medium', penalty: 50 },
    SHARP_CORNER: { type: 'Sharp Cornering Found', alertType: 'overspeed', severity: 'medium', penalty: 30 },
    HARSH_ACCELERATION: { type: 'Harsh Acceleration', alertType: 'hard_brake', severity: 'low', penalty: 20 },
    POTHOLE: { type: 'Pothole/Bump Found', alertType: 'hard_brake', severity: 'low', penalty: 10 },
    OVERSPEED: { type: 'Overspeed', alertType: 'overspeed', severity: 'medium', penalty: 20 },
    UNDERSPEED: { type: 'Too Slow', alertType: 'overspeed', severity: 'low', penalty: 20 },
};

function pushEvent(events, eventDef, value, message) {
    events.push({
        type: eventDef.type,
        alertType: eventDef.alertType,
        value,
        message,
        severity: eventDef.severity
    });
    return eventDef.penalty;
}

function checkForCrash(data, events) {
    return 0;
}

function checkForHardBrake(data, events) {
    return 0;
}

function checkForSharpCornering(data, events) {
    return 0;
}

function checkForHarshAcceleration(data, events) {
    return 0;
}

function checkForPothole(data, events) {
    return 0;
}

function checkForOverspeed(data, events) {
    return 0;
}

function checkForUnderspeed(data, events) {
    return 0;
}

function calculateScore(data) {
    if (!data.previous) return null;

    const events = [];
    let score = data.currentScore ? data.currentScore.currentScore : 1000;

    score -= checkForCrash(data, events);
    score -= checkForHardBrake(data, events);
    score -= checkForSharpCornering(data, events);
    score -= checkForHarshAcceleration(data, events);
    score -= checkForPothole(data, events);
    score -= checkForOverspeed(data, events);
    score -= checkForUnderspeed(data, events);

    score = Math.max(0, score);
    if (events.length === 0) return null;

    return { score, events, metrics: {} };
}

module.exports = { calculateScore };
