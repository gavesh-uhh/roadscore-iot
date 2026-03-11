<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { RotateCw } from 'lucide-vue-next'

import { useLiveData } from '../composables/useLiveData'
import { useCrud } from '../composables/useCrud'
import { api } from '../api'

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
  scores,
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
  confirmDelete,
  resetScore,
  updateScore
} = useCrud(
  computed(() => props.user),
  isAdmin
)

const currentSection = ref('dashboard')
const sidebarCollapsed = ref(false)
const scoreAnimating = ref(false)
const previousScore = ref(null)
const drivingEvents = ref([])

const chartsRef = ref(null)

const navLabels = {
  dashboard: 'Dashboard',
  vehicles: 'Vehicles',
  users: 'Users',
  scores: 'Scores',
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

const showScoreResetConfirm = ref(false)
const scoreResetTarget = ref(null)
const scoreResetLoading = ref(false)
const editingScore = ref(null)
const editScoreValue = ref(1000)

// Dashboard reset variables
const showResetConfirm = ref(false)
const resetLoading = ref(false)

const scoresWithVehicle = computed(() => {
  return scores.value.map(s => {
    const vehicle = vehicles.value.find(v => v.id === s.vehicleId)
    return { ...s, plateNumber: vehicle?.plateNumber || '-', model: vehicle?.model || '-' }
  })
})

const filteredScores = computed(() => {
  if (!searchQuery.value) return scoresWithVehicle.value
  const q = searchQuery.value.toLowerCase()
  return scoresWithVehicle.value.filter(s =>
    s.vehicleId?.toLowerCase().includes(q) ||
    s.plateNumber?.toLowerCase().includes(q) ||
    s.model?.toLowerCase().includes(q)
  )
})

function openScoreReset(score) {
  scoreResetTarget.value = score
  showScoreResetConfirm.value = true
}

async function confirmScoreReset() {
  if (!scoreResetTarget.value) return
  scoreResetLoading.value = true
  await resetScore(scoreResetTarget.value.vehicleId)
  scoreResetLoading.value = false
  showScoreResetConfirm.value = false
  scoreResetTarget.value = null
}

function startEditScore(score) {
  editingScore.value = score.vehicleId
  editScoreValue.value = score.currentScore
}

function cancelEditScore() {
  editingScore.value = null
}

async function saveEditScore(vehicleId) {
  await updateScore(vehicleId, editScoreValue.value)
  editingScore.value = null
}

// Dashboard reset functions
function openResetConfirm() {
  showResetConfirm.value = true
}

async function confirmResetScore() {
  const vehicleId = isAdmin.value ? selectedVehicleId.value : selectedVehicle.value?.id
  if (!vehicleId) return
  
  resetLoading.value = true
  await resetScore(vehicleId)
  resetLoading.value = false
  showResetConfirm.value = false
}

function closeResetConfirm() {
  showResetConfirm.value = false
}

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

let eventsInterval = null

watch(selectedVehicleId, (newId) => {
  if (isAdmin.value && newId) {
    startUpdates(chartsRef, newId, props.user?.uid)
    fetchDrivingEvents(newId)
    clearInterval(eventsInterval)
    eventsInterval = setInterval(() => fetchDrivingEvents(newId), 5000)
  } else if (isAdmin.value && !newId) {
    stopUpdates()
    clearInterval(eventsInterval)
  }
})

// Watch for score changes and animate
watch(driverScore, (newScore, oldScore) => {
  if (oldScore !== null && oldScore !== undefined && newScore !== oldScore) {
    previousScore.value = oldScore
    scoreAnimating.value = true

    setTimeout(() => {
      scoreAnimating.value = false
    }, 600)
  }
})

// Fetch recentEvents from drivingBehavior and join with alerts by timestamp
async function fetchDrivingEvents(vehicleId) {
  if (!vehicleId) return
  try {
    const [behavior, alerts] = await Promise.all([
      api.getDrivingBehavior(vehicleId),
      isAdmin.value ? api.getAlerts() : api.getUserAlerts(props.user?.uid)
    ])

    const recentEvents = behavior?.recentEvents || []
    // Index alerts by timestamp for O(1) lookup
    const alertsByTimestamp = {}
    for (const alert of (alerts || [])) {
      if (!alertsByTimestamp[alert.timestamp]) {
        alertsByTimestamp[alert.timestamp] = []
      }
      alertsByTimestamp[alert.timestamp].push(alert)
    }

    // Deduplicate by composite key: type+timestamp+message+value
    const seen = new Set()
    drivingEvents.value = recentEvents
      .sort((a, b) => b.timestamp - a.timestamp)
      .filter(event => {
        const key = event.type + '_' + event.timestamp + '_' + (event.message || '') + '_' + (event.value || '')
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
      .slice(0, 10)
      .map((event, i) => {
        const matchedAlert = (alertsByTimestamp[event.timestamp] || [])
          .find(a => a.vehicleId === vehicleId)
        return {
          id: event.timestamp + i,
          timestamp: event.timestamp,
          type: mapSeverityToType(matchedAlert?.severity),
          message: matchedAlert?.message || event.type,
          reason: matchedAlert ? `Severity: ${matchedAlert.severity}` : null,
          location: event.location,
          rawData: event.rawData,
          acknowledged: matchedAlert?.acknowledged || false
        }
      })
  } catch (e) {
    console.error('Failed to fetch driving events:', e)
  }
}

function mapSeverityToType(severity) {
  switch (severity) {
    case 'high': return 'danger'
    case 'medium': return 'warning'
    case 'low': return 'info'
    case 'positive': return 'success'
    default: return 'warning'
  }
}

function clearDrivingEvents() {
  drivingEvents.value = []
}

function formatEventTime(timestamp) {
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now - date

  if (diff < 60000) return 'Just now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

onMounted(async () => {
  await fetchAll()

  setTimeout(() => {
    if (hasVehicleSelected.value) {
      const vehicleId = isAdmin.value ? selectedVehicleId.value : selectedVehicle.value?.id
      startUpdates(chartsRef, vehicleId, props.user?.uid)
      fetchDrivingEvents(vehicleId)
      eventsInterval = setInterval(() => fetchDrivingEvents(vehicleId), 1000)
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
                     driverScore >= 800 ? 'score-excellent' : driverScore >= 600 ? 'score-good' : 'score-poor',
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
                <div class="events-header-actions">
                  <span class="events-count">{{ drivingEvents.length }} Events</span>
                  <button v-if="drivingEvents.length > 0" class="events-clear-btn" @click="clearDrivingEvents">Clear</button>
                </div>
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

      <section v-if="currentSection === 'scores'" class="content-area">
        <div class="admin-section">
          <div class="section-header">
            <h2>Manage Scores</h2>
          </div>
          <div class="cards-grid">
            <div v-for="score in filteredScores" :key="score.vehicleId" class="card">
              <div class="card-icon score-icon">
                <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div class="card-content">
                <div class="card-field">
                  <span class="field-label">Vehicle:</span>
                  <span class="field-value">{{ score.plateNumber }} - {{ score.model }}</span>
                </div>
                <div class="card-field">
                  <span class="field-label">Vehicle ID:</span>
                  <span class="field-value">{{ score.vehicleId }}</span>
                </div>
                <div class="card-field">
                  <span class="field-label">Current Score:</span>
                  <template v-if="editingScore === score.vehicleId">
                    <input
                      type="number"
                      v-model.number="editScoreValue"
                      min="0"
                      max="1000"
                      class="score-input"
                      @keyup.enter="saveEditScore(score.vehicleId)"
                      @keyup.escape="cancelEditScore"
                    />
                  </template>
                  <span v-else class="badge" :class="score.currentScore >= 800 ? 'badge-good' : score.currentScore >= 500 ? 'badge-warn' : 'badge-bad'">
                    {{ score.currentScore }}
                  </span>
                </div>
                <div class="card-field">
                  <span class="field-label">Average:</span>
                  <span class="field-value">{{ score.averageScore ?? '-' }}</span>
                </div>
                <div class="card-field">
                  <span class="field-label">Trips:</span>
                  <span class="field-value">{{ score.totalTrips || 0 }}</span>
                </div>
              </div>
              <div class="card-actions score-actions">
                <template v-if="editingScore === score.vehicleId">
                  <button class="icon-btn small" @click="saveEditScore(score.vehicleId)" title="Save">
                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                  </button>
                  <button class="icon-btn small" @click="cancelEditScore" title="Cancel">
                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                  </button>
                </template>
                <template v-else>
                  <button class="icon-btn small" @click="startEditScore(score)" title="Edit Score">
                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                  </button>
                  <button class="icon-btn small danger" @click="openScoreReset(score)" title="Reset to 1000">
                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                  </button>
                </template>
              </div>
            </div>
            <div v-if="filteredScores.length === 0" class="empty-state">
              <p>No scores found</p>
            </div>
          </div>
        </div>

        <ConfirmModal
          :show="showScoreResetConfirm"
          title="Reset Score"
          :message="`Reset the score for '${scoreResetTarget?.plateNumber || scoreResetTarget?.vehicleId}' back to 1000? This will also clear trips and average.`"
          confirmText="Reset"
          :loading="scoreResetLoading"
          variant="danger"
          @confirm="confirmScoreReset"
          @cancel="showScoreResetConfirm = false"
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
  position: relative;
}

.app-container.no-sidebar .main-content {
  margin-left: 0;
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 0;
}

.content-area {
  flex: 1;
  padding: 25px;
  overflow-y: auto;
  overflow-x: hidden;
  min-height: 0;
  box-sizing: border-box;
}

.dashboard-section {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 0;
  height: 100%;
}

.dashboard-layout {
  display: flex;
  flex-direction: column;
  gap: 16px;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 16px 20px;
  padding-bottom: 24px;
  flex: 1;
  min-height: 0;
  box-sizing: border-box;
}

.score-events-row {
  display: flex;
  gap: 20px;
  align-items: flex-start;
  flex-shrink: 0;
  width: 100%;
  box-sizing: border-box;
}

.score-badge {
  position: relative;
  padding: 40px 90px;
  border-radius: 20px;
  background: linear-gradient(135deg, #0d1830 0%, #142040 50%, #0d1830 100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-width: 240px;
  height: 350px;
  box-sizing: border-box;
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
  max-height: 350px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-sizing: border-box;
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

.events-header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.events-clear-btn {
  font-size: 12px;
  font-weight: 600;
  color: #ef4444;
  background: rgba(239, 68, 68, 0.1);
  border: none;
  padding: 4px 12px;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.events-clear-btn:hover {
  background: rgba(239, 68, 68, 0.25);
  color: #f87171;
}

.events-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex: 1;
  overflow-y: auto;
  padding-right: 8px;
  min-height: 0;
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

/* Mobile Responsiveness */
@media (max-width: 768px) {
  .app-container {
    overflow: hidden;
  }

  .main-content {
    overflow: hidden;
    position: relative;
    margin-left: 64px;
  }

  .app-container.no-sidebar .main-content {
    margin-left: 0;
  }

  .content-area {
    padding: 12px;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
  }

  .dashboard-section {
    overflow: hidden;
    height: 100%;
  }

  .dashboard-layout {
    gap: 12px;
    padding: 12px;
    overflow-y: auto;
    overflow-x: hidden;
    -webkit-overflow-scrolling: touch;
  }

  .score-events-row {
    flex-direction: column;
    gap: 12px;
    width: 100%;
  }

  .score-badge {
    padding: 30px 40px;
    min-width: unset;
    width: 100%;
    max-width: 100%;
    height: auto;
    min-height: 250px;
    align-self: stretch;
    box-sizing: border-box;
  }

  .reset-score-btn {
    top: 10px;
    right: 10px;
    width: 32px;
    height: 32px;
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
    max-height: none;
    height: auto;
    min-height: 250px;
    width: 100%;
    max-width: 100%;
    box-sizing: border-box;
  }

  .events-header h3 {
    font-size: 16px;
  }

  .events-list {
    max-height: none;
  }

  .event-item {
    padding: 12px;
    gap: 10px;
  }

  .event-icon {
    width: 32px;
    height: 32px;
  }

  .event-message {
    font-size: 13px;
  }

  .stats-below {
    padding: 0;
  }

  .charts-scroll {
    min-height: 300px;
    padding: 0;
  }
}

@media (max-width: 480px) {
  .app-container {
    height: 100vh;
    overflow: hidden;
    position: relative;
  }

  .main-content {
    margin-left: 0;
    overflow: hidden;
    padding-bottom: 60px;
  }

  .app-container.no-sidebar .main-content {
    padding-bottom: 0;
  }

  .content-area {
    padding: 8px;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
    height: 100%;
  }

  .dashboard-section {
    overflow: hidden;
    height: 100%;
  }

  .dashboard-layout {
    gap: 10px;
    padding: 10px;
    overflow-y: auto;
    overflow-x: hidden;
    -webkit-overflow-scrolling: touch;
  }

  .score-events-row {
    gap: 10px;
    width: 100%;
    max-width: 100%;
  }

  .score-badge {
    padding: 20px 20px;
    min-width: unset;
    width: 100%;
    max-width: 100%;
    height: auto;
    min-height: 220px;
    box-sizing: border-box;
  }

  .reset-score-btn {
    top: 8px;
    right: 8px;
    width: 28px;
    height: 28px;
  }

  .reset-score-btn svg {
    width: 14px;
    height: 14px;
  }

  .score-value {
    font-size: 72px;
    letter-spacing: -1px;
  }

  .score-label {
    font-size: 13px;
    letter-spacing: 2px;
  }

  .score-subtitle {
    font-size: 9px;
    letter-spacing: 1px;
  }

  .events-section {
    padding: 12px;
    height: auto;
    max-height: none;
    min-height: 200px;
    width: 100%;
    max-width: 100%;
    box-sizing: border-box;
  }

  .events-header {
    flex-direction: row;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;
    padding-bottom: 10px;
  }

  .events-header h3 {
    font-size: 14px;
  }

  .events-count {
    font-size: 11px;
    padding: 3px 10px;
  }

  .events-list {
    max-height: none;
    gap: 8px;
  }

  .event-item {
    padding: 10px;
    gap: 10px;
  }

  .event-icon {
    width: 30px;
    height: 30px;
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

  .event-time {
    font-size: 10px;
  }

  .stats-below {
    padding: 0;
  }

  .charts-scroll {
    min-height: 250px;
    padding: 0;
  }

  .no-vehicle-message {
    padding: 20px;
  }

  .no-vehicle-message h2 {
    font-size: 20px;
  }

  .no-vehicle-message p {
    font-size: 14px;
  }
}

.score-icon {
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
  color: #fff;
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 5px;
  flex-shrink: 0;
}

.score-input {
  width: 80px;
  padding: 4px 8px;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  font-size: 14px;
  outline: none;
}

.score-input:focus {
  border-color: #3b82f6;
}

.score-actions {
  gap: 6px;
}

.badge-good {
  background: rgba(34, 197, 94, 0.15);
  color: #22c55e;
}

.badge-warn {
  background: rgba(234, 179, 8, 0.15);
  color: #eab308;
}

.badge-bad {
  background: rgba(239, 68, 68, 0.15);
  color: #ef4444;
}

/* Scores section card styles */
.admin-section {
  width: 100%;
}

.admin-section .section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 25px;
}

.admin-section .section-header h2 {
  font-size: 18px;
  font-weight: 600;
  color: #fff;
}

.cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

.card {
  background: var(--bg-secondary);
  border: 1px solid #1a2d50;
  border-radius: 12px;
  padding: 20px;
  transition: all 0.2s ease;
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.card:hover {
  border-color: #243a6e;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.card-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.card-field {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.field-label {
  font-size: 12px;
  color: #7a90b3;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  min-width: 100px;
}

.field-value {
  font-size: 14px;
  color: #fff;
  font-weight: 500;
}

.badge {
  padding: 4px 12px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  border: 1px solid transparent;
}

.card-actions {
  display: flex;
  gap: 8px;
  padding-top: 10px;
  border-top: 1px solid #1a2d50;
}

.icon-btn {
  background: var(--bg-tertiary, #0f1d36);
  border: none;
  border-radius: 8px;
  color: #7a90b3;
  padding: 10px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
}

.icon-btn:hover {
  background: #1e3566;
  color: #fff;
}

.icon-btn.small {
  padding: 8px;
}

.icon-btn.danger:hover {
  background: #dc2626;
  color: #fff;
}

.empty-state {
  grid-column: 1 / -1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: #555;
  gap: 15px;
}

.empty-state p {
  font-size: 16px;
  margin: 0;
}

@media (max-width: 768px) {
  .cards-grid {
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: 15px;
  }

  .card {
    padding: 16px;
  }
}

@media (max-width: 480px) {
  .cards-grid {
    grid-template-columns: 1fr;
  }

  .field-label {
    min-width: 70px;
    font-size: 11px;
  }

  .field-value {
    font-size: 13px;
  }
}
</style>
