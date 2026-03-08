const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: `https://${serviceAccount.project_id}-default-rtdb.asia-southeast1.firebasedatabase.app`,
});

const db = admin.database();

const rand  = (min, max) => Math.random() * (max - min) + min;
const drift = (val, amt, min, max) => Math.min(Math.max(val + rand(-amt, amt), min), max);
const fix   = (val, dp = 3) => parseFloat(val.toFixed(dp));

let speed = 42.3, lat = 6.9271, lng = 79.8612;
let accX = 0.012, accY = -0.003, accZ = 9.8;
let pitch = 0.21, roll = -0.10, yaw = 0.05;
let currentEvent = 'normal';
let eventTicks = 0;
let lastError = null;

const EVENTS = {
  hard_brake:   { label: 'Hard Brake',       duration: 2 },
  sharp_corner: { label: 'Sharp Cornering',  duration: 3 },
  pothole:      { label: 'Pothole/Bump',     duration: 1 },
  crash:        { label: 'Crash',             duration: 2 },
};

const triggerEvent = (type) => {
  if (!EVENTS[type]) return;
  currentEvent = type;
  eventTicks = EVENTS[type].duration;
  console.log(`>>> TRIGGERING: ${EVENTS[type].label}`);
};

let autoEventCountdown = Math.floor(rand(15, 30));

if (process.stdin.isTTY) {
  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (key) => {
    if (key === '1') triggerEvent('hard_brake');
    if (key === '2') triggerEvent('sharp_corner');
    if (key === '3') triggerEvent('pothole');
    if (key === '4') triggerEvent('crash');
    if (key === 'q' || key === '\u0003') process.exit();
  });
  console.log('1=Hard Brake,  2=Sharp Corner,  3=Pothole,  4=Crash,  q=Quit\n');
}

const getSensorData = () => {
  switch (currentEvent) {
    case 'hard_brake':
      return { accX: -rand(3.2, 4.0), accY: -rand(0.3, 0.7), accZ: rand(9.5, 10.2), pitch: rand(2, 5), roll: rand(-3, 3), yaw: rand(0.5, 1.5), speed: Math.max(speed - rand(10, 20), 0), vibration: false, soundDetected: false };
    case 'sharp_corner':
      return { accX: rand(0.8, 1.5), accY: -rand(0.5, 1.0), accZ: rand(9.4, 9.9), pitch: rand(1, 2.5), roll: rand(18.5, 25), yaw: rand(2, 4), speed: drift(speed, 2, 30, 70), vibration: false, soundDetected: false };
    case 'pothole':
      return { accX: rand(0.3, 0.7), accY: -rand(0.1, 0.5), accZ: rand(14.3, 18.0), pitch: rand(7, 12), roll: rand(-2, 2), yaw: rand(0.2, 0.8), speed: drift(speed, 1, 20, 60), vibration: true, soundDetected: false };
    case 'crash':
      return { accX: rand(4.0, 6.0), accY: rand(3.0, 5.0), accZ: rand(12.0, 18.0), pitch: rand(10, 20), roll: rand(15, 30), yaw: rand(5, 15), speed: 0, vibration: true, soundDetected: true };
    default:
      accX  = drift(accX,  0.05, -0.5, 0.5);
      accY  = drift(accY,  0.05, -0.5, 0.5);
      accZ  = drift(accZ,  0.02,  9.6, 10.0);
      pitch = drift(pitch, 0.1, -5, 5);
      roll  = drift(roll,  0.1, -5, 5);
      yaw   = drift(yaw,   0.2, -10, 10);
      speed = drift(speed, 1,   20, 80);
      return { accX, accY, accZ, pitch, roll, yaw, speed, vibration: Math.random() < 0.02, soundDetected: Math.random() < 0.01 };
  }
};

setInterval(async () => {
  autoEventCountdown--;
  if (autoEventCountdown <= 0 && currentEvent === 'normal') {
    triggerEvent(Object.keys(EVENTS)[Math.floor(Math.random() * 4)]);
    autoEventCountdown = Math.floor(rand(15, 30));
  }

  const s = getSensorData();

  if (currentEvent !== 'normal') {
    eventTicks--;
    if (eventTicks <= 0) {
      console.log('Event ended — back to normal\n');
      currentEvent = 'normal';
      accX = 0; accY = 0; accZ = 9.8; pitch = 0; roll = 0; yaw = 0;
    }
  }

  lat += s.speed / 3600 / 111.32 * 0.7;
  lng += s.speed / 3600 / 111.32 * 0.7;

  const data = {
    vehicleId:     'VEH_001',
    timestamp:     Date.now(),
    speed:         fix(s.speed, 2),
    vibration:     s.vibration,
    soundDetected: s.soundDetected,
    acceleration:  { x: fix(s.accX), y: fix(s.accY), z: fix(s.accZ) },
    gyroscope:     { pitch: fix(s.pitch, 2), roll: fix(s.roll, 2), yaw: fix(s.yaw, 2) },
    gps:           { lat: fix(lat, 6), lng: fix(lng, 6) },
  };

  try {
    await db.ref('liveData/ESP32_001').set(data);
    lastError = null;
    console.log(`[${new Date().toLocaleTimeString()}] spd: ${String(data.speed).padStart(5)} | acc: (${data.acceleration.x}, ${data.acceleration.y}, ${data.acceleration.z}) | roll: ${data.gyroscope.roll} | mode: ${currentEvent}`);
  } catch (err) {
    const msg = err.message || err.code || 'Unknown error';
    if (msg !== lastError) {
      if (msg.includes('invalid_grant') || msg.includes('Invalid JWT')) {
        console.error('Auth failed — service account key is invalid or revoked. Generate a new one from Firebase Console.');
      } else if (msg.includes('NETWORK') || msg.includes('ENOTFOUND') || msg.includes('ECONNREFUSED')) {
        console.error('No internet connection — retrying...');
      } else if (msg.includes('PERMISSION_DENIED')) {
        console.error('Firebase permission denied — check your database rules.');
      } else {
        console.error(`Firebase error: ${msg}`);
      }
      lastError = msg;
    }
  }
}, 1000);