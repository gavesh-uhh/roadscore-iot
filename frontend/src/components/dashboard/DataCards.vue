<script setup>
import { Plus, Edit, Trash2, User, Car } from 'lucide-vue-next'

const props = defineProps({
  items: Array,
  title: String,
  columns: Array,
  canAdd: {
    type: Boolean,
    default: true
  },
  canEdit: {
    type: Boolean,
    default: true
  },
  canDelete: {
    type: Boolean,
    default: true
  }
})

defineEmits(['add', 'edit', 'delete'])

const isUsers = props.title.toLowerCase().includes('user')
const isVehicles = props.title.toLowerCase().includes('vehicle')
</script>

<template>
  <div class="admin-section">
    <div class="section-header">
      <h2>{{ title }}</h2>
      <button v-if="canAdd" class="btn primary" @click="$emit('add')">
        <Plus :size="18" />
        Add {{ title.replace('Manage ', '').slice(0, -1) }}
      </button>
    </div>
    
    <div class="cards-grid">
      <div v-for="item in items" :key="item.id" class="card">
        <div class="card-icon" :class="{ user: isUsers, vehicle: isVehicles }">
          <User v-if="isUsers" :size="24" />
          <Car v-if="isVehicles" :size="24" />
        </div>
        
        <div class="card-content">
          <div v-for="col in columns" :key="col.key" class="card-field">
            <span class="field-label">{{ col.label }}:</span>
            <span v-if="col.badge" class="badge">{{ item[col.key] || col.default || '-' }}</span>
            <span v-else class="field-value">{{ col.render ? col.render(item) : (item[col.key] || col.default || '-') }}</span>
          </div>
        </div>
        
        <div v-if="canEdit || canDelete" class="card-actions">
          <button v-if="canEdit" class="icon-btn small" @click="$emit('edit', item)" title="Edit">
            <Edit :size="16" />
          </button>
          <button v-if="canDelete" class="icon-btn small danger" @click="$emit('delete', item)" title="Delete">
            <Trash2 :size="16" />
          </button>
        </div>
      </div>
      
      <div v-if="items.length === 0" class="empty-state">
        <User v-if="isUsers" :size="48" />
        <Car v-if="isVehicles" :size="48" />
        <p>No items found</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.admin-section {
  width: 100%;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 25px;
}

.section-header h2 {
  font-size: 18px;
  font-weight: 600;
  color: #fff;
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
  background: #3b82f6;
  color: #fff;
}

.btn.primary:hover {
  background: #2563eb;
}

.cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

.card {
  background: var(--bg-secondary);
  border: 1px solid #222;
  border-radius: 12px;
  padding: 20px;
  transition: all 0.2s ease;
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.card:hover {
  border-color: #333;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.card-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 5px;
}

.card-icon.user {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: #fff;
}

.card-icon.vehicle {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: #fff;
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
  color: #666;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  min-width: 80px;
}

.field-value {
  font-size: 14px;
  color: #fff;
  font-weight: 500;
}

.badge {
  padding: 4px 12px;
  background: var(--bg-tertiary);
  border-radius: 6px;
  font-size: 12px;
  color: #00d4aa;
  font-weight: 500;
  border: 1px solid #00d4aa33;
}

.card-actions {
  display: flex;
  gap: 8px;
  padding-top: 10px;
  border-top: 1px solid #222;
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
  .section-header {
    flex-direction: column;
    align-items: stretch;
    gap: 15px;
  }
  
  .btn {
    justify-content: center;
  }
  
  .cards-grid {
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: 15px;
  }
  
  .card {
    padding: 16px;
  }
  
  .card-icon {
    width: 40px;
    height: 40px;
  }
  
  .card-icon :deep(svg) {
    width: 20px;
    height: 20px;
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
  
  .badge {
    padding: 3px 10px;
    font-size: 11px;
  }
}
</style>
