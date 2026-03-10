<script setup>
import { ref, onMounted, computed, watch } from 'vue'

import { useLiveData } from '../composables/useLiveData'
import { useCrud } from '../composables/useCrud'

import Sidebar from './dashboard/Sidebar.vue'
import TopHeader from './dashboard/TopHeader.vue'
import DriverNav from './dashboard/DriverNav.vue'
import LiveStats from './dashboard/LiveStats.vue'
import LiveCharts from './dashboard/LiveCharts.vue'
import DataCards from './dashboard/DataCards.vue'
import FormModal from './dashboard/FormModal.vue'
import FormFields from './dashboard/FormFields.vue'
import ConfirmModal from './dashboard/ConfirmModal.vue'
import LiveMap from './dashboard/LiveMap.vue'

const props = defineProps({ user: Object })
defineEmits(['logout'])

const userRole = computed(() => props.user?.role || 'driver')
const isAdmin = computed(() => userRole.value === 'admin')

const {
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
  startUpdates,
  stopUpdates
} = useLiveData()

const {
  users,
  vehicles,
  showModal,
  modalType,
  editingItem,
  loading,
  formData,
  searchQuery,
  selectedVehicleId,
  driverVehicles,
  selectedVehicle,
  filteredUsers,
  filteredVehicles,
  showConfirmModal,
  confirmLoading,
  pendingDelete,
  fetchAll,
  openModal,
  closeModal,
  saveItem,
  openDeleteConfirm,
  closeDeleteConfirm,
  confirmDelete
} = useCrud(
  computed(() => props.user),
  isAdmin
)

const currentSection = ref('dashboard')
const sidebarCollapsed = ref(false)

const chartsRef = ref(null)

const navLabels = {
  dashboard: 'Dashboard',
  vehicles: 'Vehicles',
  users: 'Users',
  trips: 'Live Map'
}

const userColumns = [
  { key: 'name', label: 'Name' },
  { key: 'email', label: 'Email' },
  { key: 'role', label: 'Role', badge: true, default: 'driver' }
]

const vehicleColumns = computed(() => [
  { key: 'plateNumber', label: 'Plate Number' },
  { key: 'model', label: 'Model' },
  { key: 'deviceId', label: 'Device ID' }
])

function changeSection(section) {
  currentSection.value = section
  searchQuery.value = ''
}

const hasVehicleSelected = computed(() => {
  if (isAdmin.value) {
    return selectedVehicleId.value && vehicles.value.length > 0
  }
  return driverVehicles.value.length > 0
})

watch(selectedVehicleId, (newId) => {
  if (isAdmin.value && newId) {
    startUpdates(chartsRef, newId, props.user?.uid)
  } else if (isAdmin.value && !newId) {
    stopUpdates()
  }
})

onMounted(async () => {
  await fetchAll()
  
  setTimeout(() => {
    if (hasVehicleSelected.value) {
      const vehicleId = isAdmin.value ? selectedVehicleId.value : selectedVehicle.value?.id
      startUpdates(chartsRef, vehicleId, props.user?.uid)
    }
  }, 200)
})
</script>

