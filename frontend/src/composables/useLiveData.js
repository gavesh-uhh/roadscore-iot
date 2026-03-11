
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
  const driverScore = ref(null)

  let updateInterval = null

  const recentAlerts = ref(new Set())
  const alertCooldown = 60000 

  const THRESHOLDS = {
    SPEED_LIMIT: 60,
    SPEED_CRITICAL: 100,
    ACCEL_EXCESS: 2.0,
    GYRO_CORNERING: 5.0,
    POTHOLE_Z_EXCESS: 0.5,
    POTHOLE_Z_VIBRATION: 0.25,
  }

  async function  checkAndCreateAlerts(vehicleId, userId) {
    if (!isDeviceConnected.value || !liveData.value.timestamp) return
    
    const alerts = []
    const speed = liveData.value.speed
    const accel = liveData.value.acceleration
    const gyro = liveData.value.gyroscope
    const vibration = liveData.value.vibration

    if (speed > THRESHOLDS.SPEED_CRITICAL) {
      alerts.push({
        type: 'overspeed',
        severity: 'high',
        message: `Critical speed: ${speed} km/h exceeds ${THRESHOLDS.SPEED_CRITICAL} km/h`,
        value: speed
      })
    } else if (speed > THRESHOLDS.SPEED_LIMIT) {
      alerts.push({
        type: 'overspeed',
        severity: 'medium',
        message: `Vehicle exceeded speed limit of ${THRESHOLDS.SPEED_LIMIT} km/h`,
        value: speed
      })
    }

    const totalAccel = Math.sqrt(
      Math.pow(accel.x, 2) + Math.pow(accel.y, 2) + Math.pow(accel.z, 2)
    )
    const excessAccel = Math.abs(totalAccel - 1.0)
    if (excessAccel > THRESHOLDS.ACCEL_EXCESS) {
      alerts.push({
        type: 'crash_detected',
        severity: 'high',
        message: `Extreme acceleration detected: ${excessAccel.toFixed(1)}g`,
        value: excessAccel
      })
    }

    const corneringValue = Math.max(Math.abs(gyro.roll), Math.abs(gyro.yaw))
    if (corneringValue > THRESHOLDS.GYRO_CORNERING) {
      alerts.push({
        type: 'overspeed',
        severity: 'medium',
        message: `Sharp cornering detected: ${corneringValue.toFixed(1)}°`,
        value: corneringValue
      })
    }

    const excessZ = Math.abs(accel.z - 1.0)
    if (excessZ > THRESHOLDS.POTHOLE_Z_EXCESS || (vibration && excessZ > THRESHOLDS.POTHOLE_Z_VIBRATION)) {
      alerts.push({
        type: 'hard_brake',
        severity: 'low',
        message: 'Pothole or bump detected',
        value: excessZ
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
        driverScore.value = Math.round(scoreData.currentScore)
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
