<script setup>
import { computed } from 'vue'
import {
  LayoutDashboard,
  Car,
  Users,
  MapPin,
  Activity,
  LogOut,
  Menu
} from 'lucide-vue-next'

const props = defineProps({
  currentSection: String,
  collapsed: Boolean,
  userRole: {
    type: String,
    default: 'driver'
  }
})

const emit = defineEmits(['change-section', 'toggle-sidebar', 'logout'])

const allNavItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'driver'] },
  { id: 'vehicles', label: 'Vehicles', icon: Car, roles: ['admin', 'driver'] },
  { id: 'users', label: 'Users', icon: Users, roles: ['admin'] },
  { id: 'trips', label: 'Live Map', icon: MapPin, roles: ['admin', 'driver'] }
]

const navItems = computed(() => {
  return allNavItems.filter(item => item.roles.includes(props.userRole))
})
</script>

<template>
  <aside class="sidebar" :class="{ collapsed }">
    <div class="sidebar-header">
      <div class="logo" v-if="!collapsed">
        <Activity :size="24" />
        <span>RoadScore</span>
      </div>
      <button class="toggle-btn" @click="$emit('toggle-sidebar')">
        <Menu :size="20" />
      </button>
    </div>
    
    <nav class="sidebar-nav">
      <button
        v-for="item in navItems"
        :key="item.id"
        class="nav-item"
        :class="{ active: currentSection === item.id }"
        @click="$emit('change-section', item.id)"
      >
        <component :is="item.icon" :size="20" />
        <span v-if="!collapsed">{{ item.label }}</span>
      </button>
      
      <button class="nav-item logout" @click="$emit('logout')">
        <LogOut :size="20" />
        <span v-if="!collapsed">Logout</span>
      </button>
    </nav>
  </aside>
</template>

<style scoped>
.sidebar {
  width: 240px;
  height: 100vh;
  background: #161616;
  border-right: 1px solid #222;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  overflow: hidden;
  transition: width 0.2s ease;
}

.sidebar.collapsed {
  width: 70px;
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px;
  border-bottom: 1px solid #222;
}

.logo {
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 700;
  font-size: 18px;
  color: #3b82f6;
}

.toggle-btn {
  background: none;
  border: none;
  color: #666;
  cursor: pointer;
  padding: 5px;
}

.toggle-btn:hover {
  color: #fff;
}

.sidebar-nav {
  flex: 1;
  padding: 15px 10px;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 15px;
  background: none;
  border: none;
  border-radius: 8px;
  color: #888;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.15s ease;
  text-align: left;
}

.nav-item:hover {
  background: #222;
  color: #fff;
}

.nav-item.active {
  background: #3b82f6;
  color: #fff;
}

.nav-item.logout {
  margin-top: 10px;
}

.nav-item.logout:hover {
  background: #dc2626;
  color: #fff;
}

@media (max-width: 768px) {
  .sidebar {
    position: fixed;
    left: 0;
    top: 0;
    bottom: 0;
    z-index: 100;
    width: 70px;
  }
  
  .sidebar .logo span,
  .sidebar .nav-item span {
    display: none;
  }
}

@media (max-width: 480px) {
  .sidebar {
    width: 60px;
  }
  
  .sidebar .toggle-btn {
    display: none;
  }
  
  .sidebar-nav {
    padding: 10px;
  }
  
  .nav-item {
    padding: 10px;
  }
}
</style>
