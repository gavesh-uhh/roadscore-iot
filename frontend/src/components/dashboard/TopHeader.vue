<script setup>
import { Search, LogOut } from 'lucide-vue-next'
import AlertsPanel from './AlertsPanel.vue'

defineProps({
  title: String,
  userName: String,
  userId: String,
  isAdmin: Boolean,
  showSearch: Boolean,
  searchQuery: String,
  showLogout: {
    type: Boolean,
    default: false
  },
  vehicles: {
    type: Array,
    default: () => []
  },
  selectedVehicleId: String,
  showVehicleSelector: {
    type: Boolean,
    default: false
  }
})

defineEmits(['update:searchQuery', 'logout', 'update:selectedVehicleId'])
</script>

<template>
  <header class="top-header">
    <div class="header-left">
      <h1>{{ title }}</h1>
      <div v-if="showVehicleSelector" class="vehicle-selector-inline">
        <select 
          :value="selectedVehicleId" 
          @change="$emit('update:selectedVehicleId', $event.target.value)"
          class="vehicle-select-inline"
        >
          <option value="">-- Select Vehicle --</option>
          <option v-for="vehicle in vehicles" :key="vehicle.id" :value="vehicle.id">
            {{ vehicle.plateNumber }} - {{ vehicle.model }}
          </option>
        </select>
      </div>
    </div>
    <div class="header-right">
      <div class="search-box" v-if="showSearch">
        <Search :size="18" />
        <input 
          type="text" 
          :value="searchQuery"
          @input="$emit('update:searchQuery', $event.target.value)"
          placeholder="Search..." 
        />
      </div>
      <AlertsPanel :isAdmin="isAdmin" :userId="userId" />
      <div class="user-avatar">
        {{ userName?.charAt(0)?.toUpperCase() || 'U' }}
      </div>
      <button v-if="showLogout" class="icon-btn logout-btn" @click="$emit('logout')" title="Logout">
        <LogOut :size="20" />
      </button>
    </div>
  </header>
</template>

<style scoped>
.top-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 15px 25px;
  background: var(--bg-secondary);
  border-bottom: 1px solid #222;
}

.top-header h1 {
  font-size: 20px;
  font-weight: 600;
  color: #fff;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 20px;
}

.vehicle-selector-inline {
  display: flex;
  align-items: center;
}

.vehicle-select-inline {
  padding: 8px 15px;
  background: linear-gradient(135deg, #1a1f2e 0%, #252b3b 100%);
  border: 1px solid rgba(167, 139, 250, 0.3);
  border-radius: 8px;
  color: #fff;
  font-size: 14px;
  cursor: pointer;
  min-width: 250px;
  transition: all 0.2s ease;
}

.vehicle-select-inline option {
  background: #1a1f2e;
  color: #fff;
  padding: 8px;
}

.vehicle-select-inline option:hover {
  background: #252b3b;
}

.vehicle-select-inline:focus {
  outline: none;
  border-color: #8b5cf6;
  box-shadow: 0 0 0 2px rgba(139, 92, 246, 0.2);
}

.vehicle-select-inline:hover {
  border-color: rgba(167, 139, 250, 0.5);
}

.header-right {
  display: flex;
  align-items: center;
  gap: 15px;
}

.search-box {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--bg-tertiary);
  padding: 8px 15px;
  border-radius: 8px;
  color: #666;
}

.search-box input {
  background: none;
  border: none;
  color: #fff;
  outline: none;
  width: 180px;
}

.search-box input::placeholder {
  color: #555;
}

.icon-btn {
  background: var(--bg-tertiary);
  border: none;
  border-radius: 8px;
  color: #888;
  padding: 10px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.icon-btn:hover {
  background: #333;
  color: #fff;
}

.logout-btn:hover {
  background: #dc2626;
  color: #fff;
}

.user-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #3b82f6;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 14px;
  color: #fff;
}

@media (max-width: 768px) {
  .top-header {
    padding: 12px 15px;
  }
  
  .top-header h1 {
    font-size: 16px;
  }
  
  .header-left {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
  
  .vehicle-select-inline {
    min-width: 200px;
    font-size: 13px;
    padding: 6px 12px;
  }
  
  .header-right {
    gap: 8px;
  }
  
  .search-box {
    display: none;
  }
  
  .icon-btn {
    padding: 8px;
  }
  
  .user-avatar {
    width: 32px;
    height: 32px;
    font-size: 12px;
  }
}

@media (max-width: 480px) {
  .top-header h1 {
    font-size: 14px;
  }
}
</style>
