import { ref, computed } from 'vue'
import { api } from '../api'

export function useCrud(userRef, isAdminRef) {
  const users = ref([])
  const vehicles = ref([])
  const scores = ref([])

  const showModal = ref(false)
  const modalType = ref('')
  const editingItem = ref(null)
  const loading = ref(false)

  const showConfirmModal = ref(false)
  const confirmLoading = ref(false)
  const pendingDelete = ref({ type: '', id: null, name: '' })

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

  const searchQuery = ref('')

  const selectedVehicleId = ref(null)

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

  async function fetchScores() {
    try {
      scores.value = await api.getAllDriverScores()
    } catch (e) {
      console.log('Could not fetch scores')
    }
  }

  async function resetScore(vehicleId) {
    try {
      await api.resetDriverScore(vehicleId)
      await fetchScores()
    } catch (e) {
      console.error('Reset score error:', e)
    }
  }

  async function updateScore(vehicleId, newScore) {
    try {
      await api.updateDriverScore(vehicleId, newScore)
      await fetchScores()
    } catch (e) {
      console.error('Update score error:', e)
    }
  }

  async function fetchAll() {
    await Promise.all([fetchUsers(), fetchVehicles(), fetchScores()])
  }

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
    users,
    vehicles,
    scores,
    showModal,
    modalType,
    editingItem,
    loading,
    formData,
    showConfirmModal,
    confirmLoading,
    pendingDelete,
    searchQuery,
    selectedVehicleId,
    driverVehicles,
    selectedVehicle,
    filteredUsers,
    filteredVehicles,
    fetchUsers,
    fetchVehicles,
    fetchScores,
    fetchAll,
    openModal,
    closeModal,
    saveItem,
    openDeleteConfirm,
    closeDeleteConfirm,
    confirmDelete,
    selectFirstVehicle,
    resetScore,
    updateScore
  }
}
