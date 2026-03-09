// =============================================
// ALERT EVENTS COMPOSABLE
// Real-time alert event broadcasting system
// =============================================

import { ref } from 'vue'

// Shared reactive state for alert updates
const alertUpdateTrigger = ref(0)
const lastAction = ref(null)

export function useAlertEvents() {
  // Trigger a global alert refresh
  function triggerAlertRefresh(action = 'update') {
    alertUpdateTrigger.value++
    lastAction.value = {
      type: action,
      timestamp: Date.now()
    }
  }

  // Listen for alert updates
  function onAlertUpdate(callback) {
    // Watch for changes in the trigger
    const unwatch = () => {
      // Cleanup if needed
    }
    return unwatch
  }

  return {
    alertUpdateTrigger,
    lastAction,
    triggerAlertRefresh,
    onAlertUpdate
  }
}
