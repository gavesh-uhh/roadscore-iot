<script setup>
defineProps({
  currentSection: String,
  driverVehicles: Array,
  selectedVehicleId: String,
  selectedVehicle: Object
})

defineEmits(['change-section', 'update:selectedVehicleId'])

const tabs = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'vehicles', label: 'My Vehicles' },
  { id: 'trips', label: 'Live Map' }
]
</script>

<template>
  <nav class="driver-nav">
    <div class="tabs">
      <button 
        v-for="tab in tabs" 
        :key="tab.id"
        class="tab-btn"
        :class="{ active: currentSection === tab.id }"
        @click="$emit('change-section', tab.id)"
      >
        {{ tab.label }}
      </button>
    </div>
    
    <div v-if="driverVehicles.length > 1" class="vehicle-selector">
      <select 
        :value="selectedVehicleId"
        @change="$emit('update:selectedVehicleId', $event.target.value)"
        class="vehicle-select"
      >
        <option v-for="vehicle in driverVehicles" :key="vehicle.id" :value="vehicle.id">
          {{ vehicle.plateNumber }} - {{ vehicle.model }}
        </option>
      </select>
    </div>
  </nav>
  
  <div v-if="driverVehicles.length === 1" class="single-vehicle-badge">
    <span>Vehicle: {{ selectedVehicle?.plateNumber }} - {{ selectedVehicle?.model }}</span>
  </div>
</template>

<style scoped>
.driver-nav {
  display: flex;
  align-items: center;
  padding: 15px 25px;
  background: var(--bg-secondary);
  border-bottom: 1px solid #222;
}

.tabs {
  display: flex;
  gap: 5px;
}

.tab-btn {
  padding: 10px 20px;
  background: transparent;
  border: none;
  border-radius: 8px;
  color: #888;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
}

.tab-btn:hover {
  background: var(--bg-tertiary);
  color: #fff;
}

.tab-btn.active {
  background: #3b82f6;
  color: #fff;
}

.vehicle-selector {
  margin-left: auto;
}

.vehicle-select {
  padding: 10px 15px;
  background: var(--bg-tertiary);
  border: 1px solid #333;
  border-radius: 8px;
  color: #fff;
  font-size: 14px;
  cursor: pointer;
  outline: none;
  min-width: 200px;
}

.vehicle-select:hover,
.vehicle-select:focus {
  border-color: #3b82f6;
}

.single-vehicle-badge {
  padding: 10px 25px;
  background: var(--bg-secondary);
  border-bottom: 1px solid #222;
  color: #888;
  font-size: 13px;
}

.single-vehicle-badge span {
  background: var(--bg-tertiary);
  padding: 6px 12px;
  border-radius: 6px;
  color: #3b82f6;
}

@media (max-width: 768px) {
  .driver-nav {
    flex-direction: column;
    gap: 10px;
    padding: 15px;
  }
  
  .tabs {
    width: 100%;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }
  
  .tab-btn {
    padding: 8px 15px;
    font-size: 13px;
    white-space: nowrap;
  }
  
  .vehicle-selector {
    margin-left: 0;
    width: 100%;
  }
  
  .vehicle-select {
    width: 100%;
    min-width: auto;
  }
  
  .single-vehicle-badge {
    padding: 10px 15px;
  }
}

@media (max-width: 480px) {
  .driver-nav {
    padding: 10px;
  }
  
  .tab-btn {
    padding: 8px 12px;
    font-size: 12px;
  }
}
</style>
