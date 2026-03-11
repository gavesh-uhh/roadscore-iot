<script setup>
const props = defineProps({
  type: {
    type: String,
    required: true,
    validator: (v) => ['user', 'vehicle'].includes(v)
  },
  formData: Object,
  isEdit: Boolean,
  users: Array,
  isAdmin: Boolean
})

defineEmits(['update:formData'])
</script>

<template>
  <template v-if="type === 'user'">
    <div class="form-group">
      <label>Name</label>
      <input
        type="text"
        :value="formData.name"
        @input="$emit('update:formData', { ...formData, name: $event.target.value })"
        placeholder="Enter name"
      />
    </div>
    <div class="form-group">
      <label>Email</label>
      <input
        type="email"
        :value="formData.email"
        @input="$emit('update:formData', { ...formData, email: $event.target.value })"
        placeholder="Enter email"
      />
    </div>
    <div class="form-group" v-if="!isEdit">
      <label>Password</label>
      <input
        type="password"
        :value="formData.password"
        @input="$emit('update:formData', { ...formData, password: $event.target.value })"
        placeholder="Enter password"
      />
    </div>
    <div class="form-group">
      <label>Role</label>
      <select
        :value="formData.role"
        @change="$emit('update:formData', { ...formData, role: $event.target.value })"
      >
        <option value="admin">Admin</option>
        <option value="driver">Driver</option>
      </select>
    </div>
  </template>

  <template v-if="type === 'vehicle'">
    <div class="form-group">
      <label>Plate Number</label>
      <input
        type="text"
        :value="formData.plateNumber"
        @input="$emit('update:formData', { ...formData, plateNumber: $event.target.value })"
        placeholder="e.g. ABC-1234"
      />
    </div>
    <div class="form-group">
      <label>Model</label>
      <input
        type="text"
        :value="formData.model"
        @input="$emit('update:formData', { ...formData, model: $event.target.value })"
        placeholder="e.g. Toyota Axio"
      />
    </div>
    <div class="form-group">
      <label>Device ID (ESP32)</label>
      <input
        type="text"
        :value="formData.deviceId"
        @input="$emit('update:formData', { ...formData, deviceId: $event.target.value })"
        placeholder="e.g. ESP32_001"
      />
    </div>
    <div class="form-group" v-if="isAdmin">
      <label>Owner</label>
      <select
        :value="formData.ownerUid"
        @change="$emit('update:formData', { ...formData, ownerUid: $event.target.value })"
      >
        <option value="">Select Owner</option>
        <option v-for="user in users?.filter(u => u.role === 'driver')" :key="user.id" :value="user.id">
          {{ user.name }} ({{ user.email }})
        </option>
      </select>
    </div>
  </template>
</template>

<style scoped>
.form-group {
  margin-bottom: 15px;
}

.form-group label {
  display: block;
  font-size: 12px;
  color: #7a90b3;
  margin-bottom: 8px;
}

.form-group input,
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 12px 15px;
  background: var(--bg-tertiary);
  border: 1px solid #1a2d50;
  border-radius: 8px;
  color: #fff;
  font-size: 14px;
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  outline: none;
  border-color: #f5a623;
}

.form-group textarea {
  resize: vertical;
}

@media (max-width: 480px) {
  .form-group {
    margin-bottom: 12px;
  }

  .form-group input,
  .form-group select,
  .form-group textarea {
    padding: 10px 12px;
    font-size: 16px;
  }

  .form-group label {
    font-size: 11px;
  }
}
</style>
