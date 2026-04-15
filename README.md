# RoadScore

```
Warning: Firebase API key and credentials in this codebase were publicly visible.
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
├── device/          ESP32 firmware
├── backend/         Express API + background score calculation server
├── frontend/        Vue 3 front-end dashboard
├── simulator/       Emulator for emulating 'RoadScore' device for testing thresholds
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
| Device | ESP32-CAM, MPU6050, NEO-6M GPS, SW520D, MIC, OLED SSD1306 |
| Backend | Node.js, ExpressJS, Firebase Admin SDK |
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

## Firebase Structure

```
users/
  {uid}/
    name: string
    email: string
    role: string
    status: string
    createdAt: number

vehicles/
  {vehicleId}/
    plateNumber: string
    model: string
    deviceId: string
    ownerUid: string
    createdAt: number

liveData/
  {deviceId}/
    vehicleId: string
    speed: number
    acceleration: { x: number, y: number, z: number }
    gyroscope: { pitch: number, roll: number, yaw: number }
    gps: { lat: number, lng: number }
    vibration: boolean
    soundDetected: boolean
    timestamp: number

driverScores/
  {vehicleId}/
    vehicleId: string
    deviceId: string
    uid: string
    currentScore: number
    previousScore: number
    averageScore: number
    totalTrips: number
    lastCalculated: number

drivingBehavior/
  {vehicleId}/
    vehicleId: string
    deviceId: string
    uid: string
    metrics: object
    recentEvents: array
    lastUpdated: number

scoreHistory/
  {vehicleId_timestamp}/
    vehicleId: string
    uid: string
    score: number
    date: string
    timestamp: number
    tripData: { distance: number, duration: number, avgSpeed: number }

liveDataHistory/
  {deviceId_timestamp}/
    vehicleId: string
    deviceId: string
    speed: number
    acceleration: { x: number, y: number, z: number }
    gyroscope: { pitch: number, roll: number, yaw: number }
    gps: { lat: number, lng: number }
    vibration: boolean
    soundDetected: boolean
    calculatedScore: number
    timestamp: number

alerts/
  {alertId}/
    uid: string
    vehicleId: string
    deviceId: string
    type: string
    severity: string
    message: string
    timestamp: number
    acknowledged: boolean
```

## Authors

- Gavesh Saparamadu
- Yashan Perara
- Timesh Dillon
- Siluna De Silva
