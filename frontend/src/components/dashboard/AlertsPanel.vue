<script setup>
import { ref, onMounted, computed } from 'vue'
import { AlertTriangle, Bell, BellOff, X, Check, Trash2 } from 'lucide-vue-next'
import { api } from '../../api'
import { useAlertEvents } from '../../composables/useAlertEvents'

const props = defineProps({
  isAdmin: Boolean,
  userId: String
})

const { alertUpdateTrigger, triggerAlertRefresh } = useAlertEvents()

const alerts = ref([])
const loading = ref(false)
const showPanel = ref(false)

const unacknowledgedCount = computed(() => {
  return alerts.value.filter(a => !a.acknowledged).length
})

const sortedAlerts = computed(() => {
  return [...alerts.value].sort((a, b) => b.timestamp - a.timestamp)
})

async function fetchAlerts() {
  if (!props.isAdmin) return
  loading.value = true
  try {
    alerts.value = await api.getAlerts()
  } catch (e) {
    console.error('Failed to fetch alerts:', e)
  }
  loading.value = false
}

async function acknowledgeAlert(alert) {
  try {
    await api.acknowledgeAlert(alert.id)
    alert.acknowledged = true
    alert.acknowledgedAt = Date.now()
    triggerAlertRefresh('acknowledge')
  } catch (e) {
    console.error('Failed to acknowledge alert:', e)
  }
}

async function deleteAlert(alert) {
  try {
    await api.deleteAlert(alert.id)
    alerts.value = alerts.value.filter(a => a.id !== alert.id)
    triggerAlertRefresh('delete')
  } catch (e) {
    console.error('Failed to delete alert:', e)
  }
}

async function clearAllAlerts() {
  try {
    await api.deleteAllAlerts()
    alerts.value = []
    triggerAlertRefresh('clear_all')
  } catch (e) {
    console.error('Failed to clear all alerts:', e)
  }
}

function togglePanel() {
  showPanel.value = !showPanel.value
}

function getSeverityClass(severity) {
  switch (severity) {
    case 'high': return 'severity-high'
    case 'medium': return 'severity-medium'
    case 'low': return 'severity-low'
    default: return 'severity-medium'
  }
}

function getAlertIcon(type) {
  return AlertTriangle
}

function formatTime(timestamp) {
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now - date

  if (diff < 60000) return 'Just now'
  if (diff < 3600000) return Math.floor(diff / 60000) + 'm ago'
  if (diff < 86400000) return Math.floor(diff / 3600000) + 'h ago'
  return date.toLocaleDateString()
}

onMounted(() => {
  fetchAlerts()
  setInterval(fetchAlerts, 3000)
})
</script>

<template>
  <div v-if="isAdmin" class="alerts-container">
    <button class="alert-bell" @click="togglePanel" :class="{ 'has-alerts': unacknowledgedCount > 0 }">
      <Bell :size="20" />
      <span v-if="unacknowledgedCount > 0" class="alert-badge">{{ unacknowledgedCount }}</span>
    </button>

    <div class="alerts-panel" v-if="showPanel">
      <div class="panel-header">
        <div class="header-left">
          <h3>Alerts</h3>
          <span class="live-indicator">●</span>
        </div>
        <div class="header-actions">
          <button
            v-if="alerts.length > 0"
            class="clear-all-btn"
            @click="clearAllAlerts"
            title="Clear all alerts"
          >
            Clear All
          </button>
          <button class="close-btn" @click="showPanel = false">
            <X :size="18" />
          </button>
        </div>
      </div>

      <div class="panel-content">
        <div v-if="loading" class="loading">Loading...</div>

        <div v-else-if="alerts.length === 0" class="empty">
          <BellOff :size="32" />
          <p>No alerts</p>
        </div>

        <div v-else class="alerts-list">
          <div
            v-for="alert in sortedAlerts"
            :key="alert.id"
            class="alert-item"
            :class="[getSeverityClass(alert.severity), { acknowledged: alert.acknowledged }]"
          >
            <div class="alert-icon">
              <AlertTriangle :size="18" />
            </div>
            <div class="alert-content">
              <div class="alert-type">{{ alert.type.replace(/_/g, ' ') }}</div>
              <div class="alert-device" v-if="alert.vehicleId">Device: {{ alert.vehicleId }}</div>
              <div class="alert-message">{{ alert.message }}</div>
              <div class="alert-time">{{ formatTime(alert.timestamp) }}</div>
            </div>
            <div class="alert-actions">
              <button
                v-if="!alert.acknowledged"
                class="action-btn acknowledge"
                @click="acknowledgeAlert(alert)"
                title="Acknowledge"
              >
                <Check :size="14" />
              </button>
              <button
                v-if="isAdmin"
                class="action-btn delete"
                @click="deleteAlert(alert)"
                title="Delete"
              >
                <Trash2 :size="14" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.alerts-container {
  position: relative;
}

