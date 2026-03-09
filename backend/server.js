require('dotenv').config();

const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const usersRoutes = require('./routes/users');
const vehiclesRoutes = require('./routes/vehicles');
const liveDataRoutes = require('./routes/liveData');
const alertsRoutes = require('./routes/alerts');
const driverScoresRoutes = require('./routes/driverScores');
const drivingBehaviorRoutes = require('./routes/drivingBehavior');
const { startWorker } = require('./core/backgroundWorker');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use('/auth', authRoutes);
app.use('/users', usersRoutes);
app.use('/vehicles', vehiclesRoutes);
app.use('/live-data', liveDataRoutes);
app.use('/alerts', alertsRoutes);
app.use('/driver-scores', driverScoresRoutes);
app.use('/driving-behavior', drivingBehaviorRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running!' });
});

app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(PORT, () => {
  console.log('');
  console.log('  ____                 _ ____                      ');
  console.log(' |  _ \\ ___   __ _  __| / ___|  ___ ___  _ __ ___ ');
  console.log(' | |_) / _ \\ / _` |/ _` \\___ \\ / __/ _ \\| \'__/ _ \\');
  console.log(' |  _ < (_) | (_| | (_| |___) | (_| (_) | | |  __/');
  console.log(' |_| \\_\\___/ \\__,_|\\__,_|____/ \\___\\___/|_|  \\___|');
  console.log('');
  console.log('  Server running on http://localhost:' + PORT);
  console.log('');
  startWorker();
});
