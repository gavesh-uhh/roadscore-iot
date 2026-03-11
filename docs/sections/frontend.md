# Frontend Logic

## Dashboard.vue
- Displays driver score and recent driving events
- Fetches live data and events every second
- Deduplicates events by composite key (type, timestamp, message, value)
- Joins alerts and events for unified display
- Shows bonus events with green styling

## UI Features
- Score badge with real-time animation
- Recent events list with clear button
- Responsive layout for admin and driver views

---

## Data Handling
- Uses composables for live data and CRUD operations
- Filters and sorts events for display
- Updates UI every second for real-time feedback
