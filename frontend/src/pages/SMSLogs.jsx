import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useLanguage } from '../contexts/LanguageContext'
import {
  Box,
  CircularProgress,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Card,
  CardContent,
  Grid,
  Typography,
  Snackbar,
  Alert,
  Paper,
} from '@mui/material'
import { getSMSLogs, getSMSStatistics, deleteSMSLog } from '../api/smsLogs'
import { getBranches } from '../api/branches'
import DataTable from '../components/DataTable'
import { format } from 'date-fns'
import { formatTimestampInOriginalTimezone } from '../utils/dateFormat'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ErrorIcon from '@mui/icons-material/Error'
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty'

function SMSLogs() {
  const [searchInput, setSearchInput] = useState('')
  const [searchValue, setSearchValue] = useState('')
  const [page, setPage] = useState(1)
  const [sortBy, setSortBy] = useState('created_at')
  const [sortOrder, setSortOrder] = useState('desc')
  const [selectedBranch, setSelectedBranch] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' })
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  const { language } = useLanguage()

  // Sync search input to search value (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchValue(searchInput)
    }, 800)
    return () => clearTimeout(timer)
  }, [searchInput])

  const { data: branchesData } = useQuery({
    queryKey: ['branches'],
    queryFn: () => getBranches(),
  })

  const { data: statisticsData } = useQuery({
    queryKey: ['sms-statistics', selectedBranch, dateFrom, dateTo],
    queryFn: () => {
      const params = {}
      if (selectedBranch) params.branch = selectedBranch
      if (dateFrom) params.date_from = dateFrom
      if (dateTo) params.date_to = dateTo
      return getSMSStatistics(params)
    },
  })

  const { data, isLoading } = useQuery({
    queryKey: [
      'sms-logs',
      page,
      searchValue,
      sortBy,
      sortOrder,
      selectedBranch,
      selectedStatus,
      dateFrom,
      dateTo,
    ],
    queryFn: () => {
      const params = {
        page,
        page_size: 15,
        search: searchValue,
        ordering: sortOrder === 'asc' ? sortBy : `-${sortBy}`,
      }
      if (selectedBranch) params.branch = selectedBranch
      if (selectedStatus) params.status = selectedStatus
      if (dateFrom) params.date_from = dateFrom
      if (dateTo) params.date_to = dateTo
      return getSMSLogs(params)
    },
    enabled: true,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    keepPreviousData: true,
    staleTime: 5000,
  })

  const getStatusChip = (status) => {
    const statusConfig = {
      SENT: { color: 'success', label: t('sms.status.sent'), icon: <CheckCircleIcon fontSize="small" /> },
      FAILED: { color: 'error', label: t('sms.status.failed'), icon: <ErrorIcon fontSize="small" /> },
      PENDING: { color: 'warning', label: t('sms.status.pending'), icon: <HourglassEmptyIcon fontSize="small" /> },
    }

    const config = statusConfig[status] || { color: 'default', label: status, icon: null }
    return (
      <Chip
        icon={config.icon}
        label={config.label}
        color={config.color}
        size="small"
        sx={{ minWidth: 100 }}
      />
    )
  }

  const handleDelete = async (row) => {
    if (window.confirm(t('sms.deleteConfirm', { name: row.parent_name || row.record?.parent?.full_name || 'this SMS log' }))) {
      try {
        await deleteSMSLog(row.id)
        queryClient.invalidateQueries(['sms-logs'])
        queryClient.invalidateQueries(['sms-statistics'])
        setSnackbar({
          open: true,
          message: t('sms.deleteSuccess'),
          severity: 'success',
        })
      } catch (error) {
        setSnackbar({
          open: true,
          message: error.response?.data?.detail || t('sms.deleteFailed'),
          severity: 'error',
        })
      }
    }
  }

  const handleBulkDelete = async (selectedIds) => {
    try {
      await Promise.all(selectedIds.map((id) => deleteSMSLog(id)))
      queryClient.invalidateQueries(['sms-logs'])
      queryClient.invalidateQueries(['sms-statistics'])
      setSnackbar({
        open: true,
        message: t('sms.bulkDeleteSuccess', { count: selectedIds.length }),
        severity: 'success',
      })
    } catch (error) {
      setSnackbar({
        open: true,
        message: error.response?.data?.detail || t('sms.bulkDeleteFailed'),
        severity: 'error',
      })
    }
  }

  const columns = [
    { id: 'student_name', label: t('sms.studentName'), sortable: true },
    { id: 'parent_name', label: t('sms.parentName'), sortable: true },
    { id: 'phone_number', label: t('sms.phoneNumber'), sortable: false },
    { id: 'attendance_time', label: t('sms.attendanceTime'), sortable: true },
    { id: 'status', label: t('sms.statusLabel'), sortable: true },
    { id: 'sent_at', label: t('sms.sentAt'), sortable: true },
  ]

  const tableData = (data?.results || []).map((log) => ({
    id: log.id,
    student_name: log.student?.full_name || '-',
    parent_name: log.parent?.full_name || '-',
    phone_number: log.phone_number || '-',
    attendance_time: log.attendance?.timestamp
      ? formatTimestampInOriginalTimezone(log.attendance.timestamp, 'dd MMM, yyyy HH:mm')
      : '-',
    status: getStatusChip(log.status),
    sent_at: log.sent_at ? formatTimestampInOriginalTimezone(log.sent_at, 'dd MMM, yyyy HH:mm') : '-',
    record: log,
  }))

  if (isLoading && !data) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress sx={{ color: 'primary.main' }} />
      </Box>
    )
  }

  return (
    <Box>
      {/* Header Section */}
      <Box sx={{ mb: 4 }}>
        <Typography
          variant="h4"
          sx={{
            fontWeight: 700,
            mb: 1,
            color: 'text.primary',
          }}
        >
          {t('sms.smsLogs')}
        </Typography>
        <Typography
          variant="body1"
          sx={{
            color: 'text.secondary',
            fontSize: '1rem',
          }}
        >
          {t('sms.description')}
        </Typography>
      </Box>

      {/* Filters Section */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
          {t('reports.filters')}
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth>
              <InputLabel>{t('attendance.filterByBranch')}</InputLabel>
              <Select
                value={selectedBranch}
                label={t('attendance.filterByBranch')}
                onChange={(e) => setSelectedBranch(e.target.value)}
              >
                <MenuItem value="">{t('common.all')}</MenuItem>
                {branchesData?.results?.map((branch) => (
                  <MenuItem key={branch.id} value={branch.id}>
                    {branch.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth>
              <InputLabel>{t('sms.statusLabel')}</InputLabel>
              <Select
                value={selectedStatus}
                label={t('sms.statusLabel')}
                onChange={(e) => setSelectedStatus(e.target.value)}
              >
                <MenuItem value="">{t('common.all')}</MenuItem>
                <MenuItem value="SENT">{t('sms.status.sent')}</MenuItem>
                <MenuItem value="FAILED">{t('sms.status.failed')}</MenuItem>
                <MenuItem value="PENDING">{t('sms.status.pending')}</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <TextField
              label={t('attendance.dateFrom')}
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              InputLabelProps={{ shrink: true }}
              fullWidth
              inputProps={{ dir: 'ltr' }}
            />
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <TextField
              label={t('attendance.dateTo')}
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              InputLabelProps={{ shrink: true }}
              fullWidth
              inputProps={{ dir: 'ltr' }}
            />
          </Grid>
        </Grid>
      </Paper>

      {/* Statistics Cards */}
      {statisticsData && (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {t('sms.statistics.total')}
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 700, color: 'primary.main' }}>
                  {statisticsData.total || 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {t('sms.statistics.sent')}
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 700, color: '#0ABAB5' }}>
                  {statisticsData.sent || 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {t('sms.statistics.failed')}
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 700, color: '#FF6B9D' }}>
                  {statisticsData.failed || 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {t('sms.statistics.successRate')}
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 700, color: 'primary.main' }}>
                  {statisticsData.success_rate || 0}%
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Data Table */}
      <Paper sx={{ p: 0 }}>
        <DataTable
          columns={columns}
          data={tableData}
          page={page - 1}
          rowsPerPage={data?.page_size || 15}
          totalCount={data?.count || 0}
          onPageChange={(newPage) => setPage(newPage + 1)}
          onSortChange={(field, order) => {
            setSortBy(field)
            setSortOrder(order)
          }}
          sortBy={sortBy}
          sortOrder={sortOrder}
          searchValue={searchInput}
          onSearchChange={setSearchInput}
          onDelete={handleDelete}
          onBulkDelete={handleBulkDelete}
        />
      </Paper>

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
    </Box>
  )
}

export default SMSLogs
