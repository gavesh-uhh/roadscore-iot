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

const GRAVITY = 1.0; 

const EVENTS = {
  CRASH: {
    type: "Crash Detected",
    alertType: "crash_detected",
    severity: "high",
    penalty: 60,
  },
  HARD_BRAKE: {
    type: "Hard Break Found",
    alertType: "hard_brake",
    severity: "medium",
    penalty: 20,
  },
  SHARP_CORNER: {
    type: "Sharp Cornering Found",
    alertType: "overspeed",
    severity: "medium",
    penalty: 10,
  },
  HARSH_ACCELERATION: {
    type: "Harsh Acceleration",
    alertType: "hard_brake",
    severity: "low",
    penalty: 8,
  },
  POTHOLE: {
    type: "Pothole/Bump Found",
    alertType: "hard_brake",
    severity: "low",
    penalty: 3,
  },
  OVERSPEED: {
    type: "Overspeed",
    alertType: "overspeed",
    severity: "medium",
    penalty: 8,
  },
  UNDERSPEED: {
    type: "Too Slow",
    alertType: "overspeed",
    severity: "low",
    penalty: 5,
  },
  SMOOTH_BRAKE: {
    type: "Smooth Brake",
    alertType: "smooth_brake",
    severity: "positive",
    bonus: 10,
  },
  SMOOTH_ACCELERATION: {
    type: "Smooth Acceleration",
    alertType: "smooth_acceleration",
    severity: "positive",
    bonus: 10,
  }
};

function checkForSmoothAcceleration(data, events) {
  const { current, previous, timeDelta } = data;
  if (!previous || !timeDelta) return 0;
  const speedIncrease = current.speed - previous.speed;
  const acceleration = current.acceleration.x;
  const timeSeconds = timeDelta / 1000;
  const smoothSpeedIncrease = speedIncrease > 5 && speedIncrease < 10;
  const smoothAcceleration = acceleration > 0.15 && acceleration < 0.35;
  const slowDuration = timeSeconds > 2.0;
  const triggered = smoothSpeedIncrease && smoothAcceleration && slowDuration && previous.speed > 10;
  if (triggered) {
    console.log(
      "[Smooth Acceleration TRIGGERED] " +
        JSON.stringify({
          speedIncrease: speedIncrease.toFixed(2) + " km/h",
          acceleration: acceleration.toFixed(3) + "g",
          timeDelta: timeSeconds.toFixed(2) + "s",
          speed: {
            previous: previous.speed.toFixed(2),
            current: current.speed.toFixed(2),
          },
        }),
    );
    events.push({
      type: EVENTS.SMOOTH_ACCELERATION.type,
      alertType: EVENTS.SMOOTH_ACCELERATION.alertType,
      value: acceleration,
      message: "Smooth acceleration detected",
      severity: EVENTS.SMOOTH_ACCELERATION.severity,
      bonus: EVENTS.SMOOTH_ACCELERATION.bonus,
    });
    return -EVENTS.SMOOTH_ACCELERATION.bonus;
  }
  return 0;
}

function checkForSmoothBrake(data, events) {
  const { current, previous, timeDelta } = data;
  if (!previous || !timeDelta) return 0;
  const speedDrop = previous.speed - current.speed;
  const deceleration = current.acceleration.x;
  const timeSeconds = timeDelta / 1000;
  const smoothSpeedDrop = speedDrop > 5 && speedDrop < 10;
  const smoothDeceleration = deceleration < -0.15 && deceleration > -0.35;
  const slowDuration = timeSeconds > 2.0;
  const triggered = smoothSpeedDrop && smoothDeceleration && slowDuration && previous.speed > 10;
  if (triggered) {
    console.log(
      "[Smooth Brake TRIGGERED] " +
        JSON.stringify({
          speedDrop: speedDrop.toFixed(2) + " km/h",
          deceleration: deceleration.toFixed(3) + "g",
          timeDelta: timeSeconds.toFixed(2) + "s",
          speed: {
            previous: previous.speed.toFixed(2),
            current: current.speed.toFixed(2),
          },
        }),
    );
    events.push({
      type: EVENTS.SMOOTH_BRAKE.type,
      alertType: EVENTS.SMOOTH_BRAKE.alertType,
      value: deceleration,
      message: "Smooth braking detected",
      severity: EVENTS.SMOOTH_BRAKE.severity,
      bonus: EVENTS.SMOOTH_BRAKE.bonus,
    });
    return -EVENTS.SMOOTH_BRAKE.bonus; 
  }
  return 0;
}

