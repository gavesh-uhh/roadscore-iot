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

const GRAVITY = 9.81;

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
  );

  const excessAcceleration = Math.abs(allAcceleration - GRAVITY); // subtract gravity baseline

  const previousSpeed = data.previous.speed;
  const currentSpeed = data.current.speed;
  const suddenSpeedDrop = previousSpeed - currentSpeed;

  let indicators = 0;
  if (soundBlast) indicators++;
  if (excessAcceleration > 4) indicators++;
  if (suddenSpeedDrop > 30) indicators++;

  if (indicators >= 2) {
    console.log("[Crash] Sound Blast: " + soundBlast + ", Excess Acceleration: " + excessAcceleration.toFixed(2) + "g (raw: " + allAcceleration.toFixed(2) + "), Sudden Speed Drop: " + suddenSpeedDrop.toFixed(2) + " km/h, Previous Speed: " + previousSpeed + " km/h, Current Speed: " + currentSpeed + " km/h, Indicators: " + indicators + "/3");
    // return pushEvent(
    //   events,
    //   EVENTS.CRASH,
    //   { soundBlast, excessAcceleration, suddenSpeedDrop },"Crash Detected from sensors of sound and acceleration data",);
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

    const significantSpeedDrop = speedDrop > 15 && timeSeconds < 2;
    const strongDeceleration = deceleration < -2.0;

    if (
        significantSpeedDrop &&
        strongDeceleration &&
        previous.speed > 10
    ) {

        console.log("[Hard Brake] Speed Drop: " + speedDrop.toFixed(2) + " km/h, Deceleration: " + deceleration.toFixed(2) + "g, Yaw Change: " + yawChange.toFixed(2) + ", Roll Change: " + rollChange.toFixed(2) + ", Vibration: " + vibrationDetected + ", Time: " + timeSeconds.toFixed(2) + "s, Previous Speed: " + previous.speed + " km/h");
        // return pushEvent(
        //     events,
        //     EVENTS.HARD_BRAKE,
        //     deceleration,
        //     "Hard braking detected"
        // );
    }

    return 0;

}

function checkForSharpCornering(data, events) {
  const gyroRoll = data.current.gyroscope.roll;
  const roll = Math.abs(gyroRoll);
  const gyroYaw = data.current.gyroscope.yaw;
  const yaw = Math.abs(gyroYaw);

  const corneringThreshold = Math.max(roll, yaw);

  if (corneringThreshold > 5.0) {
    // return pushEvent(
    //   events,
    //   EVENTS.SHARP_CORNER,
    //   corneringThreshold,"Sharp Cornering Detected from sensors of gyroscope data",);
    console.log("[Sharp Corner] Gyro Roll: " + roll.toFixed(2) + " deg/s, Gyro Yaw: " + yaw.toFixed(2) + " deg/s, Threshold: " + corneringThreshold.toFixed(2));
  }

  return 0;
}

function checkForHarshAcceleration(data, events) {
  const previousSpeed = data.previous.speed;
  const currentSpeed = data.current.speed;

  const suddenSpeedIncrease = currentSpeed - previousSpeed;

  if (suddenSpeedIncrease > 20 && previousSpeed > 5) {
    console.log("[Harsh Acceleration] Detected: " + suddenSpeedIncrease.toFixed(2) + " km/h increase, Previous Speed: " + previousSpeed + " km/h, Current Speed: " + currentSpeed + " km/h");
    // return pushEvent(
    //   events,
    //   EVENTS.HARSH_ACCELERATION,
    //   suddenSpeedIncrease, "Harsh Acceleration Detected from sensors of speed data",);
    return 0;
}

  return 0;
}


function checkForPothole(data, events) {
  const vibration = data.current.vibration;
  const jumpForce = data.current.acceleration.z;
  const excessZ = Math.abs(jumpForce - GRAVITY); 

  // trigger on strong vertical impact, or moderate impact with vibration confirmation
  if (excessZ > 3 || (vibration === true && excessZ > 1.5)) {
    console.log("[Pothole] Excess Z: " + excessZ.toFixed(2) + "g (raw Z: " + jumpForce.toFixed(3) + "), Vibration: " + vibration);
    
    return 0;
    // return pushEvent(
    //   events,
    //   EVENTS.POTHOLE,
    //   { vibration, jumpForce, excessZ },"Pothole or Bump Found from sensors of vibration and acceleration of Z axis data",);
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

        console.log("[Overspeed] Detected: " + currentSpeed + " km/h");
        // return pushEvent(
        //     events,
        //     EVENTS.OVERSPEED,
        //     currentSpeed,
        //     `Vehicle exceeded speed limit of ${SPEED_LIMIT} km/h`
        // );

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

        console.log("[Underspeed] Detected: " + currentSpeed + " km/h");
        
        return 0;
        // return pushEvent(
        //     events,
        //     EVENTS.UNDERSPEED,
        //     currentSpeed,
        //     `Vehicle speed dropped below minimum threshold of ${MIN_SPEED} km/h`
        // );

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
