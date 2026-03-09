// =============================================
// CRUD COMPOSABLE
// Handles create, read, update, delete operations
// =============================================

import { ref, computed } from 'vue'
import { api } from '../api'

export function useCrud(userRef, isAdminRef) {
  // Data
  const users = ref([])
  const vehicles = ref([])

  // Modal state
  const showModal = ref(false)
  const modalType = ref('')
  const editingItem = ref(null)
  const loading = ref(false)

  // Confirm modal state
  const showConfirmModal = ref(false)
  const confirmLoading = ref(false)
  const pendingDelete = ref({ type: '', id: null, name: '' })

  // Form data
  const formData = ref({
    name: '',
    email: '',
    password: '',
    role: 'driver',
    plateNumber: '',
    model: '',
    deviceId: '',
    ownerUid: '',
    description: ''
  })

  // Search
  const searchQuery = ref('')

  // Vehicle selection for drivers
  const selectedVehicleId = ref(null)

  // ----- FETCH FUNCTIONS -----
  async function fetchUsers() {
    try {
      users.value = await api.getUsers()
    } catch (e) {
      console.log('Could not fetch users')
    }
  }

  async function fetchVehicles() {
    try {
      vehicles.value = await api.getVehicles()
      selectFirstVehicle()
    } catch (e) {
      console.log('Could not fetch vehicles')
    }
  }

  async function fetchAll() {
    await Promise.all([fetchUsers(), fetchVehicles()])
  }

  // ----- MODAL FUNCTIONS -----
  function openModal(type, item = null) {
    modalType.value = type
    editingItem.value = item
    formData.value = item 
      ? { ...item } 
      : { 
          name: '', 
          email: '', 
          password: '', 
          role: 'driver', 
          plateNumber: '', 
          model: '', 
          deviceId: '', 
          ownerUid: isAdminRef?.value ? '' : userRef?.value?.uid || '', 
          description: '' 
        }
    showModal.value = true
  }

  function closeModal() {
    showModal.value = false
    editingItem.value = null
  }

  // ----- SAVE ITEM -----
  async function saveItem() {
    loading.value = true
    
    try {
      const isEdit = editingItem.value !== null
      const id = editingItem.value?.id
      
      if (modalType.value === 'user') {
        const body = { name: formData.value.name, email: formData.value.email, role: formData.value.role }
        if (!isEdit) body.password = formData.value.password
        isEdit ? await api.updateUser(id, body) : await api.createUser(body)
        await fetchUsers()
      } else if (modalType.value === 'vehicle') {
        const body = { 
          plateNumber: formData.value.plateNumber, 
          model: formData.value.model, 
          deviceId: formData.value.deviceId,
          ownerUid: isAdminRef?.value ? formData.value.ownerUid : userRef?.value?.uid
        }
        isEdit ? await api.updateVehicle(id, body) : await api.createVehicle(body)
        await fetchVehicles()
      }
      
      closeModal()
    } catch (e) {
      console.error('Save error:', e)
    }
    
    loading.value = false
  }

  // ----- DELETE ITEM -----
  function openDeleteConfirm(type, id, name = '') {
    pendingDelete.value = { type, id, name }
    showConfirmModal.value = true
  }

  function closeDeleteConfirm() {
    showConfirmModal.value = false
    pendingDelete.value = { type: '', id: null, name: '' }
  }

  async function confirmDelete() {
    const { type, id } = pendingDelete.value
    if (!type || !id) return

    confirmLoading.value = true
    try {
      if (type === 'user') { await api.deleteUser(id); await fetchUsers() }
      else if (type === 'vehicle') { await api.deleteVehicle(id); await fetchVehicles() }
      closeDeleteConfirm()
    } catch (e) {
      console.error('Delete error:', e)
    }
    confirmLoading.value = false
  }

  // ----- VEHICLE SELECTION -----
  const driverVehicles = computed(() => {
    if (isAdminRef?.value) return vehicles.value
    return vehicles.value.filter(v => v.ownerUid === userRef?.value?.uid)
  })

  const selectedVehicle = computed(() => {
    if (!selectedVehicleId.value) return driverVehicles.value[0] || null
    return driverVehicles.value.find(v => v.id === selectedVehicleId.value) || driverVehicles.value[0] || null
  })

  function selectFirstVehicle() {
    if (driverVehicles.value.length > 0 && !selectedVehicleId.value) {
      selectedVehicleId.value = driverVehicles.value[0].id
    }
  }

  // ----- FILTERED LISTS -----
  const filteredUsers = computed(() => {
    if (!searchQuery.value) return users.value
    const q = searchQuery.value.toLowerCase()
    return users.value.filter(u => u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q))
  })

  const filteredVehicles = computed(() => {
    let filtered = vehicles.value
    if (!isAdminRef?.value && userRef?.value?.uid) {
      filtered = filtered.filter(v => v.ownerUid === userRef.value.uid)
    }
    
    if (!searchQuery.value) return filtered
    const q = searchQuery.value.toLowerCase()
    return filtered.filter(v => v.plateNumber?.toLowerCase().includes(q) || v.model?.toLowerCase().includes(q))
  })

  return {
    // Data
    users,
    vehicles,
    // Modal
    showModal,
    modalType,
    editingItem,
    loading,
    formData,
    // Confirm modal
    showConfirmModal,
    confirmLoading,
    pendingDelete,
    // Search
    searchQuery,
    // Vehicle selection
    selectedVehicleId,
    driverVehicles,
    selectedVehicle,
    // Filtered
    filteredUsers,
    filteredVehicles,
    // Methods
    fetchUsers,
    fetchVehicles,
    fetchAll,
    openModal,
    closeModal,
    saveItem,
    openDeleteConfirm,
    closeDeleteConfirm,
    confirmDelete,
    selectFirstVehicle
  }
}
