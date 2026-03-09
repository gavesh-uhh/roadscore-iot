<script setup>
import { Gauge, Navigation, Waves, Volume2, RotateCcw, Trophy } from 'lucide-vue-next'

defineProps({
  liveData: Object,
  driverScore: Number
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
    
    <div class="stat-card driver-score-card" :class="driverScore >= 80 ? 'score-excellent' : driverScore >= 60 ? 'score-good' : 'score-poor'">
      <div class="stat-icon-large" :class="driverScore >= 80 ? 'green' : driverScore >= 60 ? 'yellow' : 'red'">
        <Trophy :size="32" />
      </div>
      <div class="stat-info-large">
        <span class="stat-value-large">{{ driverScore }}</span>
        <span class="stat-label-large">Driver Score</span>
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
  grid-template-columns: repeat(6, 1fr);
  gap: 20px;
  margin-bottom: 25px;
}

.stat-card {
  background: #161616;
  border: 1px solid #222;
  border-radius: 12px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 15px;
}

.driver-score-card {
  background: linear-gradient(135deg, #1a1a1a 0%, #202020 100%);
  border: 2px solid;
  padding: 24px;
  position: relative;
  overflow: hidden;
  transition: all 0.3s ease;
}

.driver-score-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: radial-gradient(circle at top right, rgba(255, 255, 255, 0.05), transparent);
  pointer-events: none;
}

.driver-score-card.score-excellent {
  border-color: #22c55e;
  box-shadow: 0 0 20px rgba(34, 197, 94, 0.3);
}

.driver-score-card.score-good {
  border-color: #f59e0b;
  box-shadow: 0 0 20px rgba(245, 158, 11, 0.3);
}

.driver-score-card.score-poor {
  border-color: #ef4444;
  box-shadow: 0 0 20px rgba(239, 68, 68, 0.3);
}

.driver-score-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 30px rgba(255, 255, 255, 0.1);
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.stat-icon-large {
  width: 64px;
  height: 64px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  z-index: 1;
}

.stat-icon.blue { background: rgba(59, 130, 246, 0.2); color: #3b82f6; }
.stat-icon.green, .stat-icon-large.green { 
  background: rgba(34, 197, 94, 0.2); 
  color: #22c55e;
}
.stat-icon.yellow, .stat-icon-large.yellow { 
  background: rgba(245, 158, 11, 0.2); 
  color: #f59e0b;
}
.stat-icon.red, .stat-icon-large.red { 
  background: rgba(239, 68, 68, 0.2); 
  color: #ef4444;
}
.stat-icon.purple { background: rgba(139, 92, 246, 0.2); color: #8b5cf6; }
.stat-icon.gray { background: #222; color: #666; }

.stat-info {
  display: flex;
  flex-direction: column;
}

.stat-info-large {
  display: flex;
  flex-direction: column;
  position: relative;
  z-index: 1;
}

.stat-value {
  font-size: 18px;
  font-weight: 700;
  color: #fff;
}

.stat-value-large {
  font-size: 32px;
  font-weight: 800;
  color: #fff;
  line-height: 1;
  margin-bottom: 6px;
}

.stat-label {
  font-size: 12px;
  color: #666;
}

.stat-label-large {
  font-size: 14px;
  font-weight: 600;
  color: #888;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

@media (max-width: 900px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .stat-value-large {
    font-size: 28px;
  }
  
  .stat-icon-large {
    width: 56px;
    height: 56px;
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
  
  .driver-score-card {
    padding: 16px;
  }
  
  .stat-icon {
    width: 36px;
    height: 36px;
  }
  
  .stat-icon-large {
    width: 48px;
    height: 48px;
  }
  
  .stat-value {
    font-size: 16px;
  }
  
  .stat-value-large {
    font-size: 24px;
  }
  
  .stat-label {
    font-size: 11px;
  }
  
  .stat-label-large {
    font-size: 12px;
  }
}
</style>
