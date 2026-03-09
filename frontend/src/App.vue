<script setup>
import { ref, onMounted } from 'vue'
import LoginPage from './components/LoginPage.vue'
import SignupPage from './components/SignupPage.vue'
import Dashboard from './components/Dashboard.vue'
import { api } from './api'

const currentPage = ref('login')
const user = ref(null)

onMounted(() => {
  const savedUser = api.getUser()
  if (savedUser) {
    user.value = savedUser
    currentPage.value = 'dashboard'
  }
})

const handleLoginSuccess = (userData) => {
  user.value = userData
  currentPage.value = 'dashboard'
}

const handleSignupSuccess = (userData) => {
  user.value = userData
  currentPage.value = 'dashboard'
}

const handleLogout = () => {
  api.logout()
  user.value = null
  currentPage.value = 'login'
}
</script>

<template>
  <LoginPage 
    v-if="currentPage === 'login'" 
    @switch-to-signup="currentPage = 'signup'" 
    @login-success="handleLoginSuccess"
  />
  <SignupPage 
    v-else-if="currentPage === 'signup'" 
    @switch-to-login="currentPage = 'login'" 
    @signup-success="handleSignupSuccess"
  />
  <Dashboard 
    v-else 
    :user="user" 
    @logout="handleLogout"
  />
</template>

<style>
#app {
  width: 100%;
  min-height: 100vh;
  margin: 0;
  padding: 0;
}
</style>
