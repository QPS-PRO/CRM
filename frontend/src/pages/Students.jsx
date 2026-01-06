import { useState, useEffect, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { 
  Box, 
  CircularProgress, 
  Chip, 
  Avatar, 
  Snackbar, 
  Alert, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  LinearProgress
} from '@mui/material'
import { getStudents, createStudent, updateStudent, deleteStudent, bulkUploadStudents } from '../api/students'
import { getBranches } from '../api/branches'
import DataTable from '../components/DataTable'
import StudentForm from '../components/StudentForm'
import DeleteDialog from '../components/DeleteDialog'
import ViewDialog from '../components/ViewDialog'
import UploadFileIcon from '@mui/icons-material/UploadFile'

function Students() {
  const [searchInput, setSearchInput] = useState('')
  const [searchValue, setSearchValue] = useState('')
  const [selectedBranch, setSelectedBranch] = useState('')
  const [selectedGrade, setSelectedGrade] = useState('')
  const [selectedLevel, setSelectedLevel] = useState('')
  const [selectedClass, setSelectedClass] = useState('')
  const [page, setPage] = useState(1)
  const [formOpen, setFormOpen] = useState(false)
  const [viewOpen, setViewOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)
  const [selectedStudent, setSelectedStudent] = useState(null)
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

  const { data: branchesData } = useQuery({
    queryKey: ['branches'],
    queryFn: () => getBranches(),
  })

  const { data, isLoading } = useQuery({
    queryKey: ['students', page, searchValue, selectedBranch, selectedGrade, selectedLevel, selectedClass],
    queryFn: () => {
      const params = { page, page_size: 15, search: searchValue }
      if (selectedBranch) params.branch = selectedBranch
      if (selectedGrade) params.grade = selectedGrade
      if (selectedLevel) params.level = selectedLevel
      if (selectedClass) params.class_name = selectedClass
      return getStudents(params)
    },
    enabled: true,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    keepPreviousData: true,
    staleTime: 5000,
  })

  const createMutation = useMutation({
    mutationFn: createStudent,
    onSuccess: () => {
      queryClient.invalidateQueries(['students'])
      setFormOpen(false)
      setSnackbar({ open: true, message: t('students.studentCreated'), severity: 'success' })
    },
    onError: (error) => {
      setSnackbar({
        open: true,
        message: error.response?.data?.detail || t('students.failedToCreate'),
        severity: 'error',
      })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => updateStudent(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['students'])
      setFormOpen(false)
      setSelectedStudent(null)
      setSnackbar({ open: true, message: t('students.studentUpdated'), severity: 'success' })
    },
    onError: (error) => {
      setSnackbar({
        open: true,
        message: error.response?.data?.detail || t('students.failedToUpdate'),
        severity: 'error',
      })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteStudent,
    onSuccess: () => {
      queryClient.invalidateQueries(['students'])
      setDeleteOpen(false)
      setSelectedStudent(null)
      setSnackbar({ open: true, message: t('students.studentDeleted'), severity: 'success' })
    },
    onError: (error) => {
      setSnackbar({
        open: true,
        message: error.response?.data?.detail || t('students.failedToDelete'),
        severity: 'error',
      })
    },
  })

  const uploadMutation = useMutation({
    mutationFn: bulkUploadStudents,
    onSuccess: (data) => {
      queryClient.invalidateQueries(['students'])
      setUploadOpen(false)
      setSelectedFile(null)
      const message = t('students.uploadSuccess', {
        created: data.created || 0,
        updated: data.updated || 0,
        errors: data.total_errors || 0
      })
      setSnackbar({ 
        open: true, 
        message: message,
        severity: data.total_errors > 0 ? 'warning' : 'success' 
      })
      if (data.errors && data.errors.length > 0) {
        console.error('Upload errors:', data.errors)
      }
    },
    onError: (error) => {
      setSnackbar({
        open: true,
        message: error.response?.data?.error || t('students.uploadFailed'),
        severity: 'error',
      })
    },
  })

  const handleCreate = () => {
    setSelectedStudent(null)
    setFormOpen(true)
  }

  const handleEdit = (row) => {
    setSelectedStudent(row.student)
    setFormOpen(true)
  }

  const handleView = (row) => {
    setSelectedStudent(row.student)
    setViewOpen(true)
  }

  const handleDelete = (row) => {
    setSelectedStudent(row.student)
    setDeleteOpen(true)
  }

  const handleSubmit = (formData) => {
    // The API now expects parent_ids (array) and new_parents (array)
    const submitData = {
      ...formData,
      parent_ids: formData.parent_ids || [],
      new_parents: formData.new_parents || [],
    }
    if (selectedStudent) {
      updateMutation.mutate({ id: selectedStudent.id, data: submitData })
    } else {
      createMutation.mutate(submitData)
    }
  }

  const handleDeleteConfirm = () => {
    if (selectedStudent) {
      deleteMutation.mutate(selectedStudent.id)
    }
  }

  const handleBulkDelete = async (selectedIds) => {
    try {
      await Promise.all(selectedIds.map((id) => deleteStudent(id)))
      queryClient.invalidateQueries(['students'])
      setSnackbar({ open: true, message: t('students.bulkDeleteSuccess', { count: selectedIds.length }), severity: 'success' })
    } catch (error) {
      setSnackbar({
        open: true,
        message: error.response?.data?.detail || t('students.bulkDeleteFailed'),
        severity: 'error',
      })
    }
  }

  const handleUploadClick = () => {
    setUploadOpen(true)
    setSelectedFile(null)
  }

  const handleFileSelect = (event) => {
    const file = event.target.files[0]
    if (file) {
      if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        setSelectedFile(file)
      } else {
        setSnackbar({
          open: true,
          message: t('students.invalidFileFormat'),
          severity: 'error',
        })
      }
    }
  }

  const handleUpload = () => {
    if (selectedFile) {
      uploadMutation.mutate(selectedFile)
    }
  }

  const columns = [
    { id: 'name', label: t('students.name'), sortable: true },
    { id: 'student_id', label: t('students.studentId'), sortable: true },
    { id: 'branch', label: t('students.branch'), sortable: true },
    { id: 'grade', label: t('students.grade'), sortable: true },
    { id: 'level', label: t('students.level'), sortable: true },
    { id: 'class', label: t('students.class'), sortable: true },
    { id: 'gender', label: t('students.gender'), sortable: true },
    { id: 'parent', label: t('students.parent'), sortable: true },
    { id: 'status', label: t('students.status'), sortable: true },
  ]

  const getTagColor = (grade) => {
    const colors = {
      PRIMARY: '#0ABAB5',
      SECONDARY: '#FF6B9D',
      HIGH_SCHOOL: '#4CAF50',
      KINDERGARTEN: '#FF9800',
    }
    return colors[grade] || '#9E9E9E'
  }

  const tableData = useMemo(() => {
    if (!data?.results) return []
    return data.results.map((student) => ({
    id: student.id,
    name: student.full_name || `${student.first_name} ${student.last_name}`,
    student_id: student.student_id,
    branch: student.branch?.name || '-',
    grade: student.grade,
    level: student.level || '-',
    class: student.class_name || '-',
    gender: student.gender === 'M' ? t('students.genders.male') : student.gender === 'F' ? t('students.genders.female') : student.gender,
    parent: student.parents && student.parents.length > 0
      ? student.parents.map((p) => `${p.first_name} ${p.last_name}`).join(', ')
      : '-',
    status: student.is_active ? t('common.active') : t('common.inactive'),
    isFavorite: false,
    student: student,
  }))
  }, [data?.results])

  const branches = branchesData?.results || []
  const grades = [
    { value: 'PRIMARY', label: t('students.grades.primary') },
    { value: 'SECONDARY', label: t('students.grades.secondary') },
    { value: 'HIGH_SCHOOL', label: t('students.grades.highSchool') },
    { value: 'KINDERGARTEN', label: t('students.grades.kindergarten') },
  ]

  const viewFields = useMemo(() => {
    if (!selectedStudent) return []
    return [
      { key: 'name', label: t('students.viewFields.name'), getValue: () => selectedStudent.full_name },
      { key: 'student_id', label: t('students.viewFields.studentId') },
      { key: 'branch', label: t('students.viewFields.branch'), getValue: () => selectedStudent.branch?.name || '-' },
      { key: 'grade', label: t('students.viewFields.grade'), chip: true, chipColor: getTagColor(selectedStudent.grade) },
      { key: 'level', label: t('students.viewFields.level'), getValue: () => selectedStudent.level || '-' },
      { key: 'class_name', label: t('students.viewFields.class'), getValue: () => selectedStudent.class_name || '-' },
      {
        key: 'gender',
        label: t('students.viewFields.gender'),
        getValue: () => selectedStudent.gender === 'M' ? t('students.genders.male') : selectedStudent.gender === 'F' ? t('students.genders.female') : selectedStudent.gender,
      },
      {
        key: 'date_of_birth',
        label: t('students.viewFields.dateOfBirth'),
        getValue: () => selectedStudent.date_of_birth,
        format: (val) => (val ? new Date(val).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' }) : '-'),
      },
      {
        key: 'parents',
        label: t('students.viewFields.parents'),
        getValue: () =>
          selectedStudent.parents && selectedStudent.parents.length > 0
            ? selectedStudent.parents.map((p) => `${p.first_name} ${p.last_name}`).join(', ')
            : '-',
      },
      {
        key: 'parent_emails',
        label: t('students.viewFields.parentEmails'),
        getValue: () =>
          selectedStudent.parents && selectedStudent.parents.length > 0
            ? selectedStudent.parents.map((p) => p.email).filter(Boolean).join(', ') || '-'
            : '-',
      },
      {
        key: 'parent_phones',
        label: t('students.viewFields.parentPhones'),
        getValue: () =>
          selectedStudent.parents && selectedStudent.parents.length > 0
            ? selectedStudent.parents.map((p) => p.phone_number).filter(Boolean).join(', ') || '-'
            : '-',
      },
      {
        key: 'status',
        label: t('students.viewFields.status'),
        getValue: () => {
          const isActive = selectedStudent.is_active !== undefined ? selectedStudent.is_active : true
          return isActive ? t('common.active') : t('common.inactive')
        },
        chip: true,
        chipColor: (selectedStudent.is_active !== undefined ? selectedStudent.is_active : true) ? '#0ABAB5' : '#9E9E9E',
      },
    ]
  }, [selectedStudent, t])

  return (
    <>
      {isLoading && !data && (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress sx={{ color: 'primary.main' }} />
        </Box>
      )}
      <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>{t('students.filterByBranch')}</InputLabel>
          <Select
            value={selectedBranch}
            label={t('students.filterByBranch')}
            onChange={(e) => setSelectedBranch(e.target.value)}
          >
            <MenuItem value="">{t('students.allBranches')}</MenuItem>
            {branches.map((branch) => (
              <MenuItem key={branch.id} value={branch.id}>
                {branch.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>{t('students.filterByGrade')}</InputLabel>
          <Select
            value={selectedGrade}
            label={t('students.filterByGrade')}
            onChange={(e) => setSelectedGrade(e.target.value)}
          >
            <MenuItem value="">{t('students.allGrades')}</MenuItem>
            {grades.map((grade) => (
              <MenuItem key={grade.value} value={grade.value}>
                {grade.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>{t('students.filterByLevel')}</InputLabel>
          <Select
            value={selectedLevel}
            label={t('students.filterByLevel')}
            onChange={(e) => setSelectedLevel(e.target.value)}
          >
            <MenuItem value="">{t('attendance.allLevels')}</MenuItem>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((level) => (
              <MenuItem key={level} value={level}>
                {t(`students.levels.${level}`)}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>{t('students.filterByClass')}</InputLabel>
          <Select
            value={selectedClass}
            label={t('students.filterByClass')}
            onChange={(e) => setSelectedClass(e.target.value)}
          >
            <MenuItem value="">{t('students.allClasses')}</MenuItem>
            {Array.from(new Set(data?.results?.map(s => s.class_name).filter(Boolean) || [])).sort().map((class_name) => (
              <MenuItem key={class_name} value={class_name}>
                {class_name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>
      <DataTable
        title={t('students.title')}
        data={tableData}
        columns={columns}
        searchValue={searchInput}
        onSearchChange={setSearchInput}
        loading={isLoading && !!data}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onRowClick={handleView}
        onCreateNew={handleCreate}
        onBulkDelete={handleBulkDelete}
        page={page - 1}
        rowsPerPage={15}
        totalCount={data?.count || 0}
        onPageChange={(newPage) => setPage(newPage + 1)}
        headerButtons={
          <Button
            variant="outlined"
            startIcon={<UploadFileIcon />}
            onClick={handleUploadClick}
            sx={{
              textTransform: 'none',
              borderRadius: 2,
              borderColor: 'primary.main',
              color: 'primary.main',
              '&:hover': {
                borderColor: 'primary.dark',
                backgroundColor: 'primary.light',
              },
            }}
          >
            {t('students.uploadExcel')}
          </Button>
        }
        renderAvatar={(row) => (
          <Avatar
            sx={{
              bgcolor: '#0ABAB5',
              width: 36,
              height: 36,
              fontSize: '0.875rem',
              fontWeight: 600,
            }}
          >
            {row.name
              .split(' ')
              .map((n) => n[0])
              .join('')
              .toUpperCase()
              .slice(0, 2)}
          </Avatar>
        )}
        renderTags={(row) => [
          <Chip
            key="grade"
            label={row.grade}
            size="small"
            sx={{
              backgroundColor: getTagColor(row.grade),
              color: 'white',
              fontSize: '0.75rem',
              height: 24,
              fontWeight: 500,
            }}
          />,
          <Chip
            key="status"
            label={row.status}
            size="small"
            variant="outlined"
            sx={{
              fontSize: '0.75rem',
              height: 24,
            }}
          />,
        ]}
      />

      <StudentForm
        open={formOpen}
        onClose={() => {
          setFormOpen(false)
          setSelectedStudent(null)
        }}
        onSubmit={handleSubmit}
        student={selectedStudent}
        loading={createMutation.isLoading || updateMutation.isLoading}
      />

      <ViewDialog
        open={viewOpen}
        onClose={() => {
          setViewOpen(false)
          setSelectedStudent(null)
        }}
        title={t('students.studentDetails')}
        data={selectedStudent}
        fields={viewFields}
      />

      <DeleteDialog
        open={deleteOpen}
        onClose={() => {
          setDeleteOpen(false)
          setSelectedStudent(null)
        }}
        onConfirm={handleDeleteConfirm}
        title={t('students.deleteStudent')}
        message={t('students.deleteStudentConfirm', { name: selectedStudent?.full_name || t('common.student') })}
        loading={deleteMutation.isLoading}
      />

      <Dialog
        open={uploadOpen}
        onClose={() => {
          setUploadOpen(false)
          setSelectedFile(null)
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>{t('students.uploadExcelTitle')}</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
              {t('students.uploadExcelDescription')}
            </Typography>
            <Typography variant="body2" sx={{ mb: 2, fontSize: '0.875rem', color: 'text.secondary' }}>
              <strong>{t('students.requiredColumns')}:</strong> first_name, last_name, student_id, grade, level, class, gender, date_of_birth, branch
            </Typography>
            <input
              accept=".xlsx,.xls"
              style={{ display: 'none' }}
              id="file-upload"
              type="file"
              onChange={handleFileSelect}
            />
            <label htmlFor="file-upload">
              <Button
                variant="outlined"
                component="span"
                fullWidth
                startIcon={<UploadFileIcon />}
                sx={{ mb: 2 }}
              >
                {selectedFile ? selectedFile.name : t('students.selectFile')}
              </Button>
            </label>
            {uploadMutation.isLoading && (
              <Box sx={{ mt: 2 }}>
                <LinearProgress />
                <Typography variant="body2" sx={{ mt: 1, textAlign: 'center' }}>
                  {t('students.uploading')}
                </Typography>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setUploadOpen(false)
              setSelectedFile(null)
            }}
            disabled={uploadMutation.isLoading}
          >
            {t('common.cancel')}
          </Button>
          <Button
            onClick={handleUpload}
            variant="contained"
            disabled={!selectedFile || uploadMutation.isLoading}
          >
            {t('students.upload')}
          </Button>
        </DialogActions>
      </Dialog>

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

export default Students
