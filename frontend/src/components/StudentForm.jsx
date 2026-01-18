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
  IconButton,
  Typography,
  Divider,
  Paper,
  Autocomplete,
  Popper,
} from '@mui/material'
import { Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { getAllParents } from '../api/parents'
import { getBranches } from '../api/branches'

const Grade = {
  KINDERGARTEN: 'KINDERGARTEN',
  PRIMARY: 'PRIMARY',
  INTERMEDIATE: 'INTERMEDIATE',
  SECONDARY: 'SECONDARY',
  AMERICAN_DIPLOMA: 'AMERICAN_DIPLOMA',
}

const Gender = {
  M: 'M',
  F: 'F',
}

// Custom Popper component that always opens downward
const CustomPopper = (props) => {
  return (
    <Popper
      {...props}
      placement="bottom-start"
      modifiers={[
        ...(props.modifiers || []),
        {
          name: 'flip',
          enabled: false,
        },
        {
          name: 'preventOverflow',
          enabled: false,
        },
        {
          name: 'offset',
          enabled: true,
          options: {
            offset: [0, 4],
          },
        },
      ]}
    />
  )
}

function StudentForm({ open, onClose, onSubmit, student = null, loading = false }) {
  const { t } = useTranslation()
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    student_id: '',
    grade: '',
    level: '',
    class_name: '',
    gender: '',
    date_of_birth: '',
    branch_id: '',
    parent_ids: [],
    is_active: true,
  })

  const [newParents, setNewParents] = useState([])
  const [showNewParentForm, setShowNewParentForm] = useState(false)

  const { data: parentsData } = useQuery({
    queryKey: ['parents', 'all'],
    queryFn: async () => {
      // Fetch all parents using the new API endpoint
      const allParents = await getAllParents()
      // Return in the same format as a paginated response for compatibility
      return {
        results: Array.isArray(allParents) ? allParents : [],
        count: Array.isArray(allParents) ? allParents.length : 0,
      }
    },
    enabled: open,
  })

  const { data: branchesData } = useQuery({
    queryKey: ['branches'],
    queryFn: () => getBranches(),
    enabled: open,
  })

  useEffect(() => {
    if (student) {
      // Format date for input field (YYYY-MM-DD)
      const dateOfBirth = student.date_of_birth
        ? new Date(student.date_of_birth).toISOString().split('T')[0]
        : ''
      
      // Get parent IDs from the parents array
      const parentIds = student.parents?.map((p) => p.id) || []
      
      setFormData({
        first_name: student.first_name || '',
        last_name: student.last_name || '',
        student_id: student.student_id || '',
        grade: student.grade || '',
        level: student.level || '',
        class_name: student.class_name || '',
        gender: student.gender || '',
        date_of_birth: dateOfBirth,
        branch_id: student.branch?.id || '',
        parent_ids: parentIds,
        is_active: student.is_active ?? true,
      })
      setNewParents([])
    } else {
      setFormData({
        first_name: '',
        last_name: '',
        student_id: '',
        grade: '',
        level: '',
        class_name: '',
        gender: '',
        date_of_birth: '',
        branch_id: '',
        parent_ids: [],
        is_active: true,
      })
      setNewParents([])
    }
    setShowNewParentForm(false)
  }, [student, open])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleAddNewParent = () => {
    setNewParents((prev) => [
      ...prev,
      {
        first_name: '',
        last_name: '',
        email: '',
        phone_number: '',
        address: '',
      },
    ])
    setShowNewParentForm(true)
  }

  const handleRemoveNewParent = (index) => {
    setNewParents((prev) => prev.filter((_, i) => i !== index))
  }

  const handleNewParentChange = (index, field, value) => {
    setNewParents((prev) =>
      prev.map((parent, i) => (i === index ? { ...parent, [field]: value } : parent))
    )
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const submitData = {
      ...formData,
      branch_id: formData.branch_id ? parseInt(formData.branch_id) : null,
      parent_ids: formData.parent_ids.map((id) => (typeof id === 'string' ? parseInt(id) : id)),
      new_parents: newParents.filter(
        (p) => p.first_name || p.last_name || p.email
      ), // Only include parents with at least one field filled
    }
    onSubmit(submitData)
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>{student ? t('students.editStudent') : t('students.createStudent')}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label={t('students.firstName')}
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleChange}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label={t('students.lastName')}
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleChange}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label={t('students.studentId')}
                  name="student_id"
                  value={formData.student_id}
                  onChange={handleChange}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth required>
                  <InputLabel>{t('students.grade')}</InputLabel>
                  <Select
                    name="grade"
                    value={formData.grade}
                    onChange={handleChange}
                    label={t('students.grade')}
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
                <FormControl fullWidth>
                  <InputLabel>{t('students.level')}</InputLabel>
                  <Select
                    name="level"
                    value={formData.level}
                    onChange={handleChange}
                    label={t('students.level')}
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((level) => (
                      <MenuItem key={level} value={level}>
                        {t(`students.levels.${level}`)}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label={t('students.class')}
                  name="class_name"
                  value={formData.class_name}
                  onChange={handleChange}
                  inputProps={{ maxLength: 2 }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth required>
                  <InputLabel>{t('students.gender')}</InputLabel>
                  <Select
                    name="gender"
                    value={formData.gender}
                    onChange={handleChange}
                    label={t('students.gender')}
                  >
                    <MenuItem value={Gender.M}>{t('students.genders.male')}</MenuItem>
                    <MenuItem value={Gender.F}>{t('students.genders.female')}</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label={t('students.dateOfBirth')}
                  name="date_of_birth"
                  type="date"
                  value={formData.date_of_birth}
                  onChange={handleChange}
                  InputLabelProps={{
                    shrink: true,
                  }}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth required>
                  <InputLabel>{t('students.selectBranch')}</InputLabel>
                  <Select
                    name="branch_id"
                    value={formData.branch_id}
                    onChange={handleChange}
                    label={t('students.selectBranch')}
                  >
                    {branchesData?.results?.map((branch) => (
                      <MenuItem key={branch.id} value={branch.id}>
                        {branch.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <Autocomplete
                  multiple
                  options={parentsData?.results || []}
                  getOptionLabel={(option) => {
                    if (typeof option === 'object' && option !== null) {
                      return `${option.first_name} ${option.last_name}${option.email ? ` (${option.email})` : ''}`
                    }
                    // Fallback for when option is an ID (shouldn't happen, but just in case)
                    const parent = parentsData?.results?.find((p) => p.id === option)
                    return parent ? `${parent.first_name} ${parent.last_name}` : ''
                  }}
                  value={
                    formData.parent_ids
                      ? parentsData?.results?.filter((parent) => formData.parent_ids.includes(parent.id)) || []
                      : []
                  }
                  onChange={(event, newValue) => {
                    setFormData((prev) => ({
                      ...prev,
                      parent_ids: newValue.map((parent) => parent.id),
                    }))
                  }}
                  filterSelectedOptions
                  components={{
                    Popper: CustomPopper,
                  }}
                  ListboxProps={{
                    style: {
                      maxHeight: '300px',
                    },
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label={t('students.selectParents')}
                      placeholder={t('students.selectParents')}
                    />
                  )}
                  renderTags={(value, getTagProps) =>
                    value.map((parent, index) => (
                      <Chip
                        {...getTagProps({ index })}
                        key={parent.id}
                        label={`${parent.first_name} ${parent.last_name}`}
                        size="small"
                      />
                    ))
                  }
                  isOptionEqualToValue={(option, value) => option.id === value.id}
                />
              </Grid>

              <Grid item xs={12}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="subtitle2">{t('students.newParents')}</Typography>
                  <Button
                    startIcon={<AddIcon />}
                    onClick={handleAddNewParent}
                    size="small"
                    variant="outlined"
                  >
                    {t('students.addParent')}
                  </Button>
                </Box>
                {newParents.length > 0 && (
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    {newParents.map((newParent, index) => (
                      <Box key={index} sx={{ mb: 2 }}>
                        {index > 0 && <Divider sx={{ my: 2 }} />}
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                          <Typography variant="subtitle2">{t('students.newParent')} {index + 1}</Typography>
                          <IconButton
                            size="small"
                            onClick={() => handleRemoveNewParent(index)}
                            color="error"
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Box>
                        <Grid container spacing={2}>
                          <Grid item xs={12} sm={6}>
                            <TextField
                              fullWidth
                              size="small"
                              label={t('students.firstName')}
                              value={newParent.first_name}
                              onChange={(e) => handleNewParentChange(index, 'first_name', e.target.value)}
                            />
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <TextField
                              fullWidth
                              size="small"
                              label={t('students.lastName')}
                              value={newParent.last_name}
                              onChange={(e) => handleNewParentChange(index, 'last_name', e.target.value)}
                            />
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <TextField
                              fullWidth
                              size="small"
                              label={t('parents.email')}
                              type="email"
                              value={newParent.email}
                              onChange={(e) => handleNewParentChange(index, 'email', e.target.value)}
                            />
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <TextField
                              fullWidth
                              size="small"
                              label={t('parents.phoneNumber')}
                              value={newParent.phone_number}
                              onChange={(e) => handleNewParentChange(index, 'phone_number', e.target.value)}
                              inputProps={{ maxLength: 15 }}
                            />
                          </Grid>
                          <Grid item xs={12}>
                            <TextField
                              fullWidth
                              size="small"
                              label={t('parents.address')}
                              multiline
                              rows={2}
                              value={newParent.address}
                              onChange={(e) => handleNewParentChange(index, 'address', e.target.value)}
                            />
                          </Grid>
                        </Grid>
                      </Box>
                    ))}
                  </Paper>
                )}
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>{t('common.status')}</InputLabel>
                  <Select
                    name="is_active"
                    value={formData.is_active}
                    onChange={handleChange}
                    label={t('common.status')}
                  >
                    <MenuItem value={true}>{t('common.active')}</MenuItem>
                    <MenuItem value={false}>{t('common.inactive')}</MenuItem>
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
            {loading ? t('common.saving') : student ? t('common.update') : t('common.create')}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}

export default StudentForm

