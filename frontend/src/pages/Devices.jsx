import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Box, CircularProgress, Chip, Snackbar, Alert, MenuItem, CircularProgress as MUICircularProgress } from '@mui/material'
import { Sync as SyncIcon } from '@mui/icons-material'
import { getDevices, createDevice, updateDevice, deleteDevice, syncDeviceStudents, syncAttendance, testDeviceConnection } from '../api/devices'
import DataTable from '../components/DataTable'
import DeviceForm from '../components/DeviceForm'
import DeleteDialog from '../components/DeleteDialog'
import ViewDialog from '../components/ViewDialog'
import { useTranslation } from 'react-i18next'

function Devices() {
  const [searchInput, setSearchInput] = useState('')
  const [searchValue, setSearchValue] = useState('')
  const [page, setPage] = useState(1)
  const [formOpen, setFormOpen] = useState(false)
  const [viewOpen, setViewOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [selectedDevice, setSelectedDevice] = useState(null)
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' })
  const queryClient = useQueryClient()
  const { t } = useTranslation()

  // Debounce search input - longer delay to prevent interruption while typing
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchValue(searchInput)
    }, 800)

    return () => clearTimeout(timer)
  }, [searchInput])

  const { data, isLoading } = useQuery({
    queryKey: ['devices', page, searchValue],
    queryFn: () => getDevices({ page, page_size: 15, search: searchValue }),
    enabled: true,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    keepPreviousData: true,
    staleTime: 5000,
  })

  const createMutation = useMutation({
    mutationFn: createDevice,
    onSuccess: () => {
      queryClient.invalidateQueries(['devices'])
      setFormOpen(false)
      setSnackbar({ open: true, message: t('devices.deviceCreated'), severity: 'success' })
    },
    onError: (error) => {
      setSnackbar({
        open: true,
        message: error.response?.data?.detail || error.response?.data?.message || t('devices.failedToCreate'),
        severity: 'error',
      })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => updateDevice(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['devices'])
      setFormOpen(false)
      setSelectedDevice(null)
      setSnackbar({ open: true, message: t('devices.deviceUpdated'), severity: 'success' })
    },
    onError: (error) => {
      setSnackbar({
        open: true,
        message: error.response?.data?.detail || error.response?.data?.message || t('devices.failedToUpdate'),
        severity: 'error',
      })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteDevice,
    onSuccess: () => {
      queryClient.invalidateQueries(['devices'])
      setDeleteOpen(false)
      setSelectedDevice(null)
      setSnackbar({ open: true, message: t('devices.deviceDeleted'), severity: 'success' })
    },
    onError: (error) => {
      setSnackbar({
        open: true,
        message: error.response?.data?.detail || error.response?.data?.message || t('devices.failedToDelete'),
        severity: 'error',
      })
    },
  })

  const syncMutation = useMutation({
    mutationFn: syncDeviceStudents,
    onSuccess: (data) => {
      // Invalidate and refetch devices to get updated last_sync and connection status
      queryClient.invalidateQueries(['devices'])
      queryClient.refetchQueries(['devices', page, searchValue])
      const message = data.message || t('devices.syncStudentsSuccess', { count: data.synced_count || 0 })
      setSnackbar({ open: true, message, severity: 'success' })
    },
    onError: (error) => {
      setSnackbar({
        open: true,
        message: error.response?.data?.message || error.response?.data?.detail || t('devices.syncFailed'),
        severity: 'error',
      })
    },
  })

  const testConnectionMutation = useMutation({
    mutationFn: testDeviceConnection,
    onSuccess: (data) => {
      // Refresh device data to get updated connection status
      queryClient.invalidateQueries(['devices'])
      queryClient.refetchQueries(['devices', page, searchValue])
      // Update selected device if it's the one being tested
      if (selectedDevice && data.device_id === selectedDevice.id) {
        setSelectedDevice((prev) => ({
          ...prev,
          is_connected: data.connected,
        }))
      }
      const message = data.connected
        ? t('devices.connectionTestSuccess')
        : t('devices.connectionTestFailed', { error: data.error || 'Unknown error' })
      setSnackbar({
        open: true,
        message,
        severity: data.connected ? 'success' : 'error',
      })
    },
    onError: (error) => {
      setSnackbar({
        open: true,
        message: error.response?.data?.error || error.response?.data?.detail || t('devices.syncFailed'),
        severity: 'error',
      })
    },
  })

  const syncAttendanceMutation = useMutation({
    mutationFn: syncAttendance,
    onSuccess: (data) => {
      // Refresh device data to get updated last_sync
      queryClient.invalidateQueries(['devices'])
      queryClient.refetchQueries(['devices', page, searchValue])
      const message = data.message || t('devices.syncAttendanceSuccess', { count: data.synced_count || 0 })
      setSnackbar({ open: true, message, severity: 'success' })
    },
    onError: (error) => {
      setSnackbar({
        open: true,
        message: error.response?.data?.message || error.response?.data?.detail || t('devices.syncFailed'),
        severity: 'error',
      })
    },
  })

  const handleCreate = () => {
    setSelectedDevice(null)
    setFormOpen(true)
  }

  const handleEdit = (row) => {
    setSelectedDevice(row.device)
    setFormOpen(true)
  }

  const handleView = (row) => {
    setSelectedDevice(row.device)
    setViewOpen(true)
  }

  const handleDelete = (row) => {
    setSelectedDevice(row.device)
    setDeleteOpen(true)
  }

  const handleSync = (deviceId) => {
    syncMutation.mutate(deviceId)
  }

  const handleTestConnection = (deviceId) => {
    testConnectionMutation.mutate(deviceId)
  }

  const handleSyncAttendance = (deviceId) => {
    syncAttendanceMutation.mutate(deviceId)
  }

  const handleSubmit = (formData) => {
    if (selectedDevice) {
      updateMutation.mutate({ id: selectedDevice.id, data: formData })
    } else {
      createMutation.mutate(formData)
    }
  }

  const handleDeleteConfirm = () => {
    if (selectedDevice) {
      deleteMutation.mutate(selectedDevice.id)
    }
  }

  const handleBulkDelete = async (selectedIds) => {
    try {
      await Promise.all(selectedIds.map((id) => deleteDevice(id)))
      queryClient.invalidateQueries(['devices'])
      setSnackbar({ open: true, message: t('devices.deviceBulkDeleteSuccess', { count: selectedIds.length }), severity: 'success' })
    } catch (error) {
      setSnackbar({
        open: true,
        message: error.response?.data?.detail || t('devices.deviceBulkDeleteFailed'),
        severity: 'error',
      })
    }
  }

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress sx={{ color: 'primary.main' }} />
      </Box>
    )
  }

  const columns = [
    { id: 'name', label: t('devices.name'), sortable: true },
    { id: 'model', label: t('devices.model'), sortable: true },
    { id: 'ip_address', label: t('devices.ipAddress'), sortable: true },
    { id: 'branch', label: t('branches.title'), sortable: true },
    { id: 'grade_category', label: t('devices.gradeCategory'), sortable: true },
    { id: 'levels', label: t('devices.levels'), sortable: false },
    { id: 'status', label: t('devices.status'), sortable: true },
    { id: 'connection', label: t('devices.connection'), sortable: true },
  ]

  const getTagColor = (grade) => {
    const colors = {
      KINDERGARTEN: '#FF9800',
      PRIMARY: '#0ABAB5',
      INTERMEDIATE: '#9C27B0',
      SECONDARY: '#FF6B9D',
      AMERICAN_DIPLOMA: '#4CAF50',
    }
    return colors[grade] || '#9E9E9E'
  }

  const tableData = (data?.results || []).map((device) => ({
    id: device.id,
    name: device.name,
    model: device.model,
    ip_address: `${device.ip_address}:${device.port}`,
    branch: device.branch?.name || '-',
    grade_category: device.grade_category,
    levels: device.levels && device.levels.length > 0 
      ? device.levels.map(level => t(`students.levels.${level}`)).join(', ')
      : '-',
    status: device.status,
    connection: device.is_connected ? t('devices.connected') : t('devices.disconnected'),
    isFavorite: false,
    device: device,
  }))

  const viewFields = selectedDevice
    ? [
        { key: 'name', label: t('devices.deviceName') },
        { key: 'model', label: t('devices.model') },
        { key: 'ip_address', label: t('devices.ipAddress'), getValue: () => `${selectedDevice.ip_address}:${selectedDevice.port}` },
        { key: 'branch', label: t('branches.title'), getValue: () => selectedDevice.branch?.name || '-' },
        {
          key: 'grade_category',
          label: t('devices.gradeCategory'),
          chip: true,
          chipColor: getTagColor(selectedDevice.grade_category),
        },
        {
          key: 'levels',
          label: t('devices.levels'),
          getValue: () => selectedDevice.levels && selectedDevice.levels.length > 0
            ? selectedDevice.levels.map(level => t(`students.levels.${level}`)).join(', ')
            : '-',
        },
        { key: 'serial_number', label: t('devices.serialNumber'), getValue: () => selectedDevice.serial_number || '-' },
        {
          key: 'status',
          label: t('devices.status'),
          chip: true,
          chipColor: selectedDevice.status === 'ACTIVE' ? '#0ABAB5' : '#9E9E9E',
        },
        {
          key: 'connection',
          label: t('devices.connectionStatus'),
          getValue: () => (selectedDevice.is_connected ? t('devices.connected') : t('devices.disconnected')),
          chip: true,
          chipColor: selectedDevice.is_connected ? '#0ABAB5' : '#F44336',
        },
        {
          key: 'last_sync',
          label: t('devices.lastSync'),
          getValue: () =>
            selectedDevice.last_sync
              ? new Date(selectedDevice.last_sync).toLocaleString()
              : t('devices.never'),
        },
        {
          key: 'created_at',
          label: t('devices.createdAt'),
          getValue: () => (selectedDevice.created_at ? new Date(selectedDevice.created_at).toLocaleString() : '-'),
        },
      ]
    : []

  return (
    <>
      <DataTable
        title={t('devices.title')}
        data={tableData}
        columns={columns}
        searchValue={searchInput}
        onSearchChange={setSearchInput}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onRowClick={handleView}
        onCreateNew={handleCreate}
        onBulkDelete={handleBulkDelete}
        page={page - 1}
        rowsPerPage={15}
        totalCount={data?.count || 0}
        onPageChange={(newPage) => setPage(newPage + 1)}
        renderActions={(row) => [
          <MenuItem
            key="test-connection"
            onClick={(e) => {
              e.stopPropagation()
              handleTestConnection(row.device.id)
            }}
            disabled={testConnectionMutation.isLoading}
          >
            {testConnectionMutation.isLoading ? t('devices.testingConnection') : t('devices.testConnection')}
          </MenuItem>,
          <MenuItem
            key="sync-students"
            onClick={(e) => {
              e.stopPropagation()
              handleSync(row.device.id)
            }}
            disabled={syncMutation.isLoading}
          >
            <SyncIcon sx={{ mr: 1, fontSize: '1rem' }} />
            {syncMutation.isLoading ? t('devices.syncing') : t('devices.syncStudents')}
          </MenuItem>,
          <MenuItem
            key="sync-attendance"
            onClick={(e) => {
              e.stopPropagation()
              handleSyncAttendance(row.device.id)
            }}
            disabled={syncAttendanceMutation.isLoading}
          >
            <SyncIcon sx={{ mr: 1, fontSize: '1rem' }} />
            {syncAttendanceMutation.isLoading ? t('devices.syncing') : t('devices.syncAttendance')}
          </MenuItem>,
        ]}
        renderTags={(row) => [
          <Chip
            key="grade"
            label={row.grade_category}
            size="small"
            sx={{
              backgroundColor: getTagColor(row.grade_category),
              color: 'white',
              fontSize: '0.75rem',
              height: 24,
              fontWeight: 500,
            }}
          />,
          <Chip
            key="status"
            label={row.status === 'ACTIVE' ? t('devices.active') : row.status === 'INACTIVE' ? t('devices.inactive') : row.status}
            size="small"
            sx={{
              backgroundColor: row.status === 'ACTIVE' ? '#0ABAB5' : '#9E9E9E',
              color: 'white',
              fontSize: '0.75rem',
              height: 24,
              fontWeight: 500,
            }}
          />,
          <Chip
            key="connection"
            label={row.connection}
            size="small"
            variant="outlined"
            sx={{
              fontSize: '0.75rem',
              height: 24,
              borderColor: row.connection === t('devices.connected') ? '#0ABAB5' : '#F44336',
              color: row.connection === t('devices.connected') ? '#0ABAB5' : '#F44336',
            }}
          />,
        ]}
      />

      <DeviceForm
        open={formOpen}
        onClose={() => {
          setFormOpen(false)
          setSelectedDevice(null)
        }}
        onSubmit={handleSubmit}
        device={selectedDevice}
        loading={createMutation.isLoading || updateMutation.isLoading}
      />

      <ViewDialog
        open={viewOpen}
        onClose={() => {
          setViewOpen(false)
          setSelectedDevice(null)
        }}
        title={t('devices.deviceDetails')}
        data={selectedDevice}
        fields={viewFields}
        onTestConnection={handleTestConnection}
        testConnectionLoading={testConnectionMutation.isLoading}
      />

      <DeleteDialog
        open={deleteOpen}
        onClose={() => {
          setDeleteOpen(false)
          setSelectedDevice(null)
        }}
        onConfirm={handleDeleteConfirm}
        title={t('devices.deleteDevice')}
        message={t('devices.deleteDeviceConfirm', { name: selectedDevice?.name || t('common.thisDevice') })}
        loading={deleteMutation.isLoading}
      />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  )
}

export default Devices
