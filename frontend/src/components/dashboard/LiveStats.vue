<script setup>
import { Gauge, Navigation, Waves, Volume2, RotateCcw } from 'lucide-vue-next'

defineProps({
  liveData: Object
})
</script>

<template>
  <div class="stats-grid">
    <div class="stat-card">
      <div class="stat-icon blue">
        <Gauge :size="24" />
      </div>
      <div class="stat-info">
        <span class="stat-value">{{ liveData.speed }}</span>
        <span class="stat-label">Speed (km/h)</span>
      </div>
    </div>
    
    <div class="stat-card">
      <div class="stat-icon green">
        <Navigation :size="24" />
      </div>
      <div class="stat-info">
        <span class="stat-value">{{ liveData.gps.lat.toFixed(3) }}, {{ liveData.gps.lng.toFixed(3) }}</span>
        <span class="stat-label">GPS Location</span>
      </div>
    </div>
    
    <div class="stat-card">
      <div class="stat-icon" :class="liveData.vibration ? 'red' : 'gray'">
        <Waves :size="24" />
      </div>
      <div class="stat-info">
        <span class="stat-value">{{ liveData.vibration ? 'Alert' : 'Normal' }}</span>
        <span class="stat-label">Vibration</span>
      </div>
    </div>
    
    <div class="stat-card">
      <div class="stat-icon" :class="liveData.soundDetected ? 'red' : 'gray'">
        <Volume2 :size="24" />
      </div>
      <div class="stat-info">
        <span class="stat-value">{{ liveData.soundDetected ? 'Detected' : 'Normal' }}</span>
        <span class="stat-label">Sound</span>
      </div>
    </div>
    
    <div class="stat-card">
      <div class="stat-icon purple">
        <RotateCcw :size="24" />
      </div>
      <div class="stat-info">
        <span class="stat-value">{{ liveData.gyroscope.pitch.toFixed(1) }}°, {{ liveData.gyroscope.roll.toFixed(1) }}°</span>
        <span class="stat-label">Gyro (Pitch, Roll)</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.stats-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 20px;
  margin-bottom: 0;
}

.stat-card {
  background: linear-gradient(135deg, #1a1f2e 0%, #252b3b 100%);
  border: 1px solid rgba(167, 139, 250, 0.2);
  border-radius: 12px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 15px;
  transition: all 0.3s ease;
}

.stat-card:hover {
  border-color: rgba(167, 139, 250, 0.4);
  box-shadow: 0 4px 20px rgba(139, 92, 246, 0.15);
  transform: translateY(-2px);
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.stat-icon.blue { background: rgba(59, 130, 246, 0.2); color: #3b82f6; }
.stat-icon.green { 
  background: rgba(34, 197, 94, 0.2); 
  color: #22c55e;
}
.stat-icon.red { 
  background: rgba(239, 68, 68, 0.2); 
  color: #ef4444;
}
.stat-icon.purple { background: rgba(139, 92, 246, 0.2); color: #8b5cf6; }
.stat-icon.gray { background: var(--bg-tertiary); color: #666; }

.stat-info {
  display: flex;
  flex-direction: column;
}

.stat-value {
  font-size: 18px;
  font-weight: 700;
  color: #fff;
}

.stat-label {
  font-size: 12px;
  color: #666;
}

@media (max-width: 900px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 600px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 480px) {
  .stat-card {
    padding: 12px;
  }
  
  .stat-icon {
    width: 36px;
    height: 36px;
  }
  
  .stat-value {
    font-size: 16px;
  }
  
  .stat-label {
    font-size: 11px;
  }
}
</style>
