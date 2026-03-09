const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const api = {
  getBaseUrl() {
    return API_BASE;
  },

  async login(email, password) {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Login failed');
    }
    
    localStorage.setItem('user', JSON.stringify(data.user));
    localStorage.setItem('token', data.token);
    return data;
  },

  async signup(name, email, password) {
    const response = await fetch(`${API_BASE}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Signup failed');
    }
    
    localStorage.setItem('user', JSON.stringify(data.user));
    return data;
  },

  logout() {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
  },

  getUser() {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },

  getToken() {
    return localStorage.getItem('token');
  },

  getAuthHeaders() {
    const token = this.getToken();
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  },

  isLoggedIn() {
    return !!localStorage.getItem('user');
  },

  async getUsers() {
    const res = await fetch(`${API_BASE}/users`);
    return res.json();
  },

  async createUser(data) {
    const res = await fetch(`${API_BASE}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  async updateUser(id, data) {
    const res = await fetch(`${API_BASE}/users/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  async deleteUser(id) {
    await fetch(`${API_BASE}/users/${id}`, { method: 'DELETE' });
  },

  async getVehicles() {
    const res = await fetch(`${API_BASE}/vehicles`);
    return res.json();
  },

  async createVehicle(data) {
    const res = await fetch(`${API_BASE}/vehicles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...this.getAuthHeaders() },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to create vehicle');
    }
    return res.json();
  },

  async updateVehicle(id, data) {
    const res = await fetch(`${API_BASE}/vehicles/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...this.getAuthHeaders() },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to update vehicle');
    }
    return res.json();
  },

  async deleteVehicle(id) {
    const res = await fetch(`${API_BASE}/vehicles/${id}`, { 
      method: 'DELETE',
      headers: this.getAuthHeaders()
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to delete vehicle');
    }
  },

  async getLiveData() {
    const res = await fetch(`${API_BASE}/live-data`);
    return res.json();
  },

  async getAlerts() {
    const res = await fetch(`${API_BASE}/alerts`);
    return res.json();
  },

  async getUserAlerts(uid) {
    const res = await fetch(`${API_BASE}/alerts/user/${uid}`);
    return res.json();
  },

  async createAlert(data) {
    const res = await fetch(`${API_BASE}/alerts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  async acknowledgeAlert(id) {
    const res = await fetch(`${API_BASE}/alerts/${id}/acknowledge`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' }
    });
    return res.json();
  },

  async deleteAlert(id) {
    await fetch(`${API_BASE}/alerts/${id}`, { method: 'DELETE' });
  },

  async deleteAllAlerts() {
    await fetch(`${API_BASE}/alerts`, { method: 'DELETE' });
  },

  async getDriverScore(vehicleId) {
    const res = await fetch(`${API_BASE}/driver-scores/vehicle/${vehicleId}`);
    return res.json();
  },

  async getUserDriverScore(uid) {
    const res = await fetch(`${API_BASE}/driver-scores/user/${uid}`);
    return res.json();
  },

  async getCrashEvents(vehicleId) {
    const res = await fetch(`${API_BASE}/driving-behavior/vehicle/${vehicleId}/crashes`);
    return res.json();
  },

  async deleteCrashEvents(vehicleId) {
    const res = await fetch(`${API_BASE}/driving-behavior/vehicle/${vehicleId}/crashes`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || `HTTP error! status: ${res.status}`);
    }
    
    return res.json();
  },

  async getDrivingBehavior(vehicleId) {
    const res = await fetch(`${API_BASE}/driving-behavior/vehicle/${vehicleId}`);
    return res.json();
  }
};
