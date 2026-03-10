<script setup>
import { ref } from 'vue'
import { api } from '../api'

const emit = defineEmits(['switch-to-signup', 'login-success'])

const email = ref('')
const password = ref('')
const isLoading = ref(false)
const errorMessage = ref('')

const handleLogin = async () => {
  errorMessage.value = ''
  isLoading.value = true
  
  try {
    const result = await api.login(email.value, password.value)
    emit('login-success', result.user)
  } catch (error) {
    errorMessage.value = error.message
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="auth-page">
    <div class="auth-card">
      <h1>Sign In</h1>
      
      <form @submit.prevent="handleLogin">
        <div v-if="errorMessage" class="error">{{ errorMessage }}</div>
        
        <div class="field">
          <label>Email</label>
          <input type="email" v-model="email" placeholder="you@email.com" required />
        </div>

        <div class="field">
          <label>Password</label>
          <input type="password" v-model="password" placeholder="Enter password" required />
        </div>

        <button type="submit" :disabled="isLoading">
          {{ isLoading ? 'Signing in...' : 'Sign In' }}
        </button>
      </form>

      <p class="switch-text">
        Don't have an account? <a href="#" @click.prevent="$emit('switch-to-signup')">Sign up</a>
      </p>
    </div>
  </div>
</template>

<style scoped>
.auth-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-primary);
  padding: 20px;
}

.auth-card {
  background: var(--bg-secondary);
  border: 1px solid #222;
  border-radius: 12px;
  padding: 40px;
  width: 100%;
  max-width: 400px;
}

h1 {
  color: #fff;
  font-size: 24px;
  margin-bottom: 24px;
  text-align: center;
}

.error {
  background: #dc2626;
  color: #fff;
  padding: 10px;
  border-radius: 8px;
  margin-bottom: 16px;
  font-size: 14px;
}

.field {
  margin-bottom: 16px;
}

label {
  display: block;
  color: #888;
  font-size: 12px;
  margin-bottom: 8px;
}

input {
  width: 100%;
  padding: 12px 15px;
  background: var(--bg-tertiary);
  border: 1px solid #333;
  border-radius: 8px;
  color: #fff;
  font-size: 14px;
}

input:focus {
  outline: none;
  border-color: #3b82f6;
}

input:-webkit-autofill,
input:-webkit-autofill:hover,
input:-webkit-autofill:focus {
  -webkit-box-shadow: 0 0 0 1000px #222 inset !important;
  -webkit-text-fill-color: #fff !important;
  border: 1px solid #333;
}

button {
  width: 100%;
  padding: 12px;
  background: #3b82f6;
  border: none;
  border-radius: 8px;
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  margin-top: 8px;
}

button:hover {
  background: #2563eb;
}

button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.switch-text {
  text-align: center;
  color: #888;
  font-size: 14px;
  margin-top: 20px;
}

.switch-text a {
  color: #3b82f6;
  text-decoration: none;
}

.switch-text a:hover {
  text-decoration: underline;
}

@media (max-width: 480px) {
  .auth-card {
    padding: 25px 20px;
  }
  
  h1 {
    font-size: 20px;
    margin-bottom: 20px;
  }
  
  input {
    font-size: 16px;
    padding: 14px 15px;
  }
  
  button {
    padding: 14px;
  }
}
</style>
