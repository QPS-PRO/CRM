import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Box,
  Chip,
  OutlinedInput,
} from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import { getBranches } from '../api/branches'
import { useTranslation } from 'react-i18next'

const Grade = {
  KINDERGARTEN: 'KINDERGARTEN',
  PRIMARY: 'PRIMARY',
  INTERMEDIATE: 'INTERMEDIATE',
  SECONDARY: 'SECONDARY',
  AMERICAN_DIPLOMA: 'AMERICAN_DIPLOMA',
}

const DeviceStatus = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  MAINTENANCE: 'MAINTENANCE',
}

function DeviceForm({ open, onClose, onSubmit, device = null, loading = false }) {
  const { t } = useTranslation()
  const [formData, setFormData] = useState({
    name: '',
    model: '',
    ip_address: '',
    port: 4370,
    grade_category: '',
    levels: [],
    branch_id: '',
    status: DeviceStatus.ACTIVE,
  })

  const { data: branchesData } = useQuery({
    queryKey: ['branches'],
    queryFn: () => getBranches(),
    enabled: open,
  })

  useEffect(() => {
    if (device) {
      setFormData({
        name: device.name || '',
        model: device.model || '',
        ip_address: device.ip_address || '',
        port: device.port || 4370,
        grade_category: device.grade_category || '',
        levels: device.levels || [],
        branch_id: device.branch?.id || '',
        status: device.status || DeviceStatus.ACTIVE,
      })
    } else {
      setFormData({
        name: '',
        model: '',
        ip_address: '',
        port: 4370,
        grade_category: '',
        levels: [],
        branch_id: '',
        status: DeviceStatus.ACTIVE,
      })
    }
  }, [device, open])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'port' ? parseInt(value) || 4370 : value,
    }))
  }

  const handleLevelsChange = (event) => {
    const {
      target: { value },
    } = event
    setFormData((prev) => ({
      ...prev,
      levels: typeof value === 'string' ? value.split(',').map(Number) : value,
    }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const submitData = {
      ...formData,
      branch_id: formData.branch_id ? parseInt(formData.branch_id) : null,
      levels: formData.levels.map(Number), // Ensure levels are numbers
    }
    onSubmit(submitData)
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>{device ? t('devices.editDevice') : t('devices.createDevice')}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label={t('devices.deviceName')}
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  helperText={t('devices.deviceNameHelper')}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label={t('devices.model')}
                  name="model"
                  value={formData.model}
                  onChange={handleChange}
                  required
                  placeholder="e.g., ZK702"
                  helperText={t('devices.modelHelper')}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth required>
                  <InputLabel>{t('branches.title')}</InputLabel>
                  <Select
                    name="branch_id"
                    value={formData.branch_id}
                    onChange={handleChange}
                    label={t('branches.title')}
                    disabled={!!device} // Disable when editing (one device per branch/grade)
                  >
                    {branchesData?.results?.map((branch) => (
                      <MenuItem key={branch.id} value={branch.id}>
                        {branch.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth required>
                  <InputLabel>{t('devices.gradeCategory')}</InputLabel>
                  <Select
                    name="grade_category"
                    value={formData.grade_category}
                    onChange={handleChange}
                    label={t('devices.gradeCategory')}
                    disabled={!!device} // Disable when editing (one device per grade)
                  >
                    <MenuItem value={Grade.KINDERGARTEN}>{t('students.grades.kindergarten')}</MenuItem>
                    <MenuItem value={Grade.PRIMARY}>{t('students.grades.primary')}</MenuItem>
                    <MenuItem value={Grade.INTERMEDIATE}>{t('students.grades.intermediate')}</MenuItem>
                    <MenuItem value={Grade.SECONDARY}>{t('students.grades.secondary')}</MenuItem>
                    <MenuItem value={Grade.AMERICAN_DIPLOMA}>{t('students.grades.americanDiploma')}</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth required>
                  <InputLabel>{t('devices.levels')}</InputLabel>
                  <Select
                    multiple
                    name="levels"
                    value={formData.levels}
                    onChange={handleLevelsChange}
                    input={<OutlinedInput label={t('devices.levels')} />}
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {selected.map((value) => (
                          <Chip key={value} label={t(`students.levels.${value}`)} size="small" />
                        ))}
                      </Box>
                    )}
                    disabled={!!device} // Disable when editing (one device per grade/levels)
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((level) => (
                      <MenuItem key={level} value={level}>
                        {t(`students.levels.${level}`)}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={8}>
                <TextField
                  fullWidth
                  label={t('devices.ipAddress')}
                  name="ip_address"
                  value={formData.ip_address}
                  onChange={handleChange}
                  required
                  type="text"
                  placeholder="192.168.1.100"
                  helperText={t('devices.ipAddressHelper')}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label={t('devices.port')}
                  name="port"
                  value={formData.port}
                  onChange={handleChange}
                  required
                  type="number"
                  inputProps={{ min: 1, max: 65535 }}
                  helperText={t('devices.portDefault')}
                />
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth required>
                  <InputLabel>{t('devices.status')}</InputLabel>
                  <Select
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    label={t('devices.status')}
                  >
                    <MenuItem value={DeviceStatus.ACTIVE}>{t('devices.active')}</MenuItem>
                    <MenuItem value={DeviceStatus.INACTIVE}>{t('devices.inactive')}</MenuItem>
                    <MenuItem value={DeviceStatus.MAINTENANCE}>{t('devices.maintenance')}</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={loading}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" variant="contained" disabled={loading}>
            {loading ? t('common.saving') : device ? t('common.update') : t('common.create')}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}

export default DeviceForm

