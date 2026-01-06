import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Grid,
  CircularProgress,
  Snackbar,
  Alert,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material'
import { getAttendanceSettings, updateAttendanceSettings } from '../api/attendance'
import { Save as SaveIcon } from '@mui/icons-material'

function Settings() {
  const { t } = useTranslation()
  const [formData, setFormData] = useState({
    attendance_start_time: '08:00',
    attendance_end_time: '08:30',
    lateness_start_time: '08:30',
    lateness_end_time: '08:40',
    sms_template: 'Qurtubah School\n\nHello {parent_name}, Your child {student_name} has checked in at {time_attended}.\n\nThank you for your attention.',
    sync_frequency_hours: 0,
    sync_frequency_minutes: 0,
    sync_frequency_seconds: 30,
  })
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' })
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['attendance-settings'],
    queryFn: () => getAttendanceSettings(),
  })

  useEffect(() => {
    if (data) {
      setFormData({
        attendance_start_time: data.attendance_start_time || '08:00',
        attendance_end_time: data.attendance_end_time || '08:30',
        lateness_start_time: data.lateness_start_time || '08:30',
        lateness_end_time: data.lateness_end_time || '08:40',
        sms_template: data.sms_template || '',
        sync_frequency_hours: data.sync_frequency_hours || 0,
        sync_frequency_minutes: data.sync_frequency_minutes || 0,
        sync_frequency_seconds: data.sync_frequency_seconds || 30,
      })
    }
  }, [data])

  const updateMutation = useMutation({
    mutationFn: updateAttendanceSettings,
    onSuccess: () => {
      queryClient.invalidateQueries(['attendance-settings'])
      setSnackbar({ open: true, message: t('settings.savedSuccessfully'), severity: 'success' })
    },
    onError: (error) => {
      setSnackbar({
        open: true,
        message: error.response?.data?.detail || t('settings.failedToSave'),
        severity: 'error',
      })
    },
  })

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: name.includes('frequency') ? parseInt(value) || 0 : value,
    }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    updateMutation.mutate(formData)
  }

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress sx={{ color: 'primary.main' }} />
      </Box>
    )
  }

  return (
    <>
      <Box>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 1, color: 'text.primary' }}>
          {t('settings.title')}
        </Typography>
        <Typography variant="body1" sx={{ color: 'text.secondary', mb: 4 }}>
          {t('settings.description')}
        </Typography>

        <form onSubmit={handleSubmit}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
              {t('settings.attendanceTime')}
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label={t('settings.attendanceStartTime')}
                  name="attendance_start_time"
                  type="time"
                  value={formData.attendance_start_time}
                  onChange={handleChange}
                  InputLabelProps={{ shrink: true }}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label={t('settings.attendanceEndTime')}
                  name="attendance_end_time"
                  type="time"
                  value={formData.attendance_end_time}
                  onChange={handleChange}
                  InputLabelProps={{ shrink: true }}
                  required
                />
              </Grid>
            </Grid>
          </Paper>

          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
              {t('settings.latenessTime')}
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label={t('settings.latenessStartTime')}
                  name="lateness_start_time"
                  type="time"
                  value={formData.lateness_start_time}
                  onChange={handleChange}
                  InputLabelProps={{ shrink: true }}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label={t('settings.latenessEndTime')}
                  name="lateness_end_time"
                  type="time"
                  value={formData.lateness_end_time}
                  onChange={handleChange}
                  InputLabelProps={{ shrink: true }}
                  required
                />
              </Grid>
            </Grid>
          </Paper>

          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
              {t('settings.smsTemplate')}
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
              {t('settings.smsTemplateHelp')}
            </Typography>
            <TextField
              fullWidth
              label={t('settings.smsTemplate')}
              name="sms_template"
              value={formData.sms_template}
              onChange={handleChange}
              multiline
              rows={6}
              required
            />
          </Paper>

          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
              {t('settings.syncFrequency')}
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label={t('settings.hours')}
                  name="sync_frequency_hours"
                  type="number"
                  value={formData.sync_frequency_hours}
                  onChange={handleChange}
                  inputProps={{ min: 0, max: 23 }}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label={t('settings.minutes')}
                  name="sync_frequency_minutes"
                  type="number"
                  value={formData.sync_frequency_minutes}
                  onChange={handleChange}
                  inputProps={{ min: 0, max: 59 }}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label={t('settings.seconds')}
                  name="sync_frequency_seconds"
                  type="number"
                  value={formData.sync_frequency_seconds}
                  onChange={handleChange}
                  inputProps={{ min: 0, max: 59 }}
                  required
                />
              </Grid>
            </Grid>
            <Typography variant="caption" sx={{ color: 'text.secondary', mt: 1, display: 'block' }}>
              {t('settings.syncFrequencyHelp')}
            </Typography>
          </Paper>

          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
            <Button
              type="submit"
              variant="contained"
              startIcon={<SaveIcon />}
              disabled={updateMutation.isLoading}
            >
              {updateMutation.isLoading ? t('common.saving') : t('common.save')}
            </Button>
          </Box>
        </form>
      </Box>

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

export default Settings

