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

function BranchForm({ open, onClose, onSubmit, branch = null, loading = false }) {
  const { t } = useTranslation()
  const [formData, setFormData] = useState({
    name: '',
    address: '',
  })

  useEffect(() => {
    if (branch) {
      setFormData({
        name: branch.name || '',
        address: branch.address || '',
      })
    } else {
      setFormData({
        name: '',
        address: '',
      })
    }
  }, [branch, open])

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
        <DialogTitle>{branch ? t('branches.editBranch') : t('branches.createBranch')}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label={t('branches.branchName')}
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label={t('branches.address')}
                name="address"
                value={formData.address}
                onChange={handleChange}
                multiline
                rows={4}
                required
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={loading}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" variant="contained" disabled={loading}>
            {loading ? t('common.saving') : branch ? t('common.update') : t('common.create')}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}

export default BranchForm

