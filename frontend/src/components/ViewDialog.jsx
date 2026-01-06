import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Divider,
  Chip,
} from '@mui/material'
import { styled } from '@mui/material/styles'
import { Sync as SyncIcon } from '@mui/icons-material'
import { useTranslation } from 'react-i18next'

const InfoRow = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  padding: theme.spacing(1.5, 0),
  '&:not(:last-child)': {
    borderBottom: `1px solid ${theme.palette.divider}`,
  },
}))

const Label = styled(Typography)(({ theme }) => ({
  fontWeight: 600,
  color: theme.palette.text.secondary,
  fontSize: '0.875rem',
}))

const Value = styled(Typography)(({ theme }) => ({
  color: theme.palette.text.primary,
  fontSize: '0.875rem',
}))

function ViewDialog({ open, onClose, title, data, fields = [], onTestConnection, testConnectionLoading }) {
  const { t } = useTranslation()
  if (!data) return null

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{title || t('common.viewDetails')}</DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 1 }}>
          {fields.map((field, index) => {
            let value
            if (field.getValue) {
              value = field.getValue(data)
            } else if (field.key) {
              value = data[field.key]
            } else {
              value = null
            }
            const displayValue = field.format && value ? field.format(value) : value

            return (
              <InfoRow key={index}>
                <Label>{field.label}:</Label>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {field.chip && displayValue ? (
                    <Chip
                      label={displayValue}
                      size="small"
                      sx={{
                        backgroundColor: field.chipColor || '#0ABAB5',
                        color: 'white',
                      }}
                    />
                  ) : (
                    <Value>{displayValue || '-'}</Value>
                  )}
                </Box>
              </InfoRow>
            )
          })}
        </Box>
      </DialogContent>
      <DialogActions>
        {onTestConnection && (
          <Button
            onClick={() => onTestConnection(data.id)}
            disabled={testConnectionLoading}
            startIcon={<SyncIcon />}
            variant="outlined"
          >
            {testConnectionLoading ? t('devices.testingConnection') : t('devices.testConnection')}
          </Button>
        )}
        <Button onClick={onClose}>{t('common.close')}</Button>
      </DialogActions>
    </Dialog>
  )
}

export default ViewDialog

