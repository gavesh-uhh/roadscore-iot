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
  const soundBlast = data.current.soundDetected;
  const accelerationData = data.current.acceleration;
  const allAcceleration = Math.sqrt(
    Math.pow(accelerationData.x, 2) +
      Math.pow(accelerationData.y, 2) +
      Math.pow(accelerationData.z, 2),
  ); //  pythagorean theorem  used here to calc the accel from all axis

  const previousSpeed = data.previous.speed;
  const currentSpeed = data.current.speed;
  const suddenSpeedDrop = previousSpeed - currentSpeed;

  if (soundBlast || allAcceleration > 5 || suddenSpeedDrop > 40) {
    return pushEvent(
      events,
      EVENTS.CRASH,
      { soundBlast, allAcceleration, suddenSpeedDrop },"Crash Detected from sensors of sound and acceleration data",);
  }

  return 0;
}

function checkForHardBrake(data, events) {

    const { current, previous, timeDelta } = data;

    if (!previous || !timeDelta) return 0;

    const speedDrop = previous.speed - current.speed;

    const deceleration = current.acceleration.x;

    const yawChange = Math.abs(current.gyroscope.yaw - previous.gyroscope.yaw);

    const rollChange = Math.abs(current.gyroscope.roll - previous.gyroscope.roll);

    const vibrationDetected = current.vibration === true;

    const timeSeconds = timeDelta / 1000;

    const rapidStop = speedDrop > 5 && timeSeconds < 1;
    const strongDeceleration = deceleration < -0.4;
    const highYawRotation = yawChange > 0.3;
    const tiltDetected = rollChange > 0.2;

    if (
        rapidStop &&
        strongDeceleration &&
        highYawRotation &&
        tiltDetected &&
        vibrationDetected &&
        previous.speed > 10
    ) {

        return pushEvent(
            events,
            EVENTS.HAND_BRAKE,
            deceleration,
            "Possible handbrake maneuver detected"
        );
    }

    return 0;

}

function checkForSharpCornering(data, events) {
  const gyroRoll = data.current.gyroscope.roll;
  const roll = Math.abs(gyroRoll);
  const gyroYaw = data.current.gyroscope.yaw;
  const yaw = Math.abs(gyroYaw);

  const corneringThreshold = Math.max(roll, yaw);

  if (corneringThreshold > 0.7) {
    return pushEvent(
      events,
      EVENTS.SHARP_CORNER,
      corneringThreshold,"Sharp Cornering Detected from sensors of gyroscope data",);
  }

  return 0;
}

function checkForHarshAcceleration(data, events) {
  const previousSpeed = data.previous.speed;
  const currentSpeed = data.current.speed;

  const suddenSpeedIncrease = currentSpeed - previousSpeed;

  if (suddenSpeedIncrease > 20) {
    return pushEvent(
      events,
      EVENTS.HARSH_ACCELERATION,
      suddenSpeedIncrease, "Harsh Acceleration Detected from sensors of speed data",);
  }

  return 0;
}


function checkForPothole(data, events) {
  const vibration = data.current.vibration;
  const jumpForce = data.current.acceleration.z;

  if (vibration === true || jumpForce > 1) {
    return pushEvent(
      events,
      EVENTS.POTHOLE,
      { vibration, jumpForce },"Pothole or Bump Found from sensors of vibration and acceleration of Z axis data",);
  }

  return 0;
}


function checkForOverspeed(data, events) {

    const { current, previous } = data;

    if (!current) return 0;

    const SPEED_LIMIT = 60;

    const currentSpeed = current.speed;
    const previousSpeed = previous ? previous.speed : 0;

    const isOverspeeding = currentSpeed > SPEED_LIMIT;
    const wasOverspeeding = previousSpeed > SPEED_LIMIT;

    if (isOverspeeding && !wasOverspeeding) {

        return pushEvent(
            events,
            EVENTS.OVERSPEED,
            currentSpeed,
            `Vehicle exceeded speed limit of ${SPEED_LIMIT} km/h`
        );

    }

    return 0;
}

function checkForUnderspeed(data, events) {

    const { current, previous } = data;

    if (!current) return 0;

    const MIN_SPEED = 10;

    const currentSpeed = current.speed;
    const previousSpeed = previous ? previous.speed : 0;

    const isUnderspeeding = currentSpeed < MIN_SPEED;
    const wasUnderspeeding = previousSpeed < MIN_SPEED;

    if (isUnderspeeding && !wasUnderspeeding) {

        return pushEvent(
            events,
            EVENTS.UNDERSPEED,
            currentSpeed,
            `Vehicle speed dropped below minimum threshold of ${MIN_SPEED} km/h`
        );

    }

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
