# RoadScore

```
Warning: The Firebase API key and credentials in this codebase are publicly visible.
```

## Introduction

A portable, self-contained IoT-based vehicle monitoring system that detects unsafe driving behavior using threshold-based sensor logic.
This system analyzes real-time sensor data to detect:
- Hard Braking
- Sharp Cornering
- Potholes / Road Impacts
- High-Impact Events (Crash)
- Overspeed
- Harsh Acceleration

It generates an objective driving safety score (0–1000) based on configurable thresholds.

## Project Structure

```
roadscore-iot/
├── device/          ESP32 firmware (Arduino)
├── backend/         Express API + background score worker
├── frontend/        Vue 3 dashboard
├── simulator/       Node.js device emulator
└── firebase-db/     DB seed data & security rules
```

## Current Sensor Suite
- 6-Axis IMU (accelerometer + gyroscope)
- GPS Module
- Microphone (sound detection)
- Vibration Tilt Sensor

## Tech Stack

| Layer | Stack |
|-------|-------|
| Device | ESP32, MPU6050, NEO-6M GPS, OLED SSD1306 |
| Backend | Node.js, Express, Firebase Admin SDK |
| Frontend | Vue 3, Vite, ECharts, Leaflet |
| Database | Firebase Realtime Database |
| Simulator | Node.js, Firebase Admin SDK |

## Setup

### Backend
```bash
cd backend
npm install
# add .env and serviceAccountKey.json (see backend/README.md)
npm start
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Simulator
```bash
cd simulator
npm install
# add serviceAccountKey.json
npm start
```

## Device Loop
1) Read GPS
2) Read IMU (accelerometer + gyroscope)
3) Read digital sensors (vibration + sound)
4) Update GPS snapshot
5) Update OLED, rotates pages every 1s
6) Push to Firebase every 1s
7) Serve dashboard to connected local WiFi clients

## Scoring System

The background worker polls `liveData` every second and runs threshold checks against the current and previous readings.

| Event | Penalty | Severity |
|-------|---------|----------|
| Crash Detected | -100 | High |
| Hard Brake | -50 | Medium |
| Sharp Cornering | -30 | Medium |
| Harsh Acceleration | -20 | Low |
| Overspeed | -20 | Medium |
| Pothole / Bump | -10 | Low |

Score starts at 1000 and decreases on detected events. A running average is maintained across trips.

## API Routes

| Route | Description |
|-------|-------------|
| `/auth` | Login & signup |
| `/users` | User management |
| `/vehicles` | Vehicle CRUD |
| `/live-data` | ESP32 sensor data |
| `/driver-scores` | Score per vehicle/user |
| `/driving-behavior` | Events & metrics |
| `/alerts` | System alerts |
| `/health` | Health check |

## Firebase Structure Example
```json
{
  "liveData": {
    "ESP32_001": {
      "vehicleId": "CAB-001",
      "timestamp": 1714000000000,
      "speed": 42.3,
      "vibration": false,
      "soundDetected": false,
      "acceleration": {
        "x": 0.012,
        "y": -0.003,
        "z": 1.001
      },
      "gyroscope": {
        "pitch": 0.21,
        "roll": -0.10,
        "yaw": 0.05
      },
      "gps": {
        "lat": 6.92710,
        "lng": 79.86120
      }
    }
  }
}
```

## Authors

Gavesh Saparamadu
Yashan Perara
Timesh Dillon
Siluna De Silva