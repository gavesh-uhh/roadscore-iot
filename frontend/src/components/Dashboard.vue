<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { RotateCw } from 'lucide-vue-next'

import { api } from '../api'
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
const scoreAnimating = ref(false)
const previousScore = ref(85)
const drivingEvents = ref([])
const lastViolation = ref(null)
const showResetConfirm = ref(false)
const resetLoading = ref(false)

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

// Watch for score changes and animate
watch(driverScore, (newScore, oldScore) => {
  if (oldScore !== undefined && newScore !== oldScore) {
    previousScore.value = oldScore
    scoreAnimating.value = true

    // Add event based on score change
    const scoreDiff = newScore - oldScore
    const scoreEvent = getScoreChangeEvent(scoreDiff, newScore, lastViolation.value)

    drivingEvents.value.unshift(scoreEvent)
    if (drivingEvents.value.length > 10) {
      drivingEvents.value = drivingEvents.value.slice(0, 10)
    }

    // Clear last violation after using it
    if (scoreDiff < 0) {
      lastViolation.value = null
    }

    setTimeout(() => {
      scoreAnimating.value = false
    }, 600)
  }
})

// Watch for live data changes and add events
watch(() => [liveData.value.speed, liveData.value.vibration, liveData.value.soundDetected, liveData.value.acceleration, liveData.value.gyroscope], ([speed, vibration, sound, accel, gyro], [prevSpeed]) => {
  const events = []

  if (speed > 120) {
    lastViolation.value = { type: 'critical_speed', value: speed }
    events.push({
      id: Date.now(),
      timestamp: new Date(),
      type: 'danger',
      message: `Critical speed: ${speed} km/h - Reduce speed immediately`,
      reason: 'Excessive speed increases accident risk and reduces score significantly',
      icon: 'alert-triangle'
    })
  } else if (speed > 100) {
    lastViolation.value = { type: 'high_speed', value: speed }
    events.push({
      id: Date.now() + 1,
      timestamp: new Date(),
      type: 'warning',
      message: `High speed detected: ${speed} km/h`,
      reason: 'Speeding affects your safety score negatively',
      icon: 'alert-circle'
    })
  }

  // Check for harsh acceleration
  if (accel) {
    const accelMagnitude = Math.sqrt(
      Math.pow(accel.x || 0, 2) +
      Math.pow(accel.y || 0, 2) +
      Math.pow(accel.z || 0, 2)
    )
    if (accelMagnitude > 3.0) {
      lastViolation.value = { type: 'harsh_acceleration', value: accelMagnitude.toFixed(1) }
      events.push({
        id: Date.now() + 4,
        timestamp: new Date(),
        type: 'warning',
        message: `Harsh acceleration detected: ${accelMagnitude.toFixed(1)} m/s²`,
        reason: 'Sudden acceleration reduces driver score and passenger comfort',
        icon: 'alert-circle'
      })
    }
  }

  // Check for excessive tilting
  if (gyro) {
    if (Math.abs(gyro.pitch || 0) > 15) {
      lastViolation.value = { type: 'excessive_pitch', value: gyro.pitch.toFixed(1) }
      events.push({
        id: Date.now() + 5,
        timestamp: new Date(),
        type: 'danger',
        message: `Excessive pitch angle: ${gyro.pitch.toFixed(1)}°`,
        reason: 'Extreme vehicle tilting indicates dangerous driving behavior',
        icon: 'alert-triangle'
      })
    }
    if (Math.abs(gyro.roll || 0) > 15) {
      lastViolation.value = { type: 'excessive_roll', value: gyro.roll.toFixed(1) }
      events.push({
        id: Date.now() + 6,
        timestamp: new Date(),
        type: 'danger',
        message: `Excessive roll angle: ${gyro.roll.toFixed(1)}°`,
        reason: 'Sharp turns or rollover risk detected',
        icon: 'alert-triangle'
      })
    }
  }

  if (vibration) {
    lastViolation.value = { type: 'vibration', value: true }
    events.push({
      id: Date.now() + 2,
      timestamp: new Date(),
      type: 'warning',
      message: 'Abnormal vibration detected',
      reason: 'May indicate rough driving or road hazards',
      icon: 'waves'
    })
  }

  if (sound) {
    events.push({
      id: Date.now() + 3,
      timestamp: new Date(),
      type: 'info',
      message: 'Unusual sound detected',
      reason: 'Vehicle monitoring for potential issues',
      icon: 'volume-2'
    })
  }

  // Add events to the list
  events.forEach(event => {
    const exists = drivingEvents.value.some(e =>
      e.message === event.message &&
      (Date.now() - new Date(e.timestamp).getTime()) < 5000
    )
    if (!exists) {
      drivingEvents.value.unshift(event)
    }
  })

  // Keep only last 10 events
  if (drivingEvents.value.length > 10) {
    drivingEvents.value = drivingEvents.value.slice(0, 10)
  }
}, { deep: true })

function getScoreChangeEvent(change, currentScore, violation) {
  const event = {
    id: Date.now(),
    timestamp: new Date(),
    type: change > 0 ? 'improvement' : 'penalty',
    change: change,
    icon: change > 0 ? 'trend-up' : 'trend-down'
  }

  if (change > 0) {
    if (change >= 5) {
      event.message = `Excellent driving! +${change} points`
      event.reason = 'Consistent safe driving behavior rewarded'
    } else {
      event.message = `Good driving behavior +${change} points`
      event.reason = 'Maintaining safe driving practices'
    }
  } else {
    if (change <= -5) {
      if (violation) {
        event.message = `Major violation! ${change} points`
        event.reason = getViolationReason(violation)
      } else {
        event.message = `Major violation! ${change} points`
        event.reason = 'Severe driving behavior detected'
      }
    } else {
      if (violation) {
        event.message = `Poor driving behavior ${change} points`
        event.reason = getViolationReason(violation)
      } else {
        event.message = `Poor driving behavior ${change} points`
        event.reason = 'Unsafe driving detected'
      }
    }
  }

  return event
}

function getViolationReason(violation) {
  if (!violation) return 'Multiple safety violations detected'

  switch (violation.type) {
    case 'critical_speed':
      return `Critical speed violation: ${violation.value} km/h exceeds safe limits`
    case 'high_speed':
      return `Speeding detected at ${violation.value} km/h`
    case 'harsh_acceleration':
      return `Harsh acceleration: ${violation.value} m/s² detected`
    case 'excessive_pitch':
      return `Dangerous pitch angle: ${violation.value}° indicates aggressive braking or acceleration`
    case 'excessive_roll':
      return `Dangerous roll angle: ${violation.value}° indicates sharp cornering`
    case 'vibration':
      return 'Abnormal vibration indicates rough or reckless driving'
    default:
      return 'Safety violation detected'
  }
}

function getScoreChangeMessage(change, currentScore) {
  if (change > 0) {
    if (change >= 5) return `Excellent driving! +${change} points`
    return `Good driving behavior +${change} points`
  } else {
    if (change <= -5) return `Major violation! ${change} points`
    return `Poor driving behavior ${change} points`
  }
}

