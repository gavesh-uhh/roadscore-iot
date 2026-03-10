<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { MapPin, Navigation, RefreshCw, AlertTriangle, X } from 'lucide-vue-next'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { api } from '../../api'

const props = defineProps({
  deviceId: {
    type: String,
    default: 'ESP32_001'
  },
  liveData: {
    type: Object,
    required: true
  },
  vehicleId: {
    type: String,
    default: null
  }
})

const mapContainer = ref(null)
const isLoading = ref(true)
const crashEvents = ref([])
const showCrashMarkers = ref(true)

let map = null
let marker = null
let crashMarkers = []

const createMarkerIcon = () => {
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div class="marker-container">
        <div class="marker-pulse"></div>
        <div class="marker-dot"></div>
      </div>
    `,
    iconSize: [30, 30],
    iconAnchor: [15, 15]
  })
}

const createCrashMarkerIcon = () => {
  return L.divIcon({
    className: 'crash-marker',
    html: `
      <div class="crash-marker-container">
        <div class="crash-marker-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
            <line x1="12" y1="9" x2="12" y2="13"></line>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
        </div>
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 40]
  })
}

const initMap = () => {
  if (!mapContainer.value || map) return

  const lat = props.liveData?.gps?.lat || 6.9271
  const lng = props.liveData?.gps?.lng || 79.8612

  map = L.map(mapContainer.value, {
    center: [lat, lng],
    zoom: 15,
    zoomControl: true,
    attributionControl: true
  })

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19
  }).addTo(map)

  marker = L.marker([lat, lng], {
    icon: createMarkerIcon()
  }).addTo(map)

  updatePopup()
  
  isLoading.value = false
}

const updatePopup = () => {
  if (!marker) return
  
  const speed = props.liveData?.speed || 0
  const lat = props.liveData?.gps?.lat || 0
  const lng = props.liveData?.gps?.lng || 0
  
  marker.setPopupContent(`
    <div class="marker-popup">
      <strong>Device: ${props.deviceId}</strong><br>
      Speed: ${speed} km/h<br>
      Lat: ${lat.toFixed(6)}<br>
      Lng: ${lng.toFixed(6)}
    </div>
  `)
}

const updateMarker = () => {
  if (!marker || !map || !props.liveData?.gps) return
  
  const lat = props.liveData.gps.lat || 6.9271
  const lng = props.liveData.gps.lng || 79.8612
  
  marker.setLatLng([lat, lng])
  updatePopup()
}

const fetchCrashEvents = async () => {
  if (!props.vehicleId) return
  
  try {
    const events = await api.getCrashEvents(props.vehicleId)
    crashEvents.value = events
    displayCrashMarkers()
  } catch (error) {
    console.error('Failed to fetch crash events:', error)
  }
}

const toggleCrashMarkers = () => {
  showCrashMarkers.value = !showCrashMarkers.value
  if (!showCrashMarkers.value) {
    // Hide markers
    crashMarkers.forEach(marker => map.removeLayer(marker))
    crashMarkers = []
  } else {
    // Show markers
    displayCrashMarkers()
  }
}

const clearCrashMarkers = async () => {
  if (!props.vehicleId) return
  
  try {
    await api.deleteCrashEvents(props.vehicleId)
    
    // Clear from UI
    crashMarkers.forEach(marker => map.removeLayer(marker))
    crashMarkers = []
    crashEvents.value = []
  } catch (error) {
    console.error('Failed to clear crash events:', error)
  }
}

const displayCrashMarkers = () => {
  if (!map || !showCrashMarkers.value) return
  
  crashMarkers.forEach(marker => map.removeLayer(marker))
  crashMarkers = []
  
  crashEvents.value.forEach(event => {
    if (event.location && event.location.lat && event.location.lng) {
      const crashMarker = L.marker([event.location.lat, event.location.lng], {
        icon: createCrashMarkerIcon()
      }).addTo(map)
      
      const date = new Date(event.timestamp)
      const timeStr = date.toLocaleString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit' 
      })
      
      crashMarker.bindPopup(`
        <div class="crash-popup">
          <div class="crash-popup-header">
            <strong>⚠️ Crash Detected</strong>
          </div>
          <div class="crash-popup-body">
            <div><strong>Time:</strong> ${timeStr}</div>
            <div><strong>Location:</strong> ${event.location.lat.toFixed(6)}, ${event.location.lng.toFixed(6)}</div>
            ${event.rawData?.speed ? `<div><strong>Speed:</strong> ${event.rawData.speed} km/h</div>` : ''}
          </div>
        </div>
      `)
      
      crashMarkers.push(crashMarker)
    }
  })
}

const centerMap = () => {
  if (map && props.liveData?.gps) {
    map.setView([props.liveData.gps.lat, props.liveData.gps.lng], 15)
  }
}

