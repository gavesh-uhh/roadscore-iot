# RoadScore Simulator

A Node.js script that emulates an ESP32 device by pushing realistic driving sensor data to Firebase Realtime Database every second.

## Setup

1. Clone the repo and install dependencies:
```bash
npm install
```

2. Place your Firebase service account key in the project root as `serviceAccountKey.json`

## Run

```bash
npm start
```

## Hotkeys

| Key | Event |
|-----|-------|
| `1` | Hard Brake |
| `2` | Sharp Cornering |
| `3` | Pothole / Bump |
| `4` | Crash |
| `q` | Quit |

Events also fire automatically every 15–30 seconds.