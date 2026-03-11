<script setup>
import { computed } from 'vue'
import {
  LayoutDashboard,
  Car,
  Users,
  MapPin,
  Activity,
  Gauge,
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
  { id: 'scores', label: 'Scores', icon: Gauge, roles: ['admin'] },
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
        <Activity :size="20" />
        <img src="/rs.png" alt="RoadScore" class="logo-img" />
      </div>
      <button class="toggle-btn" @click="$emit('toggle-sidebar')">
        <Menu :size="18" />
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
    </nav>

    <div class="sidebar-footer">
      <button class="nav-item logout" @click="$emit('logout')">
        <LogOut :size="20" />
        <span v-if="!collapsed">Logout</span>
      </button>
    </div>
  </aside>
</template>

<style scoped>
.sidebar {
  width: 240px;
  height: 100vh;
  background: var(--bg-secondary);
  border-right: 1px solid #1a2d50;
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
  border-bottom: 1px solid #1a2d50;
  min-height: 64px;
}

.sidebar.collapsed .sidebar-header {
  justify-content: center;
}

.logo {
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 700;
  font-size: 18px;
  color: #f5a623;
  overflow: hidden;
  min-width: 0;
}

.logo-img {
  height: 28px;
  width: auto;
  object-fit: contain;
  flex-shrink: 0;
  display: block;
}

.toggle-btn {
  background: none;
  border: none;
  color: #7a90b3;
  cursor: pointer;
  padding: 5px;
  flex-shrink: 0;
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

.sidebar-footer {
  padding: 10px;
  border-top: 1px solid #1a2d50;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 15px;
  background: none;
  border: none;
  border-radius: 8px;
  color: #7a90b3;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.15s ease;
  text-align: left;
  width: 100%;
  white-space: nowrap;
  overflow: hidden;
}

.nav-item:hover {
  background: var(--bg-tertiary);
  color: #fff;
}

.nav-item.active {
  background: #f5a623;
  color: #06101f;
}

.nav-item.logout:hover {
  background: rgba(239, 68, 68, 0.15);
  color: #ef4444;
}

.sidebar.collapsed .nav-item {
  padding: 12px;
  justify-content: center;
}

/* Tablet: icon-only fixed sidebar rail */
@media (max-width: 768px) {
  .sidebar {
    position: fixed;
    left: 0;
    top: 0;
    bottom: 0;
    z-index: 100;
    width: 64px;
  }

  .sidebar-header {
    padding: 12px 10px;
    justify-content: center;
    min-height: 56px;
  }

  .logo {
    display: none;
  }

  .toggle-btn {
    display: none;
  }

  .sidebar-nav {
    padding: 10px 8px;
  }

  .nav-item {
    padding: 12px;
    justify-content: center;
    gap: 0;
  }

  .nav-item span {
    display: none;
  }

  .sidebar-footer {
    padding: 8px;
  }
}

/* Mobile: bottom navigation bar */
@media (max-width: 480px) {
  .sidebar {
    position: fixed;
    left: 0;
    right: 0;
    top: auto;
    bottom: 0;
    width: 100%;
    height: 60px;
    flex-direction: row;
    border-right: none;
    border-top: 1px solid #1a2d50;
  }

  .sidebar-header {
    display: none;
  }

  .sidebar-nav {
    flex: 1;
    flex-direction: row;
    align-items: center;
    justify-content: space-around;
    padding: 0 8px;
    gap: 0;
  }

  .nav-item {
    flex-direction: column;
    gap: 3px;
    padding: 6px 10px;
    width: auto;
    font-size: 10px;
    justify-content: center;
    border-radius: 6px;
  }

  .nav-item span {
    display: block;
    font-size: 10px;
    line-height: 1;
  }

  .sidebar-footer {
    display: flex;
    align-items: center;
    justify-content: center;
    border-top: none;
    border-left: 1px solid #1a2d50;
    padding: 0 8px;
  }

  .sidebar-footer .nav-item {
    flex-direction: column;
    gap: 3px;
    padding: 6px 10px;
    width: auto;
  }

  .sidebar-footer .nav-item span {
    display: block;
    font-size: 10px;
    line-height: 1;
  }
}
</style>