function pushEvent(events, eventDef, value, message) {
  events.push({
    type: eventDef.type,
    alertType: eventDef.alertType,
    value,
    message,
    severity: eventDef.severity,
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
  );

  const excessAcceleration = Math.abs(allAcceleration - GRAVITY);

  const previousSpeed = data.previous.speed;
  const currentSpeed = data.current.speed;
  const suddenSpeedDrop = previousSpeed - currentSpeed;

  let indicators = 0;
  if (soundBlast) indicators++;
  if (excessAcceleration > 2.5) indicators++; // was 2.0
  if (suddenSpeedDrop > 30) indicators++; // was 25

  if (indicators >= 2) { // was 3
    console.log(
      "[Crash TRIGGERED] " +
        JSON.stringify({
          indicators: indicators + "/3",
          soundBlast,
          rawAccel: {
            x: accelerationData.x.toFixed(3),
            y: accelerationData.y.toFixed(3),
            z: accelerationData.z.toFixed(3),
          },
          totalAccel: allAcceleration.toFixed(3),
          excessAccel: excessAcceleration.toFixed(3) + "g (threshold: >2.0)",
          speed: {
            previous: previousSpeed.toFixed(2),
            current: currentSpeed.toFixed(2),
            drop: suddenSpeedDrop.toFixed(2) + " (threshold: >30)",
          },
        }),
    );
    return pushEvent(
      events,
      EVENTS.CRASH,
      { soundBlast, excessAcceleration, suddenSpeedDrop },
      "Crash Detected from sensors of sound and acceleration data",
    );
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


  const significantSpeedDrop = speedDrop > 20 && timeSeconds < 1.5;
  const strongDeceleration = deceleration < -0.5;

  const triggered =
    significantSpeedDrop && strongDeceleration && previous.speed > 20;

  if (triggered) {
    console.log(
      "[Hard Brake TRIGGERED] " +
        JSON.stringify({
          speedDrop: speedDrop.toFixed(2) + " km/h",
          deceleration: deceleration.toFixed(3) + "g",
          timeDelta: timeSeconds.toFixed(2) + "s",
          speed: {
            previous: previous.speed.toFixed(2),
            current: current.speed.toFixed(2),
          },
          gyro: {
            yawChange: yawChange.toFixed(2),
            rollChange: rollChange.toFixed(2),
          },
          vibration: vibrationDetected,
        }),
    );
    return pushEvent(
      events,
      EVENTS.HARD_BRAKE,
      deceleration,
      "Hard braking detected",
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

  if (corneringThreshold > 12.0) {
    console.log(
      "[Sharp Corner TRIGGERED] " +
        JSON.stringify({
          gyro: { roll: gyroRoll.toFixed(2), yaw: gyroYaw.toFixed(2) },
          corneringThreshold: corneringThreshold.toFixed(2),
        }),
    );
    return pushEvent(
      events,
      EVENTS.SHARP_CORNER,
      corneringThreshold,
      "Sharp Cornering Detected from sensors of gyroscope data",
    );
  }

  return 0;
}

function checkForHarshAcceleration(data, events) {
  const previousSpeed = data.previous.speed;
  const currentSpeed = data.current.speed;


  const suddenSpeedIncrease = currentSpeed - previousSpeed;
  const triggered = suddenSpeedIncrease > 15 && previousSpeed > 10;

  if (triggered) {
    console.log(
      "[Harsh Accel TRIGGERED] " +
        JSON.stringify({
          speedIncrease: suddenSpeedIncrease.toFixed(2) + " km/h",
          speed: {
            previous: previousSpeed.toFixed(2),
            current: currentSpeed.toFixed(2),
          },
        }),
    );
    return pushEvent(
      events,
      EVENTS.HARSH_ACCELERATION,
      suddenSpeedIncrease,
      "Harsh Acceleration Detected from sensors of speed data",
    );
  }

  return 0;
}

function checkForPothole(data, events) {
  const vibration = data.current.vibration;
  const jumpForce = data.current.acceleration.z;
  const excessZ = Math.abs(jumpForce - GRAVITY);

  // trigger on strong vertical impact, or moderate impact with vibration confirmation
  const triggered = excessZ > 1.0 || (vibration === true && excessZ > 0.5);

  if (triggered) {
    console.log(
      "[Pothole TRIGGERED] " +
        JSON.stringify({
          rawZ: jumpForce.toFixed(3) + "g",
          excessZ: excessZ.toFixed(3) + "g",
          vibration,
        }),
    );
    return pushEvent(
      events,
      EVENTS.POTHOLE,
      { vibration, jumpForce, excessZ },
      "Pothole or Bump Found from sensors of vibration and acceleration of Z axis data",
    );
  }

  return 0;
}

function checkForOverspeed(data, events) {
  const { current, previous } = data;

  if (!current) return 0;
  const SPEED_LIMIT = 80;
  const currentSpeed = current.speed;
  const previousSpeed = previous ? previous.speed : 0;
  const isOverspeeding = currentSpeed > SPEED_LIMIT;
  const wasOverspeeding = previousSpeed > SPEED_LIMIT;

  const triggered = isOverspeeding && !wasOverspeeding;

  if (triggered) {
    console.log(
      "[Overspeed Check] " +
        JSON.stringify({
          triggered,
          speed: {
            current: currentSpeed.toFixed(2),
            previous: previousSpeed.toFixed(2),
          },
          speedLimit: SPEED_LIMIT,
        }),
    );
    return pushEvent(
      events,
      EVENTS.OVERSPEED,
      currentSpeed,
      `Vehicle exceeded speed limit of ${SPEED_LIMIT} km/h`,
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
  score -= checkForSmoothBrake(data, events); // positive event
  score -= checkForSmoothAcceleration(data, events); // positive event

  score = Math.max(0, score);
  if (events.length === 0) return null;

  return { score, events, metrics: {} };
}

module.exports = { calculateScore };