function formatEventTime(timestamp) {
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now - date

  if (diff < 60000) return 'Just now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

function openResetConfirm() {
  showResetConfirm.value = true
}

function closeResetConfirm() {
  showResetConfirm.value = false
}

async function confirmResetScore() {
  resetLoading.value = true
  try {
    const vehicleId = isAdmin.value ? selectedVehicleId.value : selectedVehicle.value?.id
    
    if (!vehicleId) {
      alert('No vehicle selected')
      return
    }
    
    await api.resetDriverScore(vehicleId)
    
    // Clear events list
    drivingEvents.value = []
    lastViolation.value = null
    
    // Show success message
    drivingEvents.value.unshift({
      id: Date.now(),
      timestamp: new Date(),
      type: 'info',
      message: 'Driver score reset successfully',
      reason: 'Score has been reset to 1000 points',
      icon: 'check-circle'
    })
    
    closeResetConfirm()
  } catch (error) {
    console.error('Failed to reset driver score:', error)
    alert('Failed to reset driver score: ' + error.message)
  } finally {
    resetLoading.value = false
  }
}

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
        :showVehicleSelector="isAdmin && currentSection === 'dashboard'"
        :vehicles="vehicles"
        :selectedVehicleId="selectedVehicleId"
        v-model:searchQuery="searchQuery"
        @update:selectedVehicleId="selectedVehicleId = $event"
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
        <div v-if="!isAdmin && !hasVehicleSelected" class="no-vehicle-message">
          <h2>No Vehicle Assigned</h2>
          <p>Please contact your administrator to assign a vehicle to your account.</p>
        </div>

        <div v-else-if="isAdmin && !hasVehicleSelected" class="no-vehicle-message">
          <h2>Select a Vehicle</h2>
          <p>Please select a vehicle from the dropdown above to monitor its live data.</p>
        </div>

        <template v-else>
          <div class="dashboard-layout">
            <div class="score-events-row">
              <div class="score-badge"
                   :class="[
                     driverScore >= 80 ? 'score-excellent' : driverScore >= 60 ? 'score-good' : 'score-poor',
                     { 'score-animating': scoreAnimating }
                   ]">
                <button class="reset-score-btn" @click="openResetConfirm" title="Reset Driver Score">
                  <RotateCw :size="18" />
                </button>
                <div class="score-value" :class="{ 'value-animating': scoreAnimating }">{{ driverScore }}</div>
                <div class="score-label">Driver Score</div>
                <div class="score-subtitle">Real-time Performance Rating</div>
              </div>

              <!-- Driving Events List -->
              <div class="events-section">
              <div class="events-header">
                <h3>Recent Driving Events</h3>
                <span class="events-count">{{ drivingEvents.length }} Events</span>
              </div>
              <div class="events-list" v-if="drivingEvents.length > 0">
                <div v-for="event in drivingEvents" :key="event.id" class="event-item" :class="`event-${event.type}`">
                  <div class="event-icon">
                    <svg v-if="event.type === 'improvement'" class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                    <svg v-else-if="event.type === 'penalty'" class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 17h8m0 0v-8m0 8l-8-8-4 4-6-6" />
                    </svg>
                    <svg v-else-if="event.type === 'danger'" class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <svg v-else-if="event.type === 'warning'" class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <svg v-else class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div class="event-content">
                    <div class="event-message">{{ event.message }}</div>
                    <div class="event-reason" v-if="event.reason">{{ event.reason }}</div>
                  </div>
                  <div class="event-time">{{ formatEventTime(event.timestamp) }}</div>
                </div>
              </div>
              <div class="events-empty" v-else>
                <p>No recent events. Drive safely!</p>
              </div>
            </div>
            </div>

            <div class="stats-below">
              <LiveStats :liveData="liveData" />
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

    <ConfirmModal
      :show="showResetConfirm"
      title="Reset Driver Score"
      message="Are you sure you want to reset the driver score to 1000? This will clear all score history for this vehicle."
      confirmText="Reset Score"
      :loading="resetLoading"
      variant="warning"
      @confirm="confirmResetScore"
      @cancel="closeResetConfirm"
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
  padding: 0;
}

.dashboard-layout {
  display: flex;
  flex-direction: column;
  gap: 16px;
  overflow-y: auto;
  padding: 16px 20px;
  padding-bottom: 24px;
}

.score-events-row {
  display: flex;
  gap: 20px;
  align-items: stretch;
  flex-shrink: 0;
}

