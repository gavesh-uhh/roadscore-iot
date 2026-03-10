
import { ref, onUnmounted, computed } from 'vue'
import { api } from '../api'
import { useAlertEvents } from './useAlertEvents'

export function useLiveData(deviceId = 'esp32_001') {
  const { triggerAlertRefresh } = useAlertEvents()
  
  const liveData = ref({
    speed: 0,
    acceleration: { x: 0, y: 0, z: 0 },
    gyroscope: { pitch: 0, roll: 0, yaw: 0 },
    gps: { lat: 6.9271, lng: 79.8612 },
    vibration: false,
    soundDetected: false,
    timestamp: null
  })

  const lastUpdateTime = ref(null)
  const connectionTimeout = 30000 
  const dataSource = ref('simulated') 
  
  const isDeviceConnected = computed(() => {
    if (!lastUpdateTime.value) return false
    return (Date.now() - lastUpdateTime.value) < connectionTimeout
  })
  
  const isRealDevice = computed(() => dataSource.value === 'device')

  const speedHistory = ref([])
  const accelXHistory = ref([])
  const accelYHistory = ref([])
  const accelZHistory = ref([])
  const gyroPitchHistory = ref([])
  const gyroRollHistory = ref([])
  const gyroYawHistory = ref([])
  const timeLabels = ref([])
  const driverScore = ref(85)

  let updateInterval = null

  const recentAlerts = ref(new Set())
  const alertCooldown = 60000 

  const THRESHOLDS = {
    SPEED_HIGH: 100, 
    SPEED_CRITICAL: 120, 
    ACCEL_HIGH: 3.0, 
    GYRO_PITCH_HIGH: 15, 
    GYRO_ROLL_HIGH: 15, 
  }

  async function  checkAndCreateAlerts(vehicleId, userId) {
    if (!isDeviceConnected.value || !liveData.value.timestamp) return
    
    const alerts = []
    
    
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
    
    if (liveData.value.vibration) {
      alerts.push({
        type: 'vibration_detected',
        severity: 'medium',
        message: 'Abnormal vibration detected',
        value: true
      })
    }
    
    if (liveData.value.soundDetected) {
      alerts.push({
        type: 'sound_detected',
        severity: 'low',
        message: 'Unusual sound detected',
        value: true
      })
    }
    
    for (const alert of alerts) {
      const alertKey = `${alert.type}_${vehicleId}`
      
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
          
          recentAlerts.value.add(alertKey)
          setTimeout(() => {
            recentAlerts.value.delete(alertKey)
          }, alertCooldown)
          
          triggerAlertRefresh('new_alert')
          
          console.log('Alert created:', alert.message)
        } catch (error) {
          console.error('Failed to create alert:', error)
        }
      }
    }
  }

  async function fetchDeviceData() {
    try {
      const allData = await api.getLiveData()
      
      let deviceData = null
      
      if (allData && typeof allData === 'object') {
        if (allData[deviceId]) {
          deviceData = { id: deviceId, ...allData[deviceId] }
        } else {
          const deviceKeys = Object.keys(allData)
          if (deviceKeys.length > 0) {
            const firstDeviceId = deviceKeys[0]
            deviceData = { id: firstDeviceId, ...allData[firstDeviceId] }
          }
        }
      }
      
      if (deviceData && deviceData.timestamp) {
        const dataAge = Date.now() - deviceData.timestamp
        if (dataAge < connectionTimeout) {
          console.log('Using real device data:', deviceData.id, 'Age:', dataAge + 'ms')
          return { isReal: true, data: deviceData }
        } else {
          console.log('Device data too old:', dataAge + 'ms')
        }
      }
      
      return { isReal: false, data: null }
    } catch (error) {
      console.log('Could not fetch device data:', error.message)
      return { isReal: false, data: null }
    }
  }

  async function updateLiveData(vehicleId = null) {
    const now = new Date()
    const timeStr = now.toLocaleTimeString('en-US', { hour12: false }).slice(3, 8)
    
    const { isReal, data } = await fetchDeviceData()
    
    if (isReal && data) {
      liveData.value.speed = data.speed || 0
      liveData.value.acceleration = data.acceleration || { x: 0, y: 0, z: 0 }
      liveData.value.gyroscope = data.gyroscope || { pitch: 0, roll: 0, yaw: 0 }
      liveData.value.gps = data.gps || { lat: 6.9271, lng: 79.8612 }
      liveData.value.vibration = data.vibration || false
      liveData.value.soundDetected = data.soundDetected || false
      liveData.value.timestamp = data.timestamp
      dataSource.value = 'device'
      lastUpdateTime.value = data.timestamp
    } 
  
    if (vehicleId) {
      try {
        const scoreData = await api.getDriverScore(vehicleId)
        driverScore.value = Math.round(scoreData.currentScore / 10)
      } catch (error) {
        console.error('Failed to fetch driver score:', error)
      }
    }
    
    timeLabels.value.push(timeStr)
    speedHistory.value.push(liveData.value.speed)
    accelXHistory.value.push(liveData.value.acceleration.x)
    accelYHistory.value.push(liveData.value.acceleration.y)
    accelZHistory.value.push(liveData.value.acceleration.z)
    gyroPitchHistory.value.push(liveData.value.gyroscope.pitch)
    gyroRollHistory.value.push(liveData.value.gyroscope.roll)
    gyroYawHistory.value.push(liveData.value.gyroscope.yaw)
    
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

  function startUpdates(chartsRef, vehicleId = null, userId = null, interval = 2000) {
    updateLiveData(vehicleId)
    chartsRef?.value?.updateCharts()
    
    updateInterval = setInterval(async () => {
      await updateLiveData(vehicleId)
      chartsRef?.value?.updateCharts()
      
      if (vehicleId && userId) {
        await checkAndCreateAlerts(vehicleId, userId)
      }
    }, interval)
  }

  function stopUpdates() {
    if (updateInterval) {
      clearInterval(updateInterval)
      updateInterval = null
    }
  }

  onUnmounted(() => {
    stopUpdates()
  })

  return {
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
    isDeviceConnected,
    isRealDevice,
    dataSource,
    lastUpdateTime,
    THRESHOLDS,
    updateLiveData,
    startUpdates,
    stopUpdates,
    checkAndCreateAlerts
  }
}
