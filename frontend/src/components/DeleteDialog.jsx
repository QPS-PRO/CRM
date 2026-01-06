import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
} from '@mui/material'
import { useTranslation } from 'react-i18next'

function DeleteDialog({ open, onClose, onConfirm, title, message, loading = false }) {
  const { t } = useTranslation()
  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>{title || t('common.confirmDelete')}</DialogTitle>
      <DialogContent>
        <DialogContentText>{message || t('common.deleteConfirmMessage')}</DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          {t('common.cancel')}
        </Button>
        <Button onClick={onConfirm} color="error" variant="contained" disabled={loading}>
          {loading ? t('common.deleting') : t('common.delete')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default DeleteDialog

