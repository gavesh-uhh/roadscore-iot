# RoadScore IoT Backend

## Required Files

- `serviceAccountKey.json` - Firebase service account credentials
- `.env` - Environment variables:
  ```
  PORT=3000
  FIREBASE_DATABASE_URL=https://your-project.firebasedatabase.app/
  FIREBASE_API_KEY=your-api-key
  ```

## Run

```bash
npm install
npm start
```

## Routes

- `/auth` - Login & Signup
- `/users` - User management
- `/vehicles` - Vehicle management
- `/live-data` - ESP32 sensor data
- `/alerts` - System alerts
- `/health` - Health check
