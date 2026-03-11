# Data Flow

## Sensor Data
- Simulator sends sensor readings to backend
- Backend processes readings and detects events

## Event Processing
- Detected events are pushed to an array
- Score is calculated based on events
- Events and score are sent to frontend

## Frontend Display
- Dashboard fetches live data and events every second
- Joins alerts and events for unified log
- Deduplicates and sorts events for user clarity