.alert-bell {
  background: var(--bg-tertiary);
  border: none;
  border-radius: 8px;
  color: #7a90b3;
  padding: 10px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  transition: all 0.15s ease;
}

.alert-bell:hover {
  background: #1e3566;
  color: #fff;
}

.alert-bell.has-alerts {
  color: #f59e0b;
}

.alert-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  background: #ef4444;
  color: #fff;
  font-size: 10px;
  font-weight: 600;
  min-width: 18px;
  height: 18px;
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 4px;
}

.alerts-panel {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 10px;
  width: 350px;
  max-height: 450px;
  background: var(--bg-secondary);
  border: 1px solid #1a2d50;
  border-radius: 12px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
  z-index: 1000;
  overflow: hidden;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 15px 20px;
  border-bottom: 1px solid #1a2d50;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.panel-header h3 {
  font-size: 14px;
  font-weight: 600;
  color: #fff;
}

.live-indicator {
  font-size: 8px;
  color: #10b981;
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.clear-all-btn {
  background: var(--bg-tertiary);
  border: none;
  border-radius: 6px;
  color: #ef4444;
  cursor: pointer;
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 500;
  transition: all 0.15s ease;
}

.clear-all-btn:hover {
  background: #ef4444;
  color: #fff;
}

.close-btn {
  background: none;
  border: none;
  color: #7a90b3;
  cursor: pointer;
  padding: 4px;
  display: flex;
}

.close-btn:hover {
  color: #fff;
}

.panel-content {
  max-height: 380px;
  overflow-y: auto;
}

.loading, .empty {
  padding: 40px 20px;
  text-align: center;
  color: #7a90b3;
}

.empty p {
  margin-top: 10px;
  font-size: 14px;
}

.alerts-list {
  padding: 10px;
}

.alert-item {
  display: flex;
  gap: 12px;
  padding: 12px;
  border-radius: 8px;
  margin-bottom: 8px;
  background: var(--bg-card);
  border-left: 3px solid #2a4070;
  transition: all 0.15s ease;
}

.alert-item:last-child {
  margin-bottom: 0;
}

.alert-item.acknowledged {
  opacity: 0.6;
}

.alert-item.severity-high {
  border-left-color: #ef4444;
}

.alert-item.severity-medium {
  border-left-color: #f59e0b;
}

.alert-item.severity-low {
  border-left-color: #f5a623;
}

.alert-icon {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.severity-high .alert-icon {
  background: rgba(239, 68, 68, 0.2);
  color: #ef4444;
}

.severity-medium .alert-icon {
  background: rgba(245, 158, 11, 0.2);
  color: #f59e0b;
}

.severity-low .alert-icon {
  background: rgba(245, 166, 35, 0.15);
  color: #f5a623;
}

.alert-content {
  flex: 1;
  min-width: 0;
}

.alert-type {
  font-size: 12px;
  font-weight: 600;
  color: #fff;
  text-transform: capitalize;
  margin-bottom: 2px;
}

.alert-device {
  font-size: 11px;
  color: #10b981;
  font-weight: 500;
  margin-bottom: 2px;
}

.alert-message {
  font-size: 12px;
  color: #888;
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.alert-time {
  font-size: 10px;
  color: #555;
}

.alert-actions {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.action-btn {
  background: var(--bg-tertiary);
  border: none;
  border-radius: 4px;
  padding: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
}

.action-btn.acknowledge {
  color: #22c55e;
}

.action-btn.acknowledge:hover {
  background: #22c55e;
  color: #fff;
}

.action-btn.delete {
  color: #ef4444;
}

.action-btn.delete:hover {
  background: #ef4444;
  color: #fff;
}

@media (max-width: 480px) {
  .alerts-panel {
    width: calc(100vw - 30px);
    right: -60px;
  }
}
</style>
