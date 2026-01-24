import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  Box,
  CircularProgress,
  Chip,
  Snackbar,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
} from '@mui/material'
import { getUsers, createUser, deleteUser } from '../api/users'
import DeleteDialog from '../components/DeleteDialog'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import { useAuth } from '../contexts/AuthContext'

function Users() {
  const [page, setPage] = useState(1)
  const [formOpen, setFormOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' })
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    role: 'VIEWER',
  })
  const [formErrors, setFormErrors] = useState({})
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  const { user: currentUser } = useAuth()

  const { data, isLoading } = useQuery({
    queryKey: ['users', page],
    queryFn: () => getUsers({ page, page_size: 15 }),
    enabled: true,
  })

  const createMutation = useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      queryClient.invalidateQueries(['users'])
      setFormOpen(false)
      setFormData({ username: '', email: '', password: '', role: 'VIEWER' })
      setFormErrors({})
      setSnackbar({ open: true, message: t('users.userCreated'), severity: 'success' })
    },
    onError: (error) => {
      const errorData = error.response?.data
      if (errorData) {
        setFormErrors(errorData)
      }
      setSnackbar({
        open: true,
        message: errorData?.error || errorData?.detail || t('users.failedToCreate'),
        severity: 'error',
      })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries(['users'])
      setDeleteOpen(false)
      setSelectedUser(null)
      setSnackbar({ open: true, message: t('users.userDeleted'), severity: 'success' })
    },
    onError: (error) => {
      setSnackbar({
        open: true,
        message: error.response?.data?.error || t('users.failedToDelete'),
        severity: 'error',
      })
    },
  })

  const handleOpenForm = () => {
    setFormData({ username: '', email: '', password: '', role: 'VIEWER' })
    setFormErrors({})
    setFormOpen(true)
  }

  const handleCloseForm = () => {
    setFormOpen(false)
    setFormData({ username: '', email: '', password: '', role: 'VIEWER' })
    setFormErrors({})
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    setFormErrors({})
    createMutation.mutate(formData)
  }

  const handleDelete = (user) => {
    setSelectedUser(user)
    setDeleteOpen(true)
  }

  const handleConfirmDelete = () => {
    if (selectedUser) {
      deleteMutation.mutate(selectedUser.id)
    }
  }

  const getRoleLabel = (role) => {
    if (role === 'ADMIN') return t('users.roleAdmin')
    if (role === 'VIEWER') return t('users.roleViewer')
    return role
  }

  const getRoleColor = (role) => {
    if (role === 'ADMIN') return '#FF6B9D'
    if (role === 'VIEWER') return '#0ABAB5'
    return '#666'
  }

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress sx={{ color: 'primary.main' }} />
      </Box>
    )
  }

  const users = data?.results || []
  const totalPages = data?.total_pages || 1

  return (
    <Box>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography
            variant="h4"
            sx={{
              fontWeight: 700,
              mb: 1,
              color: 'text.primary',
            }}
          >
            {t('users.title')}
          </Typography>
          <Typography
            variant="body1"
            sx={{
              color: 'text.secondary',
              fontSize: '1rem',
            }}
          >
            {t('users.description')}
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleOpenForm}
        >
          {t('users.createUser')}
        </Button>
      </Box>

      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>{t('users.username')}</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{t('users.email')}</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{t('users.role')}</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{t('users.dateJoined')}</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{t('common.actions')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id} hover>
                  <TableCell>{user.username}</TableCell>
                  <TableCell>{user.email || '-'}</TableCell>
                  <TableCell>
                    <Chip
                      label={getRoleLabel(user.role)}
                      size="small"
                      sx={{
                        backgroundColor: getRoleColor(user.role),
                        color: 'white',
                        fontWeight: 600,
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    {user.date_joined
                      ? new Date(user.date_joined).toLocaleDateString()
                      : '-'}
                  </TableCell>
                  <TableCell>
                    {user.id !== currentUser?.id && (
                      <IconButton
                        size="small"
                        onClick={() => handleDelete(user)}
                        color="error"
                      >
                        <DeleteIcon />
                      </IconButton>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Pagination */}
      {totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3, gap: 1 }}>
          <Button
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
          >
            {t('common.previous')}
          </Button>
          <Typography sx={{ alignSelf: 'center' }}>
            {t('common.page')} {page} {t('common.of')} {totalPages}
          </Typography>
          <Button
            disabled={page >= totalPages}
            onClick={() => setPage(page + 1)}
          >
            {t('common.next')}
          </Button>
        </Box>
      )}

      {/* Create User Dialog */}
      <Dialog open={formOpen} onClose={handleCloseForm} maxWidth="sm" fullWidth>
        <form onSubmit={handleSubmit}>
          <DialogTitle>{t('users.createUser')}</DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
              <TextField
                label={t('users.username')}
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                fullWidth
                required
                error={!!formErrors.username}
                helperText={formErrors.username?.[0] || ''}
              />
              <TextField
                label={t('users.email')}
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                fullWidth
                error={!!formErrors.email}
                helperText={formErrors.email?.[0] || ''}
              />
              <TextField
                label={t('users.password')}
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                fullWidth
                required
                error={!!formErrors.password}
                helperText={formErrors.password?.[0] || t('users.passwordHelper')}
              />
              <FormControl fullWidth>
                <InputLabel>{t('users.role')}</InputLabel>
                <Select
                  value={formData.role}
                  label={t('users.role')}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                >
                  <MenuItem value="VIEWER">{t('users.roleViewer')}</MenuItem>
                  <MenuItem value="ADMIN">{t('users.roleAdmin')}</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseForm}>{t('common.cancel')}</Button>
            <Button type="submit" variant="contained" disabled={createMutation.isLoading}>
              {createMutation.isLoading ? t('common.saving') : t('common.create')}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <DeleteDialog
        open={deleteOpen}
        onClose={() => {
          setDeleteOpen(false)
          setSelectedUser(null)
        }}
        onConfirm={handleConfirmDelete}
        title={t('users.deleteUser')}
        message={t('users.deleteUserConfirm', { name: selectedUser?.username })}
        isLoading={deleteMutation.isLoading}
      />

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  )
}

export default Users