<template>
  <div class="app-container" :class="{ 'no-sidebar': !isAdmin }">
    <Sidebar
      v-if="isAdmin"
      :currentSection="currentSection"
      :collapsed="sidebarCollapsed"
      :userRole="userRole"
      @change-section="changeSection"
      @toggle-sidebar="sidebarCollapsed = !sidebarCollapsed"
      @logout="$emit('logout')"
    />
    
    <main class="main-content">
      <TopHeader
        :title="navLabels[currentSection]"
        :userName="user?.name"
        :userId="user?.uid"
        :isAdmin="isAdmin"
        :showSearch="currentSection !== 'dashboard' && currentSection !== 'trips'"
        :showLogout="!isAdmin"
        v-model:searchQuery="searchQuery"
        @logout="$emit('logout')"
      />
      
      <DriverNav
        v-if="!isAdmin"
        :currentSection="currentSection"
        :driverVehicles="driverVehicles"
        :selectedVehicleId="selectedVehicleId"
        :selectedVehicle="selectedVehicle"
        @change-section="changeSection"
        v-model:selectedVehicleId="selectedVehicleId"
      />
      
      <section v-if="currentSection === 'dashboard'" class="content-area dashboard-section">
        <div v-if="isAdmin" class="admin-vehicle-selector">
          <label>Select Vehicle to Monitor:</label>
          <select v-model="selectedVehicleId" class="vehicle-select">
            <option value="">-- Select a Vehicle --</option>
            <option v-for="vehicle in vehicles" :key="vehicle.id" :value="vehicle.id">
              {{ vehicle.plateNumber }} - {{ vehicle.model }}
            </option>
          </select>
        </div>
        
        <div v-if="!isAdmin && !hasVehicleSelected" class="no-vehicle-message">
          <h2>No Vehicle Assigned</h2>
          <p>Please contact your administrator to assign a vehicle to your account.</p>
        </div>
        
        <div v-else-if="isAdmin && !hasVehicleSelected" class="no-vehicle-message">
          <h2>Select a Vehicle</h2>
          <p>Please select a vehicle from the dropdown above to monitor its live data.</p>
        </div>
        
        <template v-else>
          <div class="stats-fixed">
            <LiveStats :liveData="liveData" :driverScore="driverScore" />
          </div>
          <div class="charts-scroll">
            <LiveCharts
              ref="chartsRef"
              :speedHistory="speedHistory"
              :accelXHistory="accelXHistory"
              :accelYHistory="accelYHistory"
              :accelZHistory="accelZHistory"
              :gyroPitchHistory="gyroPitchHistory"
              :gyroRollHistory="gyroRollHistory"
              :gyroYawHistory="gyroYawHistory"
              :timeLabels="timeLabels"
            />
          </div>
        </template>
      </section>
      
      <section v-if="currentSection === 'users'" class="content-area">
        <DataCards
          title="Manage Users"
          :items="filteredUsers"
          :columns="userColumns"
          :canAdd="isAdmin"
          :canEdit="isAdmin"
          :canDelete="isAdmin"
          @add="openModal('user')"
          @edit="(item) => openModal('user', item)"
          @delete="(item) => openDeleteConfirm('user', item.id, item.name)"
        />
      </section>
      
      <section v-if="currentSection === 'vehicles'" class="content-area">
        <DataCards
          title="Manage Vehicles"
          :items="filteredVehicles"
          :columns="vehicleColumns"
          :canAdd="isAdmin"
          :canEdit="isAdmin"
          :canDelete="isAdmin"
          @add="openModal('vehicle')"
          @edit="(item) => openModal('vehicle', item)"
          @delete="(item) => openDeleteConfirm('vehicle', item.id, item.plateNumber)"
        />
      </section>
      
      <section v-if="currentSection === 'trips'" class="content-area">
        <LiveMap 
          :deviceId="selectedVehicle?.deviceId"
          :liveData="liveData"
          :vehicleId="selectedVehicle?.id || selectedVehicleId"
        />
      </section>
    </main>
    
    <FormModal
      :show="showModal"
      :title="(editingItem ? 'Edit ' : 'Add ') + modalType.charAt(0).toUpperCase() + modalType.slice(1)"
      :loading="loading"
      @close="closeModal"
      @save="saveItem"
    >
      <FormFields
        :type="modalType"
        :formData="formData"
        :isEdit="editingItem !== null"
        :users="users"
        :isAdmin="isAdmin"
        @update:formData="formData = $event"
      />
    </FormModal>
    
    <ConfirmModal
      :show="showConfirmModal"
      title="Delete Item"
      :message="`Are you sure you want to delete '${pendingDelete.name || 'this item'}'? This action cannot be undone.`"
      confirmText="Delete"
      :loading="confirmLoading"
      variant="danger"
      @confirm="confirmDelete"
      @cancel="closeDeleteConfirm"
    />
  </div>
</template>

<style scoped>
.app-container {
  display: flex;
  height: 100vh;
  overflow: hidden;
  background: var(--bg-primary);
  color: #fff;
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.content-area {
  flex: 1;
  padding: 25px;
  overflow-y: auto;
  overflow-x: hidden;
}

.dashboard-section {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.admin-vehicle-selector {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 15px 20px;
  background: var(--bg-card);
  border-radius: 10px;
  margin-bottom: 20px;
}

.admin-vehicle-selector label {
  color: #888;
  font-size: 14px;
  white-space: nowrap;
}

.admin-vehicle-selector .vehicle-select {
  flex: 1;
  max-width: 400px;
  padding: 10px 15px;
  background: var(--bg-tertiary);
  border: 1px solid #333;
  border-radius: 8px;
  color: #fff;
  font-size: 14px;
  cursor: pointer;
}

.admin-vehicle-selector .vehicle-select:focus {
  outline: none;
  border-color: #3b82f6;
}

.stats-fixed {
  flex-shrink: 0;
}

.charts-scroll {
  flex: 1;
  overflow-y: auto;
  padding-top: 20px;
}

.no-vehicle-message {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  text-align: center;
  padding: 40px;
}

.no-vehicle-message h2 {
  color: #fff;
  font-size: 24px;
  margin-bottom: 10px;
}

.no-vehicle-message p {
  color: #888;
  font-size: 16px;
}

@media (max-width: 768px) {
  .app-container {
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
  }
  
  .main-content {
    margin-left: 70px;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
  }
  
  .no-sidebar .main-content {
    margin-left: 0;
  }
  
  .content-area {
    padding: 15px;
    overflow: visible;
  }
  
  .dashboard-section {
    overflow: visible;
  }
  
  .charts-scroll {
    overflow: visible;
  }
  
  .admin-vehicle-selector {
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
  }
  
  .admin-vehicle-selector .vehicle-select {
    max-width: none;
  }
}

@media (max-width: 480px) {
  .main-content {
    margin-left: 60px;
  }
  
  .content-area {
    padding: 10px;
  }
  
  .no-vehicle-message {
    padding: 20px;
  }
  
  .no-vehicle-message h2 {
    font-size: 18px;
  }
  
  .no-vehicle-message p {
    font-size: 14px;
  }
}
</style>
