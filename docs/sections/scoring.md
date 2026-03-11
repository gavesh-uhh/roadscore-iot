# Scoring System

## Overview
- Score starts at 1000
- Negative events subtract points
- Positive events add points
- Score is clamped to minimum 0

## Penalty Events
- CRASH: -60
- HARD_BRAKE: -20
- HARSH_ACCELERATION: -8
- SHARP_CORNER: -10
- POTHOLE: -3
- OVERSPEED: -8
- UNDERSPEED: -5

## Bonus Events
- SMOOTH_BRAKE: +10
- SMOOTH_ACCELERATION: +10

## Calculation
- Each tick, all event checks are run
- Penalties are subtracted, bonuses are added
- Final score and events are returned for display