const formatTime = () => {
  if (!props.liveData?.timestamp) return 'No data'
  const date = new Date(props.liveData.timestamp)
  return date.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit' 
  })
}

watch(() => props.liveData, () => {
  updateMarker()
}, { deep: true })

watch(() => props.deviceId, () => {
  if (marker && map && props.liveData?.gps) {
    const lat = props.liveData.gps.lat || 6.9271
    const lng = props.liveData.gps.lng || 79.8612
    marker.setLatLng([lat, lng])
    map.setView([lat, lng], 15)
    updatePopup()
  }
})

watch(() => props.vehicleId, () => {
  fetchCrashEvents()
})

onMounted(() => {
  initMap()
  fetchCrashEvents()
  setInterval(fetchCrashEvents, 10000)
})

onUnmounted(() => {
  if (map) {
    map.remove()
    map = null
  }
})
</script>

<template>
  <div class="live-map-container">
    <div class="map-header">
      <div class="header-left">
        <MapPin :size="20" class="header-icon" />
        <h3>Live Location</h3>
      </div>
      <div class="header-right">
        <div class="location-info" v-if="!isLoading">
          <span class="speed-badge">
            <Navigation :size="14" />
            {{ liveData?.speed || 0 }} km/h
          </span>
          <span class="coords">
            {{ (liveData?.gps?.lat || 0).toFixed(4) }}, {{ (liveData?.gps?.lng || 0).toFixed(4) }}
          </span>
        </div>
        <button class="center-btn" @click="centerMap" title="Center map">
          <RefreshCw :size="16" />
        </button>
      </div>
    </div>
    
    <div class="map-wrapper">
      <div v-if="isLoading" class="loading-overlay">
        <div class="spinner"></div>
        <p>Loading map...</p>
      </div>
      
      <div ref="mapContainer" class="map"></div>
    </div>
    
    <div class="map-legend">
      <div class="legend-title">Map Legend:</div>
      <div class="legend-items">
        <div class="legend-item">
          <div class="legend-icon vehicle-icon">
            <div class="marker-container-mini">
              <div class="marker-pulse-mini"></div>
              <div class="marker-dot-mini"></div>
            </div>
          </div>
          <span>Current Vehicle Location</span>
        </div>
        <div class="legend-item">
          <div class="legend-icon crash-icon">
            <div class="crash-marker-mini">
              <AlertTriangle :size="14" />
            </div>
          </div>
          <span>Crash Event Location</span>
        </div>
      </div>
    </div>
    
    <div class="map-footer">
      Last updated: {{ formatTime() }}
      <div v-if="crashEvents.length > 0" class="crash-controls">
        <span class="crash-indicator">
          <AlertTriangle :size="14" />
          {{ crashEvents.length }} crash event{{ crashEvents.length !== 1 ? 's' : '' }}
        </span>
        <button 
          class="toggle-crash-btn" 
          :class="{ 'hidden': !showCrashMarkers }"
          @click="toggleCrashMarkers" 
          :title="showCrashMarkers ? 'Hide crash markers' : 'Show crash markers'"
        >
          <X v-if="showCrashMarkers" :size="14" />
          <AlertTriangle v-else :size="14" />
          {{ showCrashMarkers ? 'Hide' : 'Show' }}
        </button>
        <button 
          class="clear-crash-btn"
          @click="clearCrashMarkers" 
          title="Permanently clear crash events from database"
        >
          <X :size="14" />
          Clear All
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.live-map-container {
  background: var(--bg-secondary);
  border: 1px solid #222;
  border-radius: 12px;
  overflow: hidden;
}

.map-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: var(--bg-card);
  border-bottom: 1px solid #222;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.header-icon {
  color: #00d4aa;
}

.header-left h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #fff;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.location-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.speed-badge {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  background: #00d4aa22;
  color: #00d4aa;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 500;
}

.coords {
  color: #888;
  font-size: 12px;
  font-family: monospace;
}

.center-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: #252525;
  border: 1px solid #333;
  border-radius: 8px;
  color: #888;
  cursor: pointer;
  transition: all 0.2s;
}

.center-btn:hover {
  background: #333;
  color: #fff;
}

.map-wrapper {
  position: relative;
  height: 400px;
}

.map {
  width: 100%;
  height: 100%;
  background: var(--bg-card);
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(22, 22, 22, 0.9);
  z-index: 1000;
  color: #888;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #333;
  border-top-color: #00d4aa;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-overlay p {
  margin-top: 12px;
  font-size: 14px;
}

.map-legend {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 12px 16px;
  background: var(--bg-card);
  border-top: 1px solid #222;
  border-bottom: 1px solid #222;
}

.legend-title {
  font-size: 12px;
  font-weight: 600;
  color: #888;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.legend-items {
  display: flex;
  gap: 24px;
  flex-wrap: wrap;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #aaa;
}

.legend-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
}

.marker-container-mini {
  position: relative;
  width: 20px;
  height: 20px;
}

.marker-pulse-mini {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 20px;
  height: 20px;
  background: rgba(0, 212, 170, 0.3);
  border-radius: 50%;
  animation: marker-pulse 2s infinite;
}

.marker-dot-mini {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 10px;
  height: 10px;
  background: #00d4aa;
  border: 2px solid #fff;
  border-radius: 50%;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
}

.crash-marker-mini {
  width: 24px;
  height: 24px;
  background: #ef4444;
  border: 2px solid #fff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  box-shadow: 0 2px 8px rgba(239, 68, 68, 0.6);
}

.map-footer {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: var(--bg-card);
  border-top: 1px solid #222;
  color: #666;
  font-size: 12px;
  justify-content: space-between;
}

.crash-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.crash-indicator {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 6px;
  color: #ef4444;
  font-size: 11px;
  font-weight: 500;
}

.toggle-crash-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: #252525;
  border: 1px solid #333;
  border-radius: 6px;
  color: #888;
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.toggle-crash-btn:hover {
  background: #333;
  color: #fff;
  border-color: #444;
}

.toggle-crash-btn.hidden {
  background: rgba(239, 68, 68, 0.1);
  border-color: rgba(239, 68, 68, 0.3);
  color: #ef4444;
}

.toggle-crash-btn.hidden:hover {
  background: rgba(239, 68, 68, 0.2);
  border-color: rgba(239, 68, 68, 0.4);
}

.clear-crash-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 6px;
  color: #ef4444;
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.clear-crash-btn:hover {
  background: rgba(239, 68, 68, 0.25);
  border-color: rgba(239, 68, 68, 0.5);
  color: #ff5555;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

:deep(.custom-marker) {
  background: transparent;
  border: none;
}

:deep(.marker-container) {
  position: relative;
  width: 30px;
  height: 30px;
}

:deep(.marker-pulse) {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 30px;
  height: 30px;
  background: rgba(0, 212, 170, 0.3);
  border-radius: 50%;
  animation: marker-pulse 2s infinite;
}

:deep(.marker-dot) {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 14px;
  height: 14px;
  background: #00d4aa;
  border: 3px solid #fff;
  border-radius: 50%;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

@keyframes marker-pulse {
  0% {
    transform: translate(-50%, -50%) scale(1);
    opacity: 1;
  }
  100% {
    transform: translate(-50%, -50%) scale(2);
    opacity: 0;
  }
}

:deep(.crash-marker) {
  background: transparent;
  border: none;
}

:deep(.crash-marker-container) {
  position: relative;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
}

:deep(.crash-marker-icon) {
  width: 36px;
  height: 36px;
  background: #ef4444;
  border: 3px solid #fff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.6);
  animation: crash-pulse 1.5s infinite;
}

:deep(.crash-marker-icon svg) {
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.3));
}

@keyframes crash-pulse {
  0%, 100% {
    box-shadow: 0 4px 12px rgba(239, 68, 68, 0.6);
  }
  50% {
    box-shadow: 0 4px 20px rgba(239, 68, 68, 0.9);
  }
}

:deep(.crash-popup) {
  min-width: 200px;
}

:deep(.crash-popup-header) {
  padding-bottom: 8px;
  margin-bottom: 8px;
  border-bottom: 1px solid #444;
  color: #ef4444;
  font-size: 14px;
}

:deep(.crash-popup-body div) {
  margin-bottom: 4px;
  font-size: 12px;
  color: #ccc;
}

:deep(.crash-popup-body strong) {
  color: #fff;
  margin-right: 4px;
}

:deep(.leaflet-popup-content-wrapper) {
  background: #252525;
  color: #fff;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

:deep(.leaflet-popup-content) {
  margin: 12px;
  font-size: 13px;
  line-height: 1.5;
}

:deep(.leaflet-popup-tip) {
  background: #252525;
}

:deep(.leaflet-container) {
  font-family: inherit;
}

@media (max-width: 768px) {
  .map-header {
    flex-direction: column;
    gap: 10px;
    align-items: flex-start;
  }
  
  .header-right {
    width: 100%;
    justify-content: space-between;
  }
  
  .location-info {
    flex-wrap: wrap;
    gap: 8px;
  }
  
  .coords {
    display: none;
  }
  
  .map-legend {
    flex-direction: column;
    gap: 10px;
    align-items: flex-start;
  }
  
  .legend-items {
    gap: 16px;
  }
}

@media (max-width: 480px) {
  .map-wrapper {
    height: 300px;
  }
  
  .header-left h3 {
    font-size: 14px;
  }
  
  .map-legend {
    padding: 10px 12px;
  }
  
  .legend-title {
    font-size: 11px;
  }
  
  .legend-item {
    font-size: 11px;
  }
  
  .map-footer {
    flex-direction: column;
    gap: 8px;
    align-items: flex-start;
  }
}
</style>
