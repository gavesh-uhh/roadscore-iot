# Backend Logic

## Event Detection

### Crash Detection
- Triggers when at least 2 of the following:
  - Sound detected
  - Excess acceleration > 2.5g
  - Sudden speed drop > 30 km/h
- Penalty: 60 points

### Hard Brake
- Triggers when:
  - Speed drop > 10 km/h
  - Deceleration < -0.3g
  - Time delta < 1.5s
  - Previous speed > 20 km/h
- Penalty: 20 points

### Harsh Acceleration
- Triggers when:
  - Speed increase > 15 km/h
  - Previous speed > 10 km/h
  - Current speed > previous speed
- Penalty: 8 points

### Sharp Cornering
- Triggers when:
  - Roll or yaw > 12.0
- Penalty: 10 points

### Pothole/Bump
- Triggers when:
  - Excess Z acceleration > 1.0g
  - Or vibration detected and excess Z > 0.5g
- Penalty: 3 points

### Overspeed
- Triggers when:
  - Current speed > 80 km/h
  - Previous speed <= 80 km/h
- Penalty: 8 points

### Positive Events
- Smooth Brake: Speed drop 5-10 km/h, deceleration -0.15 to -0.35g, duration >2s, previous speed > 10 km/h. Bonus: +10
- Smooth Acceleration: Speed increase 5-10 km/h, acceleration 0.15 to 0.35g, duration >2s, previous speed > 10 km/h. Bonus: +10

## Scoring Logic
- Initial score: 1000
- Penalty events subtract from score
- Bonus events add to score
- Score is clamped to minimum 0

---

## Data Flow
- Sensor data is processed per tick
- Detected events are pushed to the events array
- Score and events are returned for frontend display
