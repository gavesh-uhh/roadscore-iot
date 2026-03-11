<script setup>
import { X } from 'lucide-vue-next'

defineProps({
  show: Boolean,
  title: String,
  loading: Boolean
})

defineEmits(['close', 'save'])
</script>

<template>
  <div class="modal-overlay" v-if="show" @click.self="$emit('close')">
    <div class="modal">
      <div class="modal-header">
        <h3>{{ title }}</h3>
        <button class="icon-btn" @click="$emit('close')">
          <X :size="20" />
        </button>
      </div>

      <div class="modal-body">
        <slot></slot>
      </div>

      <div class="modal-footer">
        <button class="btn secondary" @click="$emit('close')">Cancel</button>
        <button class="btn primary" @click="$emit('save')" :disabled="loading">
          {{ loading ? 'Saving...' : 'Save' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: var(--bg-secondary);
  border: 1px solid #1a2d50;
  border-radius: 12px;
  width: 100%;
  max-width: 450px;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px;
  border-bottom: 1px solid #1a2d50;
}

.modal-header h3 {
  font-size: 16px;
  font-weight: 600;
  color: #fff;
}

.icon-btn {
  background: var(--bg-tertiary);
  border: none;
  border-radius: 8px;
  color: #7a90b3;
  padding: 10px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.icon-btn:hover {
  background: #1e3566;
  color: #fff;
}

.modal-body {
  padding: 20px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 20px;
  border-top: 1px solid #1a2d50;
}

.btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn.primary {
  background: #f5a623;
  color: #06101f;
}

.btn.primary:hover {
  background: #d97706;
}

.btn.primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn.secondary {
  background: var(--bg-tertiary);
  color: #7a90b3;
}

.btn.secondary:hover {
  background: #1e3566;
  color: #fff;
}

@media (max-width: 768px) {
  .modal {
    margin: 15px;
    max-width: calc(100% - 30px);
  }

  .modal-header,
  .modal-body,
  .modal-footer {
    padding: 15px;
  }
}

@media (max-width: 480px) {
  .modal {
    margin: 10px;
    max-width: calc(100% - 20px);
  }

  .modal-footer {
    flex-direction: column-reverse;
  }

  .btn {
    width: 100%;
    justify-content: center;
  }
}
</style>