.score-badge {
  position: relative;
  padding: 80px 90px;
  border-radius: 20px;
  background: linear-gradient(135deg, #0d1830 0%, #142040 50%, #0d1830 100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  min-width: 240px;
  box-shadow:
    0 10px 50px rgba(0, 0, 0, 0.6),
    0 0 20px rgba(245, 166, 35, 0.12),
    inset 0 1px 0 rgba(245, 166, 35, 0.1);
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid rgba(245, 166, 35, 0.2);
}

.score-badge::before {
  content: '';
  position: absolute;
  top: -2px;
  left: -2px;
  right: -2px;
  bottom: -2px;
  background: linear-gradient(135deg, transparent, transparent);
  border-radius: 25px;
  z-index: -1;
  transition: all 0.4s ease;
}

.reset-score-btn {
  position: absolute;
  top: 15px;
  right: 15px;
  width: 36px;
  height: 36px;
  border-radius: 8px;
  border: 1px solid rgba(245, 166, 35, 0.3);
  background: rgba(245, 166, 35, 0.1);
  color: #f5a623;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  z-index: 2;
}

.reset-score-btn:hover {
  background: rgba(245, 166, 35, 0.2);
  border-color: #f5a623;
  transform: rotate(90deg);
}

.reset-score-btn:active {
  transform: rotate(90deg) scale(0.95);
}

.score-badge.score-excellent::before {
  background: linear-gradient(135deg, #22c55e, #16a34a, #22c55e);
  opacity: 0.6;
}

.score-badge.score-good::before {
  background: linear-gradient(135deg, #f59e0b, #d97706, #f59e0b);
  opacity: 0.6;
}

.score-badge.score-poor::before {
  background: linear-gradient(135deg, #ef4444, #dc2626, #ef4444);
  opacity: 0.6;
}

/* Score change animation */
.score-badge.score-animating {
  animation: scoreChange 0.5s cubic-bezier(0.4, 0, 0.4, 1);
}

@keyframes scoreChange {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05) rotateZ(1deg);
  }
  100% {
    transform: scale(1);
  }
}

.score-value.value-animating {
  animation: valueFlash 0.6s ease-in-out;
}

@keyframes valueFlash {
  0%, 100% {
    opacity: 1;
    filter: drop-shadow(0 8px 24px rgba(245, 166, 35, 0.4));
  }
  50% {
    opacity: 0.7;
    filter: drop-shadow(0 0 40px rgba(245, 166, 35, 0.9));
  }
}

.score-value {
  font-size: 120px;
  font-weight: 900;
  background: linear-gradient(180deg, #ffffff 0%, #fef3c7 40%, #fcd34d 70%, #f5a623 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  line-height: 0.9;
  position: relative;
  z-index: 1;
  filter: drop-shadow(0 8px 24px rgba(245, 166, 35, 0.5));
  letter-spacing: -3px;
}

.score-label {
  font-size: 18px;
  font-weight: 700;
  color: #fcd34d;
  text-transform: uppercase;
  letter-spacing: 6px;
  position: relative;
  z-index: 1;
  opacity: 0.9;
  text-shadow: 0 2px 8px rgba(245, 166, 35, 0.4);
}

.score-subtitle {
  font-size: 12px;
  font-weight: 500;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 2px;
  margin-top: -8px;
}

/* Events Section */
.events-section {
  flex: 1;
  background: linear-gradient(135deg, #0d1830 0%, #142040 100%);
  border: 1px solid rgba(245, 166, 35, 0.2);
  border-radius: 16px;
  padding: 20px;
  margin: 0;
  min-width: 0;
}

.events-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid rgba(245, 166, 35, 0.2);
}

.events-header h3 {
  font-size: 18px;
  font-weight: 700;
  color: #fcd34d;
  margin: 0;
}

.events-count {
  font-size: 12px;
  font-weight: 600;
  color: #94a3b8;
  background: rgba(245, 166, 35, 0.12);
  padding: 4px 12px;
  border-radius: 12px;
}

.events-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 400px;
  overflow-y: auto;
  padding-right: 8px;
}

.events-list::-webkit-scrollbar {
  width: 4px;
}

.events-list::-webkit-scrollbar-track {
  background: transparent;
}

.events-list::-webkit-scrollbar-thumb {
  background: linear-gradient(135deg, #f5a623, #fbbf24);
  border-radius: 2px;
}

.event-item {
  display: flex;
  align-items: flex-start;
  gap: 15px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.02);
  border-left: 3px solid;
  border-radius: 8px;
  transition: all 0.2s ease;
  animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateX(-20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.event-item:hover {
  background: rgba(255, 255, 255, 0.05);
  transform: translateX(4px);
}

.event-improvement {
  border-left-color: #22c55e;
}

.event-penalty {
  border-left-color: #ef4444;
}

.event-danger {
  border-left-color: #ef4444;
  background: rgba(239, 68, 68, 0.05);
}

.event-warning {
  border-left-color: #f59e0b;
  background: rgba(245, 158, 11, 0.05);
}

.event-info {
  border-left-color: #f5a623;
}

.event-icon {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background: rgba(245, 166, 35, 0.1);
}

.event-improvement .event-icon {
  background: rgba(34, 197, 94, 0.15);
  color: #22c55e;
}

.event-penalty .event-icon {
  background: rgba(239, 68, 68, 0.15);
  color: #ef4444;
}

.event-danger .event-icon {
  background: rgba(239, 68, 68, 0.2);
  color: #ef4444;
}

.event-warning .event-icon {
  background: rgba(245, 158, 11, 0.15);
  color: #f59e0b;
}

.event-info .event-icon {
  background: rgba(245, 166, 35, 0.15);
  color: #f5a623;
}

.event-icon .icon {
  width: 20px;
  height: 20px;
}

.event-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.event-message {
  font-size: 14px;
  font-weight: 600;
  color: #e5e7eb;
  line-height: 1.4;
}

.event-reason {
  font-size: 12px;
  color: #94a3b8;
  line-height: 1.3;
}

.event-time {
  flex-shrink: 0;
  font-size: 11px;
  color: #94a3b8;
  font-weight: 500;
}

.events-empty {
  text-align: center;
  padding: 40px 20px;
  color: #94a3b8;
}

.events-empty p {
  font-size: 14px;
  margin: 0;
}

.stats-below {
  flex-shrink: 0;
  padding: 0 5px;
}

.charts-scroll {
  flex-shrink: 0;
  min-height: 400px;
  padding: 0 5px;
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
  color: #7a90b3;
  font-size: 16px;
}

@media (max-width: 768px) {
  .app-container {
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
  }

  .main-content {
    margin-left: 64px;
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
    overflow: hidden;
  }

  .dashboard-layout {
    gap: 12px;
  }

  .score-events-row {
    flex-direction: column;
  }

  .score-badge {
    padding: 24px 32px;
    min-width: unset;
    width: 100%;
    align-self: stretch;
  }

  .score-value {
    font-size: 80px;
    letter-spacing: -2px;
  }

  .score-label {
    font-size: 16px;
    letter-spacing: 4px;
  }

  .score-subtitle {
    font-size: 10px;
  }

  .events-section {
    padding: 15px;
  }

  .events-header h3 {
    font-size: 16px;
  }

  .events-list {
    max-height: 300px;
  }

  .event-item {
    padding: 10px;
  }

  .event-icon {
    width: 32px;
    height: 32px;
  }

  .event-message {
    font-size: 13px;
  }
}

@media (max-width: 480px) {
  .main-content {
    margin-left: 0;
    padding-bottom: 60px;
  }

  .content-area {
    padding: 10px;
  }

  .dashboard-layout {
    gap: 15px;
  }

  .score-badge {
    padding: 20px 24px;
    min-width: unset;
  }

  .score-value {
    font-size: 64px;
    letter-spacing: -1px;
  }

  .score-label {
    font-size: 14px;
    letter-spacing: 3px;
  }

  .score-subtitle {
    font-size: 9px;
  }

  .events-section {
    padding: 12px;
  }

  .events-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .events-header h3 {
    font-size: 14px;
  }

  .events-list {
    max-height: 250px;
  }

  .event-item {
    padding: 8px;
    gap: 8px;
  }

  .event-icon {
    width: 28px;
    height: 28px;
  }

  .event-icon .icon {
    width: 16px;
    height: 16px;
  }

  .event-message {
    font-size: 12px;
  }

  .event-reason {
    font-size: 11px;
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
