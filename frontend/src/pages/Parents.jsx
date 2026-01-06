import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  Box, 
  CircularProgress, 
  Avatar, 
  Snackbar, 
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  LinearProgress
} from '@mui/material'
import { getParents, createParent, updateParent, deleteParent, bulkUploadParents } from '../api/parents'
import DataTable from '../components/DataTable'
import ParentForm from '../components/ParentForm'
import DeleteDialog from '../components/DeleteDialog'
import ViewDialog from '../components/ViewDialog'
import { useTranslation } from 'react-i18next'
import UploadFileIcon from '@mui/icons-material/UploadFile'

function Parents() {
  const [searchInput, setSearchInput] = useState('')
  const [searchValue, setSearchValue] = useState('')
  const [page, setPage] = useState(1)
  const [formOpen, setFormOpen] = useState(false)
  const [viewOpen, setViewOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)
  const [selectedParent, setSelectedParent] = useState(null)
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
    queryKey: ['parents', page, searchValue],
    queryFn: () => getParents({ page, page_size: 15, search: searchValue }),
    enabled: true,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    keepPreviousData: true,
    staleTime: 5000,
  })

  const createMutation = useMutation({
    mutationFn: createParent,
    onSuccess: () => {
      queryClient.invalidateQueries(['parents'])
      setFormOpen(false)
      setSnackbar({ open: true, message: t('parents.parentCreated'), severity: 'success' })
    },
    onError: (error) => {
      setSnackbar({
        open: true,
        message: error.response?.data?.detail || t('parents.failedToCreate'),
        severity: 'error',
      })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => updateParent(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['parents'])
      setFormOpen(false)
      setSelectedParent(null)
      setSnackbar({ open: true, message: t('parents.parentUpdated'), severity: 'success' })
    },
    onError: (error) => {
      setSnackbar({
        open: true,
        message: error.response?.data?.detail || t('parents.failedToUpdate'),
        severity: 'error',
      })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteParent,
    onSuccess: () => {
      queryClient.invalidateQueries(['parents'])
      setDeleteOpen(false)
      setSelectedParent(null)
      setSnackbar({ open: true, message: t('parents.parentDeleted'), severity: 'success' })
    },
    onError: (error) => {
      setSnackbar({
        open: true,
        message: error.response?.data?.detail || t('parents.failedToDelete'),
        severity: 'error',
      })
    },
  })

  const uploadMutation = useMutation({
    mutationFn: bulkUploadParents,
    onSuccess: (data) => {
      queryClient.invalidateQueries(['parents'])
      setUploadOpen(false)
      setSelectedFile(null)
      const message = t('parents.uploadSuccess', {
        created: data.created || 0,
        updated: data.updated || 0,
        linked: data.students_linked || 0,
        errors: data.total_errors || 0
      })
      setSnackbar({ 
        open: true, 
        message: message,
        severity: data.total_errors > 0 ? 'warning' : 'success' 
      })
      if (data.errors && data.errors.length > 0) {
        console.error('Upload errors:', data.errors)
      }
    },
    onError: (error) => {
      setSnackbar({
        open: true,
        message: error.response?.data?.error || t('parents.uploadFailed'),
        severity: 'error',
      })
    },
  })

  const handleCreate = () => {
    setSelectedParent(null)
    setFormOpen(true)
  }

  const handleEdit = (row) => {
    setSelectedParent(row.parent)
    setFormOpen(true)
  }

  const handleView = (row) => {
    setSelectedParent(row.parent)
    setViewOpen(true)
  }

  const handleDelete = (row) => {
    setSelectedParent(row.parent)
    setDeleteOpen(true)
  }

  const handleSubmit = (formData) => {
    if (selectedParent) {
      updateMutation.mutate({ id: selectedParent.id, data: formData })
    } else {
      createMutation.mutate(formData)
    }
  }

  const handleDeleteConfirm = () => {
    if (selectedParent) {
      deleteMutation.mutate(selectedParent.id)
    }
  }

  const handleBulkDelete = async (selectedIds) => {
    try {
      await Promise.all(selectedIds.map((id) => deleteParent(id)))
      queryClient.invalidateQueries(['parents'])
      setSnackbar({ open: true, message: t('parents.parentBulkDeleteSuccess', { count: selectedIds.length }), severity: 'success' })
    } catch (error) {
      setSnackbar({
        open: true,
        message: error.response?.data?.detail || t('parents.parentBulkDeleteFailed'),
        severity: 'error',
      })
    }
  }

  const handleUploadClick = () => {
    setUploadOpen(true)
    setSelectedFile(null)
  }

  const handleFileSelect = (event) => {
    const file = event.target.files[0]
    if (file) {
      if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        setSelectedFile(file)
      } else {
        setSnackbar({
          open: true,
          message: t('parents.invalidFileFormat'),
          severity: 'error',
        })
      }
    }
  }

  const handleUpload = () => {
    if (selectedFile) {
      uploadMutation.mutate(selectedFile)
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
    { id: 'name', label: t('parents.name'), sortable: true },
    { id: 'email', label: t('parents.emailAddress'), sortable: true },
    { id: 'phone', label: t('parents.phone'), sortable: true },
    { id: 'student_name', label: t('parents.studentName'), sortable: false },
    { id: 'student_id', label: t('parents.studentId'), sortable: false },
    { id: 'address', label: t('parents.address'), sortable: true },
    { id: 'date_created', label: t('parents.dateCreated'), sortable: true },
  ]

  const tableData = (data?.results || []).map((parent) => {
    const students = parent.students || []
    const studentNames = students.map((s) => `${s.first_name} ${s.last_name}`).join(', ') || '-'
    const studentIds = students.map((s) => s.student_id).join(', ') || '-'
    
    return {
    id: parent.id,
    name: `${parent.first_name} ${parent.last_name}`,
    email: parent.email,
    phone: parent.phone_number || '-',
      student_name: studentNames,
      student_id: studentIds,
    address: parent.address || '-',
    date_created: new Date(parent.created_at).toLocaleDateString('en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }),
    isFavorite: false,
    parent: parent,
    }
  })

  const viewFields = selectedParent
    ? [
        { key: 'name', label: t('parents.name'), getValue: () => `${selectedParent.first_name} ${selectedParent.last_name}` },
        { key: 'email', label: t('parents.email') },
        { key: 'phone', label: t('parents.phoneNumber'), getValue: () => selectedParent.phone_number || '-' },
        { key: 'address', label: t('parents.address'), getValue: () => selectedParent.address || '-' },
        {
          key: 'students',
          label: t('parents.students'),
          getValue: () => {
            const students = selectedParent.students || []
            if (students.length === 0) return '-'
            return students.map((s) => `${s.full_name || `${s.first_name} ${s.last_name}`} (${s.student_id})`).join(', ')
          },
        },
        {
          key: 'date_created',
          label: t('parents.dateCreated'),
          getValue: () => selectedParent.created_at,
          format: (val) => (val ? new Date(val).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'),
        },
      ]
    : []

  return (
    <>
      <DataTable
        title={t('parents.title')}
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
        headerButtons={
          <Button
            variant="outlined"
            startIcon={<UploadFileIcon />}
            onClick={handleUploadClick}
            sx={{
              textTransform: 'none',
              borderRadius: 2,
              borderColor: 'primary.main',
              color: 'primary.main',
              '&:hover': {
                borderColor: 'primary.dark',
                backgroundColor: 'primary.light',
              },
            }}
          >
            {t('parents.uploadExcel')}
          </Button>
        }
        renderAvatar={(row) => (
          <Avatar
            sx={{
              bgcolor: '#0ABAB5',
              width: 36,
              height: 36,
              fontSize: '0.875rem',
              fontWeight: 600,
            }}
          >
            {row.name
              .split(' ')
              .map((n) => n[0])
              .join('')
              .toUpperCase()
              .slice(0, 2)}
          </Avatar>
        )}
      />

      <ParentForm
        open={formOpen}
        onClose={() => {
          setFormOpen(false)
          setSelectedParent(null)
        }}
        onSubmit={handleSubmit}
        parent={selectedParent}
        loading={createMutation.isLoading || updateMutation.isLoading}
      />

      <ViewDialog
        open={viewOpen}
        onClose={() => {
          setViewOpen(false)
          setSelectedParent(null)
        }}
        title={t('parents.parentDetails')}
        data={selectedParent}
        fields={viewFields}
      />

      <DeleteDialog
        open={deleteOpen}
        onClose={() => {
          setDeleteOpen(false)
          setSelectedParent(null)
        }}
        onConfirm={handleDeleteConfirm}
        title={t('parents.deleteParent')}
        message={t('parents.deleteParentConfirm', { name: selectedParent ? `${selectedParent.first_name} ${selectedParent.last_name}` : t('common.thisParent') })}
        loading={deleteMutation.isLoading}
      />

      <Dialog
        open={uploadOpen}
        onClose={() => {
          setUploadOpen(false)
          setSelectedFile(null)
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>{t('parents.uploadExcelTitle')}</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
              {t('parents.uploadExcelDescription')}
            </Typography>
            <Typography variant="body2" sx={{ mb: 2, fontSize: '0.875rem', color: 'text.secondary' }}>
              <strong>{t('parents.requiredColumns')}:</strong> first_name, last_name, email, phone_number, address, student_id (can be multiple IDs separated by comma or semicolon)
            </Typography>
            <input
              accept=".xlsx,.xls"
              style={{ display: 'none' }}
              id="file-upload-parents"
              type="file"
              onChange={handleFileSelect}
            />
            <label htmlFor="file-upload-parents">
              <Button
                variant="outlined"
                component="span"
                fullWidth
                startIcon={<UploadFileIcon />}
                sx={{ mb: 2 }}
              >
                {selectedFile ? selectedFile.name : t('parents.selectFile')}
              </Button>
            </label>
            {uploadMutation.isLoading && (
              <Box sx={{ mt: 2 }}>
                <LinearProgress />
                <Typography variant="body2" sx={{ mt: 1, textAlign: 'center' }}>
                  {t('parents.uploading')}
                </Typography>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setUploadOpen(false)
              setSelectedFile(null)
            }}
            disabled={uploadMutation.isLoading}
          >
            {t('common.cancel')}
          </Button>
          <Button
            onClick={handleUpload}
            variant="contained"
            disabled={!selectedFile || uploadMutation.isLoading}
          >
            {t('parents.upload')}
          </Button>
        </DialogActions>
      </Dialog>

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

export default Parents
