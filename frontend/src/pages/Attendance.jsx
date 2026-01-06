import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useLanguage } from '../contexts/LanguageContext'
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
  TextField,
  Button,
} from '@mui/material'
import { getAttendanceRecords, deleteAttendanceRecord } from '../api/attendance'
import { getBranches } from '../api/branches'
import DataTable from '../components/DataTable'
import { format } from 'date-fns'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import html2canvas from 'html2canvas'
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf'
import DownloadIcon from '@mui/icons-material/Download'

function Attendance() {
  const [searchInput, setSearchInput] = useState('')
  const [searchValue, setSearchValue] = useState('')
  const [page, setPage] = useState(1)
  const [sortBy, setSortBy] = useState('timestamp')
  const [sortOrder, setSortOrder] = useState('desc')
  const [selectedBranch, setSelectedBranch] = useState('')
  const [selectedGrade, setSelectedGrade] = useState('')
  const [selectedLevel, setSelectedLevel] = useState('')
  const [selectedClass, setSelectedClass] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' })
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  const { language, isRTL } = useLanguage()

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
    queryKey: [
      'attendance',
      page,
      searchValue,
      sortBy,
      sortOrder,
      selectedBranch,
      selectedGrade,
      selectedLevel,
      selectedClass,
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
      if (selectedGrade) params.grade = selectedGrade
      if (selectedLevel) params.level = selectedLevel
      if (selectedClass) params.class = selectedClass
      if (selectedStatus) params.status = selectedStatus
      if (dateFrom) params.date_from = dateFrom
      if (dateTo) params.date_to = dateTo
      return getAttendanceRecords(params)
    },
    enabled: true,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    keepPreviousData: true,
    staleTime: 5000,
  })

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress sx={{ color: 'primary.main' }} />
      </Box>
    )
  }

  const columns = [
    { id: 'name', label: t('attendance.name'), sortable: true },
    { id: 'type', label: t('attendance.type'), sortable: true },
    { id: 'status', label: t('attendance.status'), sortable: true },
    { id: 'timestamp', label: t('attendance.dateTime'), sortable: true },
    { id: 'device', label: t('attendance.device'), sortable: true },
  ]

  const getStatusLabel = (status) => {
    if (!status) return '-'
    const statusMap = {
      'ATTENDED': t('attendance.statusAttended'),
      'LATE': t('attendance.statusLate'),
      'ABSENT': t('attendance.statusAbsent'),
    }
    return statusMap[status] || status
  }

  const getStatusColor = (status) => {
    const colorMap = {
      'ATTENDED': '#0ABAB5',
      'LATE': '#FF9800',
      'ABSENT': '#FF6B9D',
    }
    return colorMap[status] || '#9E9E9E'
  }

  const tableData = (data?.results || []).map((record) => ({
    id: record.id,
    name: record.student?.full_name || '-',
    type: record.attendance_type === 'CHECK_IN' ? t('attendance.checkIn') : t('attendance.checkOut'),
    status: record.status || (record.attendance_type === 'CHECK_IN' ? '-' : null),
    statusLabel: getStatusLabel(record.status),
    statusColor: getStatusColor(record.status),
    timestamp: format(new Date(record.timestamp), 'dd MMM, yyyy HH:mm'),
    device: record.device?.name || 'N/A',
    branch: record.student?.branch?.name || '-',
    grade: record.student?.grade || '-',
    level: record.student?.level || '-',
    class_name: record.student?.class_name || '-',
    isFavorite: false,
    record: record,
  }))

  const generatePDF = async (viewInBrowser = false) => {
    try {
      // Fetch all records with current filters (no pagination)
      const params = {
        page: 1,
        page_size: 10000, // Large number to get all records
        search: searchValue,
        ordering: sortOrder === 'asc' ? sortBy : `-${sortBy}`,
      }
      if (selectedBranch) params.branch = selectedBranch
      if (selectedGrade) params.grade = selectedGrade
      if (selectedLevel) params.level = selectedLevel
      if (selectedClass) params.class = selectedClass
      if (selectedStatus) params.status = selectedStatus
      if (dateFrom) params.date_from = dateFrom
      if (dateTo) params.date_to = dateTo

      const allData = await getAttendanceRecords(params)
      const allRecords = allData?.results || []
      const totalCount = allData?.count || 0

      // For Arabic, use html2canvas to render the content properly
      if (language === 'ar') {
        // Wait for fonts to be ready
        const waitForFonts = () => {
          return new Promise((resolve) => {
            if (document.fonts && document.fonts.ready) {
              document.fonts.ready.then(() => {
                setTimeout(resolve, 500)
              })
            } else {
              setTimeout(resolve, 1000)
            }
          })
        }
        
        await waitForFonts()
        
        // Create a temporary container with the report content
        const tempDiv = document.createElement('div')
        tempDiv.style.position = 'absolute'
        tempDiv.style.left = '-9999px'
        tempDiv.style.top = '0'
        tempDiv.style.width = '800px'
        tempDiv.style.padding = '20px'
        tempDiv.style.backgroundColor = 'white'
        tempDiv.style.direction = 'rtl'
        tempDiv.style.fontFamily = '"Cairo", "Tajawal", "Arial", sans-serif'
        tempDiv.style.fontSize = '14px'
        tempDiv.style.lineHeight = '1.6'
        
        // Build HTML content
        let htmlContent = `
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&family=Tajawal:wght@400;500;700&display=swap');
            * {
              font-family: 'Cairo', 'Tajawal', Arial, sans-serif !important;
              direction: rtl;
            }
          </style>
          <div style="text-align: center; margin-bottom: 20px; font-family: 'Cairo', 'Tajawal', Arial, sans-serif;">
            <h1 style="font-size: 24px; margin: 0; font-weight: 700; font-family: 'Cairo', 'Tajawal', Arial, sans-serif;">${t('attendance.attendanceRecords')}</h1>
          </div>
        `
        
        // Add filters info
        let filterInfo = []
        if (dateFrom || dateTo) {
          filterInfo.push(`${t('attendance.dateFrom')}: ${dateFrom || t('common.start')} - ${dateTo || t('common.end')}`)
        }
        if (selectedBranch) {
          const branch = branchesData?.results?.find((b) => b.id === parseInt(selectedBranch))
          if (branch) filterInfo.push(`${t('attendance.filterByBranch')}: ${branch.name}`)
        }
        if (selectedGrade) {
          const gradeLabels = {
            PRIMARY: t('students.grades.primary'),
            SECONDARY: t('students.grades.secondary'),
            HIGH_SCHOOL: t('students.grades.highSchool'),
            KINDERGARTEN: t('students.grades.kindergarten'),
          }
          filterInfo.push(`${t('attendance.filterByGrade')}: ${gradeLabels[selectedGrade] || selectedGrade}`)
        }
        if (selectedLevel) {
          filterInfo.push(`${t('attendance.filterByLevel')}: ${t(`students.levels.${selectedLevel}`)}`)
        }
        if (selectedClass) {
          filterInfo.push(`${t('attendance.filterByClass')}: ${selectedClass}`)
        }
        if (searchValue) {
          filterInfo.push(`${t('common.search')}: ${searchValue}`)
        }
        
        if (filterInfo.length > 0) {
          htmlContent += '<div style="margin-bottom: 15px; font-size: 11px; color: #666; font-family: \'Cairo\', \'Tajawal\', Arial, sans-serif;">'
          filterInfo.forEach((info) => {
            htmlContent += `<div style="font-family: 'Cairo', 'Tajawal', Arial, sans-serif;">${info}</div>`
          })
          htmlContent += '</div>'
        }
        
        // Add table
        htmlContent += `
          <table style="width: 100%; border-collapse: collapse; font-size: 10px; font-family: 'Cairo', 'Tajawal', Arial, sans-serif; direction: rtl;">
            <thead>
              <tr style="background-color: #0ABAB5; color: white;">
                <th style="padding: 8px; border: 1px solid #ddd; text-align: right; font-family: 'Cairo', 'Tajawal', Arial, sans-serif; font-weight: 600;">${t('attendance.name')}</th>
                <th style="padding: 8px; border: 1px solid #ddd; text-align: right; font-family: 'Cairo', 'Tajawal', Arial, sans-serif; font-weight: 600;">${t('attendance.type')}</th>
                <th style="padding: 8px; border: 1px solid #ddd; text-align: right; font-family: 'Cairo', 'Tajawal', Arial, sans-serif; font-weight: 600;">${t('attendance.status')}</th>
                <th style="padding: 8px; border: 1px solid #ddd; text-align: right; font-family: 'Cairo', 'Tajawal', Arial, sans-serif; font-weight: 600;">${t('attendance.dateTime')}</th>
                <th style="padding: 8px; border: 1px solid #ddd; text-align: right; font-family: 'Cairo', 'Tajawal', Arial, sans-serif; font-weight: 600;">${t('attendance.filterByBranch')}</th>
                <th style="padding: 8px; border: 1px solid #ddd; text-align: right; font-family: 'Cairo', 'Tajawal', Arial, sans-serif; font-weight: 600;">${t('attendance.filterByGrade')}</th>
                <th style="padding: 8px; border: 1px solid #ddd; text-align: right; font-family: 'Cairo', 'Tajawal', Arial, sans-serif; font-weight: 600;">${t('attendance.filterByLevel')}</th>
                <th style="padding: 8px; border: 1px solid #ddd; text-align: right; font-family: 'Cairo', 'Tajawal', Arial, sans-serif; font-weight: 600;">${t('attendance.filterByClass')}</th>
                <th style="padding: 8px; border: 1px solid #ddd; text-align: right; font-family: 'Cairo', 'Tajawal', Arial, sans-serif; font-weight: 600;">${t('attendance.device')}</th>
              </tr>
            </thead>
            <tbody>
        `
        
        allRecords.forEach((record, index) => {
          const bgColor = index % 2 === 0 ? '#f9f9f9' : 'white'
          htmlContent += `
            <tr style="background-color: ${bgColor};">
              <td style="padding: 6px; border: 1px solid #ddd; text-align: right; font-family: 'Cairo', 'Tajawal', Arial, sans-serif;">${record.student?.full_name || '-'}</td>
              <td style="padding: 6px; border: 1px solid #ddd; text-align: right; font-family: 'Cairo', 'Tajawal', Arial, sans-serif;">${record.attendance_type === 'CHECK_IN' ? t('attendance.checkIn') : t('attendance.checkOut')}</td>
              <td style="padding: 6px; border: 1px solid #ddd; text-align: right; font-family: 'Cairo', 'Tajawal', Arial, sans-serif;">${record.status ? (record.status === 'ATTENDED' ? t('attendance.statusAttended') : record.status === 'LATE' ? t('attendance.statusLate') : t('attendance.statusAbsent')) : '-'}</td>
              <td style="padding: 6px; border: 1px solid #ddd; text-align: right; font-family: 'Cairo', 'Tajawal', Arial, sans-serif;">${format(new Date(record.timestamp), 'dd/MM/yyyy HH:mm')}</td>
              <td style="padding: 6px; border: 1px solid #ddd; text-align: right; font-family: 'Cairo', 'Tajawal', Arial, sans-serif;">${record.student?.branch?.name || '-'}</td>
              <td style="padding: 6px; border: 1px solid #ddd; text-align: right; font-family: 'Cairo', 'Tajawal', Arial, sans-serif;">${record.student?.grade || '-'}</td>
              <td style="padding: 6px; border: 1px solid #ddd; text-align: right; font-family: 'Cairo', 'Tajawal', Arial, sans-serif;">${record.student?.level || '-'}</td>
              <td style="padding: 6px; border: 1px solid #ddd; text-align: right; font-family: 'Cairo', 'Tajawal', Arial, sans-serif;">${record.student?.class_name || '-'}</td>
              <td style="padding: 6px; border: 1px solid #ddd; text-align: right; font-family: 'Cairo', 'Tajawal', Arial, sans-serif;">${record.device?.name || 'N/A'}</td>
            </tr>
          `
        })
        
        htmlContent += `
            </tbody>
          </table>
          <div style="margin-top: 15px; font-size: 10px; font-family: 'Cairo', 'Tajawal', Arial, sans-serif; text-align: center;">
            ${t('attendance.totalRecords')}: ${totalCount}
          </div>
        `
        
        tempDiv.innerHTML = htmlContent
        document.body.appendChild(tempDiv)
        
        // Wait a bit for rendering
        await new Promise(resolve => setTimeout(resolve, 300))
        
        // Convert to canvas
        const canvas = await html2canvas(tempDiv, {
          scale: 2,
          useCORS: true,
          logging: false,
          allowTaint: true,
          backgroundColor: '#ffffff',
          onclone: (clonedDoc) => {
            const clonedElement = clonedDoc.querySelector('div')
            if (clonedElement) {
              clonedElement.style.fontFamily = '"Cairo", "Tajawal", Arial, sans-serif'
              clonedElement.style.direction = 'rtl'
            }
          },
        })
        
        // Remove temp element
        document.body.removeChild(tempDiv)
        
        const imgData = canvas.toDataURL('image/png')
        const imgWidth = 210 // A4 width in mm
        const pageHeight = 297 // A4 height in mm
        const imgHeight = (canvas.height * imgWidth) / canvas.width
        let heightLeft = imgHeight
        
        const doc = new jsPDF('p', 'mm', 'a4')
        let position = 0
        
        doc.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
        heightLeft -= pageHeight
        
        while (heightLeft >= 0) {
          position = heightLeft - imgHeight
          doc.addPage()
          doc.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
          heightLeft -= pageHeight
        }
        
        if (viewInBrowser) {
          const pdfBlob = doc.output('blob')
          const pdfUrl = URL.createObjectURL(pdfBlob)
          window.open(pdfUrl, '_blank')
        } else {
          doc.save(`attendance-records-${format(new Date(), 'yyyy-MM-dd')}.pdf`)
        }
      } else {
        // English mode - use original jsPDF method
        const doc = new jsPDF()
        
        // Add title
        doc.setFontSize(18)
        doc.text(t('attendance.attendanceRecords'), 14, 22)
        
        // Add filters info
        let filterInfo = []
        if (dateFrom || dateTo) {
          filterInfo.push(`${t('attendance.dateFrom')}: ${dateFrom || t('common.start')} - ${dateTo || t('common.end')}`)
        }
        if (selectedBranch) {
          const branch = branchesData?.results?.find((b) => b.id === parseInt(selectedBranch))
          if (branch) filterInfo.push(`${t('attendance.filterByBranch')}: ${branch.name}`)
        }
        if (selectedGrade) {
          const gradeLabels = {
            PRIMARY: t('students.grades.primary'),
            SECONDARY: t('students.grades.secondary'),
            HIGH_SCHOOL: t('students.grades.highSchool'),
            KINDERGARTEN: t('students.grades.kindergarten'),
          }
          filterInfo.push(`${t('attendance.filterByGrade')}: ${gradeLabels[selectedGrade] || selectedGrade}`)
        }
        if (selectedLevel) {
          filterInfo.push(`${t('attendance.filterByLevel')}: ${t(`students.levels.${selectedLevel}`)}`)
        }
        if (selectedClass) {
          filterInfo.push(`${t('attendance.filterByClass')}: ${selectedClass}`)
        }
        if (searchValue) {
          filterInfo.push(`${t('common.search')}: ${searchValue}`)
        }
        
        if (filterInfo.length > 0) {
          doc.setFontSize(10)
          doc.setTextColor(100, 100, 100)
          filterInfo.forEach((info, index) => {
            doc.text(info, 14, 30 + index * 5)
          })
          doc.setTextColor(0, 0, 0)
        }
        
        // Prepare table data
        const getStatusLabel = (status) => {
          if (!status) return '-'
          const statusMap = {
            'ATTENDED': t('attendance.statusAttended'),
            'LATE': t('attendance.statusLate'),
            'ABSENT': t('attendance.statusAbsent'),
          }
          return statusMap[status] || status
        }

        const tableData = allRecords.map((record) => [
          record.student?.full_name || '-',
          record.attendance_type === 'CHECK_IN' ? t('attendance.checkIn') : t('attendance.checkOut'),
          getStatusLabel(record.status),
          format(new Date(record.timestamp), 'dd/MM/yyyy HH:mm'),
          record.student?.branch?.name || '-',
          record.student?.grade || '-',
          record.student?.level || '-',
          record.student?.class_name || '-',
          record.device?.name || 'N/A',
        ])
        
        // Add table using autoTable function
        autoTable(doc, {
          startY: filterInfo.length > 0 ? 35 + filterInfo.length * 5 : 30,
          head: [[t('attendance.name'), t('attendance.type'), t('attendance.status'), t('attendance.dateTime'), t('attendance.filterByBranch'), t('attendance.filterByGrade'), t('attendance.filterByLevel'), t('attendance.filterByClass'), t('attendance.device')]],
          body: tableData,
          theme: 'striped',
          headStyles: { fillColor: [10, 186, 181], textColor: 255, fontStyle: 'bold' },
          styles: { fontSize: 8 },
          margin: { top: 20 },
        })
        
        // Add footer with total count
        const pageCount = doc.internal.getNumberOfPages()
        for (let i = 1; i <= pageCount; i++) {
          doc.setPage(i)
        doc.setFontSize(8)
        doc.text(
          `${t('attendance.totalRecords')}: ${totalCount} | ${t('attendance.page')} ${i} ${t('attendance.of')} ${pageCount}`,
          14,
          doc.internal.pageSize.height - 10
        )
        }
        
        if (viewInBrowser) {
          // Open in new window
          const pdfBlob = doc.output('blob')
          const pdfUrl = URL.createObjectURL(pdfBlob)
          window.open(pdfUrl, '_blank')
        } else {
          // Download
          doc.save(`attendance-records-${format(new Date(), 'yyyy-MM-dd')}.pdf`)
        }
      }
    } catch (error) {
      setSnackbar({
        open: true,
        message: t('common.failedToGeneratePDF', { error: error.response?.data?.detail || error.message }),
        severity: 'error',
      })
    }
  }

  const getTypeColor = (type) => {
    return type === t('attendance.checkIn') || type === 'CHECK_IN' ? '#0ABAB5' : '#FF6B9D'
  }

  const handleDelete = async (row) => {
    if (window.confirm(t('attendance.deleteConfirm', { name: row.name || row.record?.student?.full_name || 'this record' }))) {
      try {
        await deleteAttendanceRecord(row.id)
        queryClient.invalidateQueries(['attendance'])
        setSnackbar({ 
          open: true, 
          message: t('attendance.deleteSuccess', { count: 1 }), 
          severity: 'success' 
        })
      } catch (error) {
        setSnackbar({
          open: true,
          message: error.response?.data?.detail || t('attendance.deleteFailed'),
          severity: 'error',
        })
      }
    }
  }

  const handleBulkDelete = async (selectedIds) => {
    try {
      await Promise.all(selectedIds.map((id) => deleteAttendanceRecord(id)))
      queryClient.invalidateQueries(['attendance'])
      setSnackbar({ open: true, message: t('attendance.deleteSuccess', { count: selectedIds.length }), severity: 'success' })
    } catch (error) {
      setSnackbar({
        open: true,
        message: error.response?.data?.detail || t('attendance.deleteFailed'),
        severity: 'error',
      })
    }
  }

  const handleSortChange = ({ column, order }) => {
    setSortBy(column)
    setSortOrder(order)
  }

  const sortOptions = [
    { value: 'timestamp', label: 'Date & Time' },
    { value: 'created_at', label: 'Date Created' },
  ]

  const branches = branchesData?.results || []
  const grades = [
    { value: 'PRIMARY', label: t('students.grades.primary') },
    { value: 'SECONDARY', label: t('students.grades.secondary') },
    { value: 'HIGH_SCHOOL', label: t('students.grades.highSchool') },
    { value: 'KINDERGARTEN', label: t('students.grades.kindergarten') },
  ]
  const levels = Array.from({ length: 12 }, (_, i) => ({
    value: i + 1,
    label: t(`students.levels.${i + 1}`),
  }))

  return (
    <>
      <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>{t('attendance.filterByBranch')}</InputLabel>
          <Select
            value={selectedBranch}
            label={t('attendance.filterByBranch')}
            onChange={(e) => setSelectedBranch(e.target.value)}
          >
            <MenuItem value="">{t('attendance.allBranches')}</MenuItem>
            {branches.map((branch) => (
              <MenuItem key={branch.id} value={branch.id}>
                {branch.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>{t('attendance.filterByGrade')}</InputLabel>
          <Select
            value={selectedGrade}
            label={t('attendance.filterByGrade')}
            onChange={(e) => setSelectedGrade(e.target.value)}
          >
            <MenuItem value="">{t('attendance.allGrades')}</MenuItem>
            {grades.map((grade) => (
              <MenuItem key={grade.value} value={grade.value}>
                {grade.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>{t('attendance.filterByLevel')}</InputLabel>
          <Select
            value={selectedLevel}
            label={t('attendance.filterByLevel')}
            onChange={(e) => setSelectedLevel(e.target.value)}
          >
            <MenuItem value="">{t('attendance.allLevels')}</MenuItem>
            {levels.map((level) => (
              <MenuItem key={level.value} value={level.value}>
                {level.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>{t('attendance.filterByClass')}</InputLabel>
          <Select
            value={selectedClass}
            label={t('attendance.filterByClass')}
            onChange={(e) => setSelectedClass(e.target.value)}
          >
            <MenuItem value="">{t('attendance.allClasses')}</MenuItem>
            {Array.from(new Set((data?.results || []).map(r => r.student?.class_name).filter(Boolean))).sort().map((class_name) => (
              <MenuItem key={class_name} value={class_name}>
                {class_name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>{t('attendance.filterByStatus')}</InputLabel>
          <Select
            value={selectedStatus}
            label={t('attendance.filterByStatus')}
            onChange={(e) => setSelectedStatus(e.target.value)}
          >
            <MenuItem value="">{t('attendance.allStatuses')}</MenuItem>
            <MenuItem value="ATTENDED">{t('attendance.statusAttended')}</MenuItem>
            <MenuItem value="LATE">{t('attendance.statusLate')}</MenuItem>
            <MenuItem value="ABSENT">{t('attendance.statusAbsent')}</MenuItem>
          </Select>
        </FormControl>
        <TextField
          label={t('attendance.dateFrom')}
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          InputLabelProps={{ shrink: true }}
          sx={{ minWidth: 200 }}
        />
        <TextField
          label={t('attendance.dateTo')}
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          InputLabelProps={{ shrink: true }}
          sx={{ minWidth: 200 }}
        />
        <Button
          variant="outlined"
          startIcon={<PictureAsPdfIcon />}
          onClick={() => generatePDF(true)}
          sx={{ ml: 'auto' }}
        >
          {t('common.viewPDF')}
        </Button>
        <Button
          variant="contained"
          startIcon={<DownloadIcon />}
          onClick={() => generatePDF(false)}
        >
          {t('common.downloadPDF')}
        </Button>
      </Box>
      <DataTable
        title={t('attendance.title')}
        data={tableData}
        columns={columns}
        searchValue={searchInput}
        onSearchChange={setSearchInput}
        onDelete={handleDelete}
        onArchive={(row) => console.log('Archive', row)}
        onBulkDelete={handleBulkDelete}
        sortOptions={sortOptions}
        onSortChange={handleSortChange}
        sortBy={sortBy}
        sortOrder={sortOrder}
        page={page - 1}
        rowsPerPage={15}
        totalCount={data?.count || 0}
        onPageChange={(newPage) => setPage(newPage + 1)}
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
            key="type"
            label={row.type}
            size="small"
            sx={{
              backgroundColor: getTypeColor(row.type),
              color: 'white',
              fontSize: '0.75rem',
              height: 24,
              fontWeight: 500,
            }}
          />,
          row.status && row.status !== '-' && (
            <Chip
              key="status"
              label={row.statusLabel}
              size="small"
              sx={{
                backgroundColor: row.statusColor,
                color: 'white',
                fontSize: '0.75rem',
                height: 24,
                fontWeight: 500,
              }}
            />
          ),
        ].filter(Boolean)}
      />
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

export default Attendance
