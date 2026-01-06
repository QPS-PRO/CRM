import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Box, CircularProgress, Snackbar, Alert } from '@mui/material'
import { getBranches, createBranch, updateBranch, deleteBranch } from '../api/branches'
import DataTable from '../components/DataTable'
import BranchForm from '../components/BranchForm'
import DeleteDialog from '../components/DeleteDialog'
import ViewDialog from '../components/ViewDialog'
import { useTranslation } from 'react-i18next'

function Branches() {
  const [searchInput, setSearchInput] = useState('')
  const [searchValue, setSearchValue] = useState('')
  const [page, setPage] = useState(1)
  const [formOpen, setFormOpen] = useState(false)
  const [viewOpen, setViewOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [selectedBranch, setSelectedBranch] = useState(null)
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
    queryKey: ['branches', page, searchValue],
    queryFn: () => getBranches({ page, page_size: 15, search: searchValue }),
    enabled: true,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    keepPreviousData: true,
    staleTime: 5000,
  })

  const createMutation = useMutation({
    mutationFn: createBranch,
    onSuccess: () => {
      queryClient.invalidateQueries(['branches'])
      setFormOpen(false)
      setSnackbar({ open: true, message: t('branches.branchCreated'), severity: 'success' })
    },
    onError: (error) => {
      setSnackbar({
        open: true,
        message: error.response?.data?.detail || t('branches.failedToCreate'),
        severity: 'error',
      })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => updateBranch(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['branches'])
      setFormOpen(false)
      setSelectedBranch(null)
      setSnackbar({ open: true, message: t('branches.branchUpdated'), severity: 'success' })
    },
    onError: (error) => {
      setSnackbar({
        open: true,
        message: error.response?.data?.detail || t('branches.failedToUpdate'),
        severity: 'error',
      })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteBranch,
    onSuccess: () => {
      queryClient.invalidateQueries(['branches'])
      setDeleteOpen(false)
      setSelectedBranch(null)
      setSnackbar({ open: true, message: t('branches.branchDeleted'), severity: 'success' })
    },
    onError: (error) => {
      setSnackbar({
        open: true,
        message: error.response?.data?.detail || t('branches.failedToDelete'),
        severity: 'error',
      })
    },
  })

  const handleCreate = () => {
    setSelectedBranch(null)
    setFormOpen(true)
  }

  const handleEdit = (row) => {
    setSelectedBranch(row.branch)
    setFormOpen(true)
  }

  const handleView = (row) => {
    setSelectedBranch(row.branch)
    setViewOpen(true)
  }

  const handleDelete = (row) => {
    setSelectedBranch(row.branch)
    setDeleteOpen(true)
  }

  const handleSubmit = (formData) => {
    if (selectedBranch) {
      updateMutation.mutate({ id: selectedBranch.id, data: formData })
    } else {
      createMutation.mutate(formData)
    }
  }

  const handleDeleteConfirm = () => {
    if (selectedBranch) {
      deleteMutation.mutate(selectedBranch.id)
    }
  }

  const handleBulkDelete = async (selectedIds) => {
    try {
      await Promise.all(selectedIds.map((id) => deleteBranch(id)))
      queryClient.invalidateQueries(['branches'])
      setSnackbar({ open: true, message: t('branches.branchBulkDeleteSuccess', { count: selectedIds.length }), severity: 'success' })
    } catch (error) {
      setSnackbar({
        open: true,
        message: error.response?.data?.detail || t('branches.branchBulkDeleteFailed'),
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
    { id: 'name', label: t('branches.name'), sortable: true },
    { id: 'address', label: t('branches.address'), sortable: true },
    { id: 'date_created', label: t('branches.dateCreated'), sortable: true },
  ]

  const tableData = (data?.results || []).map((branch) => ({
    id: branch.id,
    name: branch.name,
    address: branch.address,
    date_created: new Date(branch.created_at).toLocaleDateString('en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }),
    isFavorite: false,
    branch: branch,
  }))

  const viewFields = selectedBranch
    ? [
        { key: 'name', label: t('branches.name') },
        { key: 'address', label: t('branches.address') },
        {
          key: 'date_created',
          label: t('branches.dateCreated'),
          getValue: () => selectedBranch.created_at,
          format: (val) => (val ? new Date(val).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'),
        },
      ]
    : []

  return (
    <>
      <DataTable
        title={t('branches.title')}
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
      />

      <BranchForm
        open={formOpen}
        onClose={() => {
          setFormOpen(false)
          setSelectedBranch(null)
        }}
        onSubmit={handleSubmit}
        branch={selectedBranch}
        loading={createMutation.isLoading || updateMutation.isLoading}
      />

      <ViewDialog
        open={viewOpen}
        onClose={() => {
          setViewOpen(false)
          setSelectedBranch(null)
        }}
        title={t('branches.branchDetails')}
        data={selectedBranch}
        fields={viewFields}
      />

      <DeleteDialog
        open={deleteOpen}
        onClose={() => {
          setDeleteOpen(false)
          setSelectedBranch(null)
        }}
        onConfirm={handleDeleteConfirm}
        title={t('branches.deleteBranch')}
        message={t('branches.deleteBranchConfirm', { name: selectedBranch?.name || t('common.thisBranch') })}
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

export default Branches

