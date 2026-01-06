import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useLanguage } from '../contexts/LanguageContext'
import {
  Box,
  CircularProgress,
  Chip,
  Paper,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Button,
  Grid,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material'
import { getAttendanceReport } from '../api/attendance'
import { getBranches } from '../api/branches'
import { format } from 'date-fns'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import html2canvas from 'html2canvas'
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf'
import DownloadIcon from '@mui/icons-material/Download'
import AssessmentIcon from '@mui/icons-material/Assessment'

function Reports() {
  const [selectedBranch, setSelectedBranch] = useState('')
  const [selectedGrade, setSelectedGrade] = useState('')
  const [selectedLevel, setSelectedLevel] = useState('')
  const [selectedClass, setSelectedClass] = useState('')
  const [dateFrom, setDateFrom] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [dateTo, setDateTo] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [dateRangeType, setDateRangeType] = useState('today')
  const { t } = useTranslation()
  const { language, isRTL } = useLanguage()

  const { data: branchesData } = useQuery({
    queryKey: ['branches'],
    queryFn: () => getBranches(),
  })

  const handleDateRangeChange = (type) => {
    setDateRangeType(type)
    const today = new Date()
    
    switch (type) {
      case 'today':
        const todayStr = format(today, 'yyyy-MM-dd')
        setDateFrom(todayStr)
        setDateTo(todayStr)
        break
      case 'week':
        const weekAgo = new Date(today)
        weekAgo.setDate(today.getDate() - 7)
        setDateFrom(format(weekAgo, 'yyyy-MM-dd'))
        setDateTo(format(today, 'yyyy-MM-dd'))
        break
      case 'month':
        const monthAgo = new Date(today)
        monthAgo.setMonth(today.getMonth() - 1)
        setDateFrom(format(monthAgo, 'yyyy-MM-dd'))
        setDateTo(format(today, 'yyyy-MM-dd'))
        break
      case 'custom':
        // Keep current dates
        break
      default:
        break
    }
  }

  const { data: reportData, isLoading, refetch } = useQuery({
    queryKey: ['attendance-report', selectedBranch, selectedGrade, selectedLevel, selectedClass, dateFrom, dateTo],
    queryFn: () => {
      const params = {}
      if (selectedBranch) params.branch_id = selectedBranch
      if (selectedGrade) params.grade = selectedGrade
      if (selectedLevel) params.level = selectedLevel
      if (selectedClass) params.class = selectedClass
      if (dateFrom) params.date_from = dateFrom
      if (dateTo) params.date_to = dateTo
      return getAttendanceReport(params)
    },
    enabled: false, // Only fetch when user clicks "Generate Report"
  })

  const handleGenerateReport = () => {
    refetch()
  }

  const generatePDF = async (viewInBrowser = false) => {
    if (!reportData) return

    try {
      // For Arabic, use html2canvas to render the content properly
      if (language === 'ar') {
        // Wait for fonts to be ready
        const waitForFonts = () => {
          return new Promise((resolve) => {
            if (document.fonts && document.fonts.ready) {
              document.fonts.ready.then(() => {
                // Additional wait to ensure fonts are fully loaded
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
        
        // Build HTML content with proper Arabic support
        let htmlContent = `
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&family=Tajawal:wght@400;500;700&display=swap');
            * {
              font-family: 'Cairo', 'Tajawal', Arial, sans-serif !important;
              direction: rtl;
            }
          </style>
          <div style="text-align: center; margin-bottom: 20px; font-family: 'Cairo', 'Tajawal', Arial, sans-serif;">
            <h1 style="font-size: 24px; margin: 0; font-weight: 700; font-family: 'Cairo', 'Tajawal', Arial, sans-serif;">${t('reports.attendanceReport')}</h1>
            <p style="color: #666; font-size: 12px; margin: 5px 0; font-family: 'Cairo', 'Tajawal', Arial, sans-serif;">
              ${t('reports.dateRange')}: ${format(new Date(reportData.date_from), 'dd/MM/yyyy')} - ${format(new Date(reportData.date_to), 'dd/MM/yyyy')}
            </p>
          </div>
        `
        
        // Add filters
        if (reportData.filters.branch_id || reportData.filters.grade || reportData.filters.level) {
          htmlContent += '<div style="margin-bottom: 15px; font-size: 11px; color: #666; font-family: \'Cairo\', \'Tajawal\', Arial, sans-serif;">'
          if (reportData.filters.branch_id) {
            const branch = branchesData?.results?.find((b) => b.id === parseInt(reportData.filters.branch_id))
            if (branch) htmlContent += `<div style="font-family: 'Cairo', 'Tajawal', Arial, sans-serif;">${t('reports.branch')}: ${branch.name}</div>`
          }
          if (reportData.filters.grade) {
            const gradeLabels = {
              PRIMARY: t('students.grades.primary'),
              SECONDARY: t('students.grades.secondary'),
              HIGH_SCHOOL: t('students.grades.highSchool'),
              KINDERGARTEN: t('students.grades.kindergarten'),
            }
            htmlContent += `<div style="font-family: 'Cairo', 'Tajawal', Arial, sans-serif;">${t('reports.grade')}: ${gradeLabels[reportData.filters.grade] || reportData.filters.grade}</div>`
          }
          if (reportData.filters.level) {
            htmlContent += `<div style="font-family: 'Cairo', 'Tajawal', Arial, sans-serif;">${t('reports.level')}: ${t(`students.levels.${reportData.filters.level}`)}</div>`
          }
          if (reportData.filters.class) {
            htmlContent += `<div style="font-family: 'Cairo', 'Tajawal', Arial, sans-serif;">${t('reports.class')}: ${reportData.filters.class}</div>`
          }
          htmlContent += '</div>'
        }
        
        // Add summary
        htmlContent += `
          <div style="margin-bottom: 15px; font-family: 'Cairo', 'Tajawal', Arial, sans-serif;">
            <h2 style="font-size: 16px; margin-bottom: 10px; font-weight: 600; font-family: 'Cairo', 'Tajawal', Arial, sans-serif;">${t('reports.summary')}</h2>
            <div style="font-size: 12px; font-family: 'Cairo', 'Tajawal', Arial, sans-serif;">
              <div style="font-family: 'Cairo', 'Tajawal', Arial, sans-serif;">${t('reports.totalStudents')}: ${reportData.summary.total_students}</div>
              <div style="font-family: 'Cairo', 'Tajawal', Arial, sans-serif;">${t('reports.present')}: ${reportData.summary.present}</div>
              <div style="font-family: 'Cairo', 'Tajawal', Arial, sans-serif;">${t('reports.absent')}: ${reportData.summary.absent}</div>
              <div style="font-family: 'Cairo', 'Tajawal', Arial, sans-serif;">${t('reports.attendanceRate')}: ${reportData.summary.attendance_rate}%</div>
            </div>
          </div>
        `
        
        // Add table
        htmlContent += `
          <table style="width: 100%; border-collapse: collapse; font-size: 10px; font-family: 'Cairo', 'Tajawal', Arial, sans-serif; direction: rtl;">
            <thead>
              <tr style="background-color: #0ABAB5; color: white;">
                <th style="padding: 8px; border: 1px solid #ddd; text-align: right; font-family: 'Cairo', 'Tajawal', Arial, sans-serif; font-weight: 600;">${t('reports.studentName')}</th>
                <th style="padding: 8px; border: 1px solid #ddd; text-align: right; font-family: 'Cairo', 'Tajawal', Arial, sans-serif; font-weight: 600;">${t('reports.studentId')}</th>
                <th style="padding: 8px; border: 1px solid #ddd; text-align: right; font-family: 'Cairo', 'Tajawal', Arial, sans-serif; font-weight: 600;">${t('reports.branch')}</th>
                <th style="padding: 8px; border: 1px solid #ddd; text-align: right; font-family: 'Cairo', 'Tajawal', Arial, sans-serif; font-weight: 600;">${t('reports.grade')}</th>
                <th style="padding: 8px; border: 1px solid #ddd; text-align: right; font-family: 'Cairo', 'Tajawal', Arial, sans-serif; font-weight: 600;">${t('reports.level')}</th>
                <th style="padding: 8px; border: 1px solid #ddd; text-align: right; font-family: 'Cairo', 'Tajawal', Arial, sans-serif; font-weight: 600;">${t('reports.class')}</th>
                <th style="padding: 8px; border: 1px solid #ddd; text-align: right; font-family: 'Cairo', 'Tajawal', Arial, sans-serif; font-weight: 600;">${t('reports.status')}</th>
                <th style="padding: 8px; border: 1px solid #ddd; text-align: right; font-family: 'Cairo', 'Tajawal', Arial, sans-serif; font-weight: 600;">${t('reports.firstCheckIn')}</th>
                <th style="padding: 8px; border: 1px solid #ddd; text-align: right; font-family: 'Cairo', 'Tajawal', Arial, sans-serif; font-weight: 600;">${t('reports.checkInCount')}</th>
              </tr>
            </thead>
            <tbody>
        `
        
        reportData.students.forEach((student, index) => {
          const bgColor = index % 2 === 0 ? '#f9f9f9' : 'white'
          htmlContent += `
            <tr style="background-color: ${bgColor};">
              <td style="padding: 6px; border: 1px solid #ddd; text-align: right; font-family: 'Cairo', 'Tajawal', Arial, sans-serif;">${student.student_name}</td>
              <td style="padding: 6px; border: 1px solid #ddd; text-align: right; font-family: 'Cairo', 'Tajawal', Arial, sans-serif;">${student.student_id_number}</td>
              <td style="padding: 6px; border: 1px solid #ddd; text-align: right; font-family: 'Cairo', 'Tajawal', Arial, sans-serif;">${student.branch.name}</td>
              <td style="padding: 6px; border: 1px solid #ddd; text-align: right; font-family: 'Cairo', 'Tajawal', Arial, sans-serif;">${student.grade}</td>
              <td style="padding: 6px; border: 1px solid #ddd; text-align: right; font-family: 'Cairo', 'Tajawal', Arial, sans-serif;">${student.level || '-'}</td>
              <td style="padding: 6px; border: 1px solid #ddd; text-align: right; font-family: 'Cairo', 'Tajawal', Arial, sans-serif;">${student.class_name || '-'}</td>
              <td style="padding: 6px; border: 1px solid #ddd; text-align: right; font-family: 'Cairo', 'Tajawal', Arial, sans-serif;">${student.attendance_status}</td>
              <td style="padding: 6px; border: 1px solid #ddd; text-align: right; font-family: 'Cairo', 'Tajawal', Arial, sans-serif;">${student.first_check_in ? format(new Date(student.first_check_in), 'dd/MM/yyyy HH:mm') : '-'}</td>
              <td style="padding: 6px; border: 1px solid #ddd; text-align: right; font-family: 'Cairo', 'Tajawal', Arial, sans-serif;">${student.check_in_count}</td>
            </tr>
          `
        })
        
        htmlContent += `
            </tbody>
          </table>
        `
        
        tempDiv.innerHTML = htmlContent
        document.body.appendChild(tempDiv)
        
        // Wait a bit for rendering
        await new Promise(resolve => setTimeout(resolve, 300))
        
        // Convert to canvas with better options for Arabic
        const canvas = await html2canvas(tempDiv, {
          scale: 2,
          useCORS: true,
          logging: false,
          allowTaint: true,
          backgroundColor: '#ffffff',
          onclone: (clonedDoc) => {
            // Ensure fonts are applied in cloned document
            const clonedElement = clonedDoc.querySelector('div')
            if (clonedElement) {
              clonedElement.style.fontFamily = '"Cairo", "Tajawal", "Arial", sans-serif'
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
          doc.save(`attendance-report-${format(new Date(), 'yyyy-MM-dd')}.pdf`)
        }
      } else {
        // English mode - use original jsPDF method
        const doc = new jsPDF()
        
        // Add title
        doc.setFontSize(18)
        doc.text(t('reports.attendanceReport'), 14, 22)
        
        // Add date range
        doc.setFontSize(10)
        doc.setTextColor(100, 100, 100)
        doc.text(
          `${t('reports.dateRange')}: ${format(new Date(reportData.date_from), 'dd/MM/yyyy')} - ${format(new Date(reportData.date_to), 'dd/MM/yyyy')}`,
          14,
          30
        )
        
        // Add filters
        let filterInfo = []
        if (reportData.filters.branch_id) {
          const branch = branchesData?.results?.find((b) => b.id === parseInt(reportData.filters.branch_id))
          if (branch) filterInfo.push(`${t('reports.branch')}: ${branch.name}`)
        }
        if (reportData.filters.grade) {
          const gradeLabels = {
            PRIMARY: t('students.grades.primary'),
            SECONDARY: t('students.grades.secondary'),
            HIGH_SCHOOL: t('students.grades.highSchool'),
            KINDERGARTEN: t('students.grades.kindergarten'),
          }
          filterInfo.push(`${t('reports.grade')}: ${gradeLabels[reportData.filters.grade] || reportData.filters.grade}`)
        }
        if (reportData.filters.level) {
          filterInfo.push(`${t('reports.level')}: ${t(`students.levels.${reportData.filters.level}`)}`)
        }
        if (reportData.filters.class) {
          filterInfo.push(`${t('reports.class')}: ${reportData.filters.class}`)
        }
        
        if (filterInfo.length > 0) {
          filterInfo.forEach((info, index) => {
            doc.text(info, 14, 35 + index * 5)
          })
        }
        
        // Add summary
        doc.setFontSize(12)
        doc.setTextColor(0, 0, 0)
        doc.text(t('reports.summary'), 14, filterInfo.length > 0 ? 50 + filterInfo.length * 5 : 45)
        doc.setFontSize(10)
        doc.text(`${t('reports.totalStudents')}: ${reportData.summary.total_students}`, 14, filterInfo.length > 0 ? 55 + filterInfo.length * 5 : 50)
        doc.text(`${t('reports.present')}: ${reportData.summary.present}`, 14, filterInfo.length > 0 ? 60 + filterInfo.length * 5 : 55)
        doc.text(`${t('reports.absent')}: ${reportData.summary.absent}`, 14, filterInfo.length > 0 ? 65 + filterInfo.length * 5 : 60)
        doc.text(`${t('reports.attendanceRate')}: ${reportData.summary.attendance_rate}%`, 14, filterInfo.length > 0 ? 70 + filterInfo.length * 5 : 65)
        
        // Prepare table data
        const tableData = reportData.students.map((student) => [
          student.student_name,
          student.student_id_number,
          student.branch.name,
          student.grade,
          student.level || '-',
          student.class_name || '-',
          student.attendance_status,
          student.first_check_in ? format(new Date(student.first_check_in), 'dd/MM/yyyy HH:mm') : '-',
          student.check_in_count,
        ])
        
        // Add table
        autoTable(doc, {
          startY: filterInfo.length > 0 ? 75 + filterInfo.length * 5 : 70,
          head: [[
            t('reports.studentName'),
            t('reports.studentId'),
            t('reports.branch'),
            t('reports.grade'),
            t('reports.level'),
            t('reports.class'),
            t('reports.status'),
            t('reports.firstCheckIn'),
            t('reports.checkInCount'),
          ]],
          body: tableData,
          theme: 'striped',
          headStyles: { fillColor: [10, 186, 181], textColor: 255, fontStyle: 'bold' },
          styles: { fontSize: 8 },
          margin: { top: 20 },
        })
        
        if (viewInBrowser) {
          const pdfBlob = doc.output('blob')
          const pdfUrl = URL.createObjectURL(pdfBlob)
          window.open(pdfUrl, '_blank')
        } else {
          doc.save(`attendance-report-${format(new Date(), 'yyyy-MM-dd')}.pdf`)
        }
      }
    } catch (error) {
      console.error('Error generating PDF:', error)
    }
  }

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
    <Box>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography
            variant="h4"
            sx={{
              fontWeight: 700,
              mb: 1,
              color: 'text.primary',
            }}
          >
            {t('reports.title')}
          </Typography>
          <Typography
            variant="body1"
            sx={{
              color: 'text.secondary',
              fontSize: '1rem',
            }}
          >
            {t('reports.description')}
          </Typography>
        </Box>
      </Box>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
          {t('reports.filters')}
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth>
              <InputLabel>{t('reports.branch')}</InputLabel>
              <Select
                value={selectedBranch}
                label={t('reports.branch')}
                onChange={(e) => setSelectedBranch(e.target.value)}
              >
                <MenuItem value="">{t('reports.allBranches')}</MenuItem>
                {branches.map((branch) => (
                  <MenuItem key={branch.id} value={branch.id}>
                    {branch.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth>
              <InputLabel>{t('reports.grade')}</InputLabel>
              <Select
                value={selectedGrade}
                label={t('reports.grade')}
                onChange={(e) => setSelectedGrade(e.target.value)}
              >
                <MenuItem value="">{t('reports.allGrades')}</MenuItem>
                {grades.map((grade) => (
                  <MenuItem key={grade.value} value={grade.value}>
                    {grade.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth>
              <InputLabel>{t('reports.level')}</InputLabel>
              <Select
                value={selectedLevel}
                label={t('reports.level')}
                onChange={(e) => setSelectedLevel(e.target.value)}
              >
                <MenuItem value="">{t('reports.allLevels')}</MenuItem>
                {levels.map((level) => (
                  <MenuItem key={level.value} value={level.value}>
                    {level.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth>
              <InputLabel>{t('reports.filterByClass')}</InputLabel>
              <Select
                value={selectedClass}
                label={t('reports.filterByClass')}
                onChange={(e) => setSelectedClass(e.target.value)}
              >
                <MenuItem value="">{t('reports.allClasses')}</MenuItem>
                {reportData?.students && Array.from(new Set(reportData.students.map(s => s.class_name).filter(Boolean))).sort().map((class_name) => (
                  <MenuItem key={class_name} value={class_name}>
                    {class_name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth>
              <InputLabel>{t('reports.dateRange')}</InputLabel>
              <Select
                value={dateRangeType}
                label={t('reports.dateRange')}
                onChange={(e) => handleDateRangeChange(e.target.value)}
              >
                <MenuItem value="today">{t('reports.today')}</MenuItem>
                <MenuItem value="week">{t('reports.lastWeek')}</MenuItem>
                <MenuItem value="month">{t('reports.lastMonth')}</MenuItem>
                <MenuItem value="custom">{t('reports.custom')}</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          {dateRangeType === 'custom' && (
            <>
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  label={t('reports.dateFrom')}
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  label={t('reports.dateTo')}
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                />
              </Grid>
            </>
          )}
          {dateRangeType !== 'custom' && (
            <>
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  label={t('reports.dateFrom')}
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                  disabled
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  label={t('reports.dateTo')}
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                  disabled
                />
              </Grid>
            </>
          )}
          <Grid item xs={12}>
            <Button
              variant="contained"
              startIcon={<AssessmentIcon />}
              onClick={handleGenerateReport}
              sx={{ mt: 1 }}
            >
              {t('reports.generateReport')}
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {isLoading && (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress sx={{ color: 'primary.main' }} />
        </Box>
      )}

      {reportData && !isLoading && (
        <>
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    {t('reports.totalStudents')}
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: 'primary.main' }}>
                    {reportData.summary.total_students}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    {t('reports.present')}
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: '#0ABAB5' }}>
                    {reportData.summary.present}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    {t('reports.absent')}
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: '#FF6B9D' }}>
                    {reportData.summary.absent}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    {t('reports.attendanceRate')}
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: 'primary.main' }}>
                    {reportData.summary.attendance_rate}%
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Paper sx={{ mb: 2 }}>
            <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                {t('reports.studentList')}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="outlined"
                  startIcon={<PictureAsPdfIcon />}
                  onClick={() => generatePDF(true)}
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
            </Box>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>{t('reports.studentName')}</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{t('reports.studentId')}</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{t('reports.branch')}</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{t('reports.grade')}</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{t('reports.level')}</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{t('reports.class')}</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{t('reports.status')}</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{t('reports.firstCheckIn')}</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{t('reports.checkInCount')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {reportData.students.map((student) => (
                    <TableRow key={student.student_id} hover>
                      <TableCell>{student.student_name}</TableCell>
                      <TableCell>{student.student_id_number}</TableCell>
                      <TableCell>{student.branch.name}</TableCell>
                      <TableCell>{student.grade}</TableCell>
                      <TableCell>{student.level || '-'}</TableCell>
                      <TableCell>{student.class_name || '-'}</TableCell>
                      <TableCell>
                        <Chip
                          label={student.attendance_status}
                          size="small"
                          sx={{
                            backgroundColor: student.has_attended ? '#0ABAB5' : '#FF6B9D',
                            color: 'white',
                            fontWeight: 600,
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        {student.first_check_in
                          ? format(new Date(student.first_check_in), 'dd/MM/yyyy HH:mm')
                          : '-'}
                      </TableCell>
                      <TableCell>{student.check_in_count}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </>
      )}
    </Box>
  )
}

export default Reports

