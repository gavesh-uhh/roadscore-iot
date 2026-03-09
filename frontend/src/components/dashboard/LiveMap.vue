<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { MapPin, Navigation, RefreshCw } from 'lucide-vue-next'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Props
const props = defineProps({
  deviceId: {
    type: String,
    default: 'ESP32_001'
  },
  liveData: {
    type: Object,
    required: true
  }
})

// State
const mapContainer = ref(null)
const isLoading = ref(true)

let map = null
let marker = null

// Custom marker icon
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

// Initialize map
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

  // Add OpenStreetMap tiles
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19
  }).addTo(map)

  // Add marker
  marker = L.marker([lat, lng], {
    icon: createMarkerIcon()
  }).addTo(map)

  // Add popup
  updatePopup()
  
  isLoading.value = false
}

// Update marker popup
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

// Update marker position from live data
const updateMarker = () => {
  if (!marker || !map || !props.liveData?.gps) return
  
  const lat = props.liveData.gps.lat || 6.9271
  const lng = props.liveData.gps.lng || 79.8612
  
  marker.setLatLng([lat, lng])
  updatePopup()
}

// Center map on current location
const centerMap = () => {
  if (map && props.liveData?.gps) {
    map.setView([props.liveData.gps.lat, props.liveData.gps.lng], 15)
  }
}

// Format timestamp
const formatTime = () => {
  if (!props.liveData?.timestamp) return 'No data'
  const date = new Date(props.liveData.timestamp)
  return date.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit' 
  })
}

// Watch for live data updates
watch(() => props.liveData, () => {
  updateMarker()
}, { deep: true })

// Watch for device ID changes
watch(() => props.deviceId, () => {
  if (marker && map && props.liveData?.gps) {
    const lat = props.liveData.gps.lat || 6.9271
    const lng = props.liveData.gps.lng || 79.8612
    marker.setLatLng([lat, lng])
    map.setView([lat, lng], 15)
    updatePopup()
  }
})

onMounted(() => {
  initMap()
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
    
    <div class="map-footer">
      Last updated: {{ formatTime() }}
    </div>
  </div>
</template>

<style scoped>
.live-map-container {
  background: #161616;
  border: 1px solid #222;
  border-radius: 12px;
  overflow: hidden;
}

.map-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: #1a1a1a;
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
  background: #1a1a1a;
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

.map-footer {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: #1a1a1a;
  border-top: 1px solid #222;
  color: #666;
  font-size: 12px;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* Custom marker styles */
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

/* Leaflet popup customization */
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

/* Responsive */
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
}

@media (max-width: 480px) {
  .map-wrapper {
    height: 300px;
  }
  
  .header-left h3 {
    font-size: 14px;
  }
}
</style>
