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
  }
})

defineEmits(['update:searchQuery', 'logout'])
</script>

<template>
  <header class="top-header">
    <div class="header-left">
      <h1>{{ title }}</h1>
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
