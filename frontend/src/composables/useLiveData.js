// =============================================
// LIVE DATA COMPOSABLE
// Handles real-time sensor data from ESP32 or simulation
// =============================================

import { ref, onUnmounted, computed } from 'vue'
import { api } from '../api'
import { useAlertEvents } from './useAlertEvents'

export function useLiveData(deviceId = 'esp32_001') {
  // Alert events for real-time updates
  const { triggerAlertRefresh } = useAlertEvents()
  
  // Live data state
  const liveData = ref({
    speed: 0,
    acceleration: { x: 0, y: 0, z: 0 },
    gyroscope: { pitch: 0, roll: 0, yaw: 0 },
    gps: { lat: 6.9271, lng: 79.8612 },
    vibration: false,
    soundDetected: false,
    timestamp: null
  })

  // Device connection status
  const lastUpdateTime = ref(null)
  const connectionTimeout = 30000 // 30 seconds - device is "offline" if no update within this time
  const dataSource = ref('simulated') // 'simulated' or 'device'
  
  // Check if device is connected (received data within timeout period)
  const isDeviceConnected = computed(() => {
    if (!lastUpdateTime.value) return false
    return (Date.now() - lastUpdateTime.value) < connectionTimeout
  })
  
  // Check if using real device data
  const isRealDevice = computed(() => dataSource.value === 'device')

  // Chart history data
  const speedHistory = ref([])
  const accelXHistory = ref([])
  const accelYHistory = ref([])
  const accelZHistory = ref([])
  const gyroPitchHistory = ref([])
  const gyroRollHistory = ref([])
  const gyroYawHistory = ref([])
  const timeLabels = ref([])
  const driverScore = ref(85)

  // Update interval
  let updateInterval = null

  // Alert tracking (prevent duplicate alerts)
  const recentAlerts = ref(new Set())
  const alertCooldown = 60000 // 1 minute cooldown between same alert types

  // Alert thresholds
  const THRESHOLDS = {
    SPEED_HIGH: 100, // km/h
    SPEED_CRITICAL: 120, // km/h
    ACCEL_HIGH: 3.0, // m/s²
    GYRO_PITCH_HIGH: 15, // degrees
    GYRO_ROLL_HIGH: 15, // degrees
  }

  // Check thresholds and create alerts
  async function  checkAndCreateAlerts(vehicleId, userId) {
    if (!isDeviceConnected.value || !liveData.value.timestamp) return
    
    const alerts = []
    
    // Speed alerts
    if (liveData.value.speed > THRESHOLDS.SPEED_CRITICAL) {
      alerts.push({
        type: 'critical_speed',
        severity: 'high',
        message: `Critical speed detected: ${liveData.value.speed} km/h`,
        value: liveData.value.speed
      })
    } else if (liveData.value.speed > THRESHOLDS.SPEED_HIGH) {
      alerts.push({
        type: 'high_speed',
        severity: 'medium',
        message: `High speed detected: ${liveData.value.speed} km/h`,
        value: liveData.value.speed
      })
    }
    
    // Acceleration alerts
    const accelMagnitude = Math.sqrt(
      Math.pow(liveData.value.acceleration.x, 2) +
      Math.pow(liveData.value.acceleration.y, 2) +
      Math.pow(liveData.value.acceleration.z, 2)
    )
    if (accelMagnitude > THRESHOLDS.ACCEL_HIGH) {
      alerts.push({
        type: 'harsh_acceleration',
        severity: 'medium',
        message: `Harsh acceleration detected: ${accelMagnitude.toFixed(1)} m/s²`,
        value: accelMagnitude
      })
    }
    
    // Gyroscope alerts (tilting/rolling)
    if (Math.abs(liveData.value.gyroscope.pitch) > THRESHOLDS.GYRO_PITCH_HIGH) {
      alerts.push({
        type: 'excessive_pitch',
        severity: 'high',
        message: `Excessive pitch angle: ${liveData.value.gyroscope.pitch.toFixed(1)}°`,
        value: liveData.value.gyroscope.pitch
      })
    }
    if (Math.abs(liveData.value.gyroscope.roll) > THRESHOLDS.GYRO_ROLL_HIGH) {
      alerts.push({
        type: 'excessive_roll',
        severity: 'high',
        message: `Excessive roll angle: ${liveData.value.gyroscope.roll.toFixed(1)}°`,
        value: liveData.value.gyroscope.roll
      })
    }
    
    // Vibration alert
    if (liveData.value.vibration) {
      alerts.push({
        type: 'vibration_detected',
        severity: 'medium',
        message: 'Abnormal vibration detected',
        value: true
      })
    }
    
    // Sound alert
    if (liveData.value.soundDetected) {
      alerts.push({
        type: 'sound_detected',
        severity: 'low',
        message: 'Unusual sound detected',
        value: true
      })
    }
    
    // Create alerts (with cooldown check)
    for (const alert of alerts) {
      const alertKey = `${alert.type}_${vehicleId}`
      
      // Check if we've recently sent this alert
      if (!recentAlerts.value.has(alertKey)) {
        try {
          await api.createAlert({
            vehicleId: vehicleId,
            userId: userId,
            type: alert.type,
            severity: alert.severity,
            message: alert.message,
            value: alert.value,
            gps: liveData.value.gps,
            timestamp: Date.now()
          })
          
          // Mark alert as sent with cooldown
          recentAlerts.value.add(alertKey)
          setTimeout(() => {
            recentAlerts.value.delete(alertKey)
          }, alertCooldown)
          
          // Trigger real-time alert refresh in UI
          triggerAlertRefresh('new_alert')
          
          console.log('Alert created:', alert.message)
        } catch (error) {
          console.error('Failed to create alert:', error)
        }
      }
    }
  }

  // Try to fetch real data from ESP32 via backend
  async function fetchDeviceData() {
    try {
      const allData = await api.getLiveData()
      
      // Firebase returns data as object: { deviceId: {...}, deviceId2: {...} }
      // Convert to array or access by deviceId
      let deviceData = null
      
      if (allData && typeof allData === 'object') {
        // Check if it's already formatted with the specific deviceId
        if (allData[deviceId]) {
          // Direct access by deviceId from Firebase object
          deviceData = { id: deviceId, ...allData[deviceId] }
        } else {
          // Get first available device from the object
          const deviceKeys = Object.keys(allData)
          if (deviceKeys.length > 0) {
            const firstDeviceId = deviceKeys[0]
            deviceData = { id: firstDeviceId, ...allData[firstDeviceId] }
          }
        }
      }
      
      if (deviceData && deviceData.timestamp) {
        // Check if data is fresh (received within timeout period)
        const dataAge = Date.now() - deviceData.timestamp
        if (dataAge < connectionTimeout) {
          // Use real device data
          console.log('Using real device data:', deviceData.id, 'Age:', dataAge + 'ms')
          return { isReal: true, data: deviceData }
        } else {
          console.log('Device data too old:', dataAge + 'ms')
        }
      }
      
      return { isReal: false, data: null }
    } catch (error) {
      // Backend not available or error
      console.log('Could not fetch device data:', error.message)
      return { isReal: false, data: null }
    }
  }

  // Generate simulated data
  // function generateSimulatedData() {
  //   return {
  //     speed: Math.floor(40 + Math.random() * 60),
  //     acceleration: {
  //       x: parseFloat((Math.random() * 2 - 1).toFixed(2)),
  //       y: parseFloat((Math.random() * 2 - 1).toFixed(2)),
  //       z: parseFloat((Math.random() * 0.5 + 0.8).toFixed(2))
  //     },
  //     gyroscope: {
  //       pitch: parseFloat((Math.random() * 10 - 5).toFixed(2)),
  //       roll: parseFloat((Math.random() * 10 - 5).toFixed(2)),
  //       yaw: parseFloat((Math.random() * 6 - 3).toFixed(2))
  //     },
  //     gps: { lat: 6.9271, lng: 79.8612 },
  //     vibration: Math.random() > 0.7,
  //     soundDetected: Math.random() > 0.8,
  //     timestamp: Date.now()
  //   }
  // }

  // Update live data - tries real device first, falls back to simulation
  async function updateLiveData(vehicleId = null) {
    const now = new Date()
    const timeStr = now.toLocaleTimeString('en-US', { hour12: false }).slice(3, 8)
    
    // Try to get real device data
    const { isReal, data } = await fetchDeviceData()
    
    if (isReal && data) {
      // Use real ESP32 data
      liveData.value.speed = data.speed || 0
      liveData.value.acceleration = data.acceleration || { x: 0, y: 0, z: 0 }
      liveData.value.gyroscope = data.gyroscope || { pitch: 0, roll: 0, yaw: 0 }
      liveData.value.gps = data.gps || { lat: 6.9271, lng: 79.8612 }
      liveData.value.vibration = data.vibration || false
      liveData.value.soundDetected = data.soundDetected || false
      liveData.value.timestamp = data.timestamp
      dataSource.value = 'device'
      lastUpdateTime.value = data.timestamp
    } // else {
      // Fall back to simulated data
      // const simData = generateSimulatedData()
      // liveData.value.speed = simData.speed
      // liveData.value.acceleration = simData.acceleration
      // liveData.value.gyroscope = simData.gyroscope
      // liveData.value.gps = simData.gps
      // liveData.value.vibration = simData.vibration
      // liveData.value.soundDetected = simData.soundDetected
      // liveData.value.timestamp = simData.timestamp
      // dataSource.value = 'simulated'
      // lastUpdateTime.value = Date.now()
    // }
    
    // Fetch driver score from backend if vehicleId is provided
    if (vehicleId) {
      try {
        const scoreData = await api.getDriverScore(vehicleId)
        driverScore.value = Math.round(scoreData.currentScore / 10) // Convert from 0-1000 to 0-100 scale
      } catch (error) {
        console.error('Failed to fetch driver score:', error)
        driverScore.value = 100 // Default score on error
      }
    } else {
      driverScore.value = 100 // Default score when no vehicle selected
    }
    
    // Update history
    timeLabels.value.push(timeStr)
    speedHistory.value.push(liveData.value.speed)
    accelXHistory.value.push(liveData.value.acceleration.x)
    accelYHistory.value.push(liveData.value.acceleration.y)
    accelZHistory.value.push(liveData.value.acceleration.z)
    gyroPitchHistory.value.push(liveData.value.gyroscope.pitch)
    gyroRollHistory.value.push(liveData.value.gyroscope.roll)
    gyroYawHistory.value.push(liveData.value.gyroscope.yaw)
    
    // Keep only last 20 data points
    if (timeLabels.value.length > 20) {
      timeLabels.value.shift()
      speedHistory.value.shift()
      accelXHistory.value.shift()
      accelYHistory.value.shift()
      accelZHistory.value.shift()
      gyroPitchHistory.value.shift()
      gyroRollHistory.value.shift()
      gyroYawHistory.value.shift()
    }
  }

  // Start live updates
  function startUpdates(chartsRef, vehicleId = null, userId = null, interval = 2000) {
    updateLiveData(vehicleId)
    chartsRef?.value?.updateCharts()
    
    updateInterval = setInterval(async () => {
      await updateLiveData(vehicleId)
      chartsRef?.value?.updateCharts()
      
      // Check for alerts if vehicle and user info provided
      if (vehicleId && userId) {
        await checkAndCreateAlerts(vehicleId, userId)
      }
    }, interval)
  }

  // Stop updates
  function stopUpdates() {
    if (updateInterval) {
      clearInterval(updateInterval)
      updateInterval = null
    }
  }

  // Auto cleanup
  onUnmounted(() => {
    stopUpdates()
  })

  return {
    // State
    liveData,
    speedHistory,
    accelXHistory,
    accelYHistory,
    accelZHistory,
    gyroPitchHistory,
    gyroRollHistory,
    gyroYawHistory,
    timeLabels,
    driverScore,
    // Connection status
    isDeviceConnected,
    isRealDevice,
    dataSource,
    lastUpdateTime,
    // Alert thresholds
    THRESHOLDS,
    // Methods
    updateLiveData,
    startUpdates,
    stopUpdates,
    checkAndCreateAlerts
  }
}
