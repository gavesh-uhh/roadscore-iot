<script setup>
import { AlertTriangle, X } from 'lucide-vue-next'

defineProps({
  show: Boolean,
  title: {
    type: String,
    default: 'Confirm Action'
  },
  message: {
    type: String,
    default: 'Are you sure you want to proceed?'
  },
  confirmText: {
    type: String,
    default: 'Delete'
  },
  cancelText: {
    type: String,
    default: 'Cancel'
  },
  loading: Boolean,
  variant: {
    type: String,
    default: 'danger' // 'danger', 'warning', 'info'
  }
})

defineEmits(['confirm', 'cancel'])
</script>

<template>
  <Teleport to="body">
    <div class="modal-overlay" v-if="show" @click.self="$emit('cancel')">
      <div class="modal">
        <div class="modal-header">
          <div class="header-content">
            <div class="icon-wrapper" :class="variant">
              <AlertTriangle :size="24" />
            </div>
            <h3>{{ title }}</h3>
          </div>
          <button class="icon-btn" @click="$emit('cancel')">
            <X :size="20" />
          </button>
        </div>
        
        <div class="modal-body">
          <p>{{ message }}</p>
        </div>
        
        <div class="modal-footer">
          <button class="btn secondary" @click="$emit('cancel')" :disabled="loading">
            {{ cancelText }}
          </button>
          <button 
            class="btn" 
            :class="variant" 
            @click="$emit('confirm')" 
            :disabled="loading"
          >
            {{ loading ? 'Processing...' : confirmText }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1100;
  animation: fadeIn 0.15s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.modal {
  background: var(--bg-secondary);
  border: 1px solid #222;
  border-radius: 12px;
  width: 100%;
  max-width: 400px;
  animation: slideIn 0.2s ease;
}

@keyframes slideIn {
  from { 
    opacity: 0;
    transform: scale(0.95) translateY(-10px);
  }
  to { 
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px;
  border-bottom: 1px solid #222;
}

.header-content {
  display: flex;
  align-items: center;
  gap: 12px;
}

.icon-wrapper {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.icon-wrapper.danger {
  background: rgba(239, 68, 68, 0.15);
  color: #ef4444;
}

.icon-wrapper.warning {
  background: rgba(245, 158, 11, 0.15);
  color: #f59e0b;
}

.icon-wrapper.info {
  background: rgba(59, 130, 246, 0.15);
  color: #3b82f6;
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
  color: #888;
  padding: 10px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
}

.icon-btn:hover {
  background: #333;
  color: #fff;
}

.modal-body {
  padding: 20px;
}

.modal-body p {
  color: #888;
  font-size: 14px;
  line-height: 1.6;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 20px;
  border-top: 1px solid #222;
}

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn.secondary {
  background: var(--bg-tertiary);
  color: #fff;
}

.btn.secondary:hover:not(:disabled) {
  background: #333;
}

.btn.danger {
  background: #ef4444;
  color: #fff;
}

.btn.danger:hover:not(:disabled) {
  background: #dc2626;
}

.btn.warning {
  background: #f59e0b;
  color: #000;
}

.btn.warning:hover:not(:disabled) {
  background: #d97706;
}

.btn.info {
  background: #3b82f6;
  color: #fff;
}

.btn.info:hover:not(:disabled) {
  background: #2563eb;
}

@media (max-width: 480px) {
  .modal {
    margin: 15px;
    max-width: calc(100% - 30px);
  }
  
  .modal-header,
  .modal-body,
  .modal-footer {
    padding: 15px;
  }
  
  .modal-footer {
    flex-direction: column-reverse;
  }
  
  .btn {
    width: 100%;
    text-align: center;
  }
  
  .icon-wrapper {
    width: 36px;
    height: 36px;
  }
  
  .modal-header h3 {
    font-size: 15px;
  }
  
  .modal-body p {
    font-size: 13px;
  }
}
</style>
