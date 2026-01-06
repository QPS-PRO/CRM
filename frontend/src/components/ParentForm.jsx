import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
} from '@mui/material'
import { useTranslation } from 'react-i18next'

function ParentForm({ open, onClose, onSubmit, parent = null, loading = false }) {
  const { t } = useTranslation()
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone_number: '',
    address: '',
  })

  useEffect(() => {
    if (parent) {
      setFormData({
        first_name: parent.first_name || '',
        last_name: parent.last_name || '',
        email: parent.email || '',
        phone_number: parent.phone_number || '',
        address: parent.address || '',
      })
    } else {
      setFormData({
        first_name: '',
        last_name: '',
        email: '',
        phone_number: '',
        address: '',
      })
    }
  }, [parent, open])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit(formData)
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>{parent ? t('parents.editParent') : t('parents.createParent')}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label={t('parents.firstName')}
                name="first_name"
                value={formData.first_name}
                onChange={handleChange}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label={t('parents.lastName')}
                name="last_name"
                value={formData.last_name}
                onChange={handleChange}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label={t('parents.email')}
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label={t('parents.phoneNumber')}
                name="phone_number"
                value={formData.phone_number}
                onChange={handleChange}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label={t('parents.address')}
                name="address"
                value={formData.address}
                onChange={handleChange}
                multiline
                rows={3}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={loading}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" variant="contained" disabled={loading}>
            {loading ? t('common.saving') : parent ? t('common.update') : t('common.create')}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}

export default ParentForm

