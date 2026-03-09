
import { ref } from 'vue'

const alertUpdateTrigger = ref(0)
const lastAction = ref(null)

export function useAlertEvents() {
  function triggerAlertRefresh(action = 'update') {
    alertUpdateTrigger.value++
    lastAction.value = {
      type: action,
      timestamp: Date.now()
    }
  }

  function onAlertUpdate(callback) {
    const unwatch = () => {
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
