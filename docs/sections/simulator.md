# Simulator Logic

## Event Triggers
- Manual triggers via keyboard:
  - 1: Hard Brake
  - 2: Sharp Corner
  - 3: Pothole
  - 4: Crash
  - 5: Smooth Brake
  - 6: Smooth Acceleration
- Auto triggers every 15-30 seconds

## Sensor Simulation
- Generates realistic values for speed, acceleration, gyroscope, vibration, sound
- Each event modifies sensor values to match detection thresholds

## Data Flow
- Sends sensor data to backend every second
- Resets to normal after event duration
