# RoadScore

```
**Warning:** The Firebase API key and credentials in this codebase are publicly visible.
```

## Introduction

A portable, self-contained IoT-based vehicle monitoring system that detects unsafe driving behavior using threshold-based sensor logic.
This system analyzes real-time sensor data to detect:
- Hard Braking
- Sharp Cornering
- Potholes / Road Impacts
- High-Impact Events (Crash)

It generates an objective driving safety score with given thresholds

## Current Sensor Suite
- 6 Axis IMU
- GPS Module
- Microphone
- Vibration Tilt Sensor

## Loop Structure
1) Read GPS
2) Read IMU (accelerometer + gyroscope)
3) Read Digital Sensors (vibration + sound sensor)
4) Update GPS snapshot
5) Update OLED, rotates pages every 1s
6) Push to Firebase every 1s
7) Serve dashboard to connected local WiFi clients

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