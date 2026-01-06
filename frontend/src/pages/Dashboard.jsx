import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Box,
  Grid,
  Paper,
  Typography,
  CircularProgress,
  Card,
  CardContent,
  Chip,
  IconButton,
  LinearProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
} from '@mui/material'
import { styled } from '@mui/material/styles'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import TrendingDownIcon from '@mui/icons-material/TrendingDown'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import ArrowBackIosIcon from '@mui/icons-material/ArrowBackIos'
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos'
import { getTodaySummary, getAttendanceOverview } from '../api/attendance'
import { getStudents } from '../api/students'
import { getDevices } from '../api/devices'
import { getAttendanceRecords } from '../api/attendance'
import { getBranches } from '../api/branches'
import { useTranslation } from 'react-i18next'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { format, subWeeks, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns'

const StyledCard = styled(Card)(({ theme }) => ({
  borderRadius: theme.spacing(2),
  boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
  transition: 'all 0.3s ease',
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: '0 8px 24px rgba(10, 186, 181, 0.15)',
  },
}))

const MetricCard = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  borderRadius: theme.spacing(2),
  boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
  transition: 'all 0.3s ease',
  cursor: 'pointer',
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: '0 8px 24px rgba(10, 186, 181, 0.15)',
    '& .metric-value': {
      color: theme.palette.primary.main,
      transform: 'scale(1.05)',
    },
  },
}))

const MetricValue = styled(Typography)(({ theme }) => ({
  fontSize: '2rem',
  fontWeight: 700,
  transition: 'all 0.3s ease',
  color: theme.palette.text.primary,
}))

const StatCard = styled(Card)(({ theme }) => ({
  borderRadius: theme.spacing(2),
  boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
  height: '100%',
  transition: 'all 0.3s ease',
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: '0 8px 24px rgba(10, 186, 181, 0.15)',
  },
}))

const CircularProgressContainer = styled(Box)(({ theme }) => ({
  position: 'relative',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  '& .MuiCircularProgress-root': {
    color: theme.palette.primary.main,
  },
}))

const CircularProgressLabel = styled(Box)({
  top: 0,
  left: 0,
  bottom: 0,
  right: 0,
  position: 'absolute',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexDirection: 'column',
})

function Dashboard() {
  const [selectedBranch, setSelectedBranch] = useState('')
  const [weekOffset, setWeekOffset] = useState(0) // 0 = current week, 1 = last week, 2 = 2 weeks ago, etc.
  const { t } = useTranslation()

  // Custom Tooltip component for attendance percentage chart
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <Box
          sx={{
            backgroundColor: 'white',
            border: '1px solid #E0E0E0',
            borderRadius: '8px',
            padding: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          }}
        >
          <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
            {label}
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 700, color: 'primary.main', mb: 1 }}>
            {data.attendance_percentage}%
          </Typography>
          <Typography variant="caption" sx={{ display: 'block', color: '#0ABAB5', mb: 0.5 }}>
            {t('dashboard.present')}: {data.present}
          </Typography>
          <Typography variant="caption" sx={{ display: 'block', color: '#FF6B9D' }}>
            {t('dashboard.absent')}: {data.absent}
          </Typography>
        </Box>
      )
    }
    return null
  }

  const { data: branchesData } = useQuery({
    queryKey: ['branches'],
    queryFn: () => getBranches(),
  })

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['attendance-summary', selectedBranch],
    queryFn: () => getTodaySummary({ branch_id: selectedBranch || undefined }),
  })

  const { data: studentsData, isLoading: studentsLoading } = useQuery({
    queryKey: ['students-count', selectedBranch],
    queryFn: () => getStudents({ page_size: 1, branch: selectedBranch || undefined }),
  })

  const { data: devicesData, isLoading: devicesLoading } = useQuery({
    queryKey: ['devices-count', selectedBranch],
    queryFn: () => getDevices({ page_size: 1, branch: selectedBranch || undefined }),
  })

  const { data: attendanceData, isLoading: attendanceLoading } = useQuery({
    queryKey: ['attendance-recent', selectedBranch],
    queryFn: () => getAttendanceRecords({ page_size: 10, branch: selectedBranch || undefined }),
  })

  // Calculate week date range based on offset
  const getWeekDateRange = (offset) => {
    const today = new Date()
    const weekStart = startOfWeek(subWeeks(today, offset), { weekStartsOn: 0 }) // Sunday
    const weekEnd = endOfWeek(subWeeks(today, offset), { weekStartsOn: 0 }) // Saturday
    return {
      start: format(weekStart, 'yyyy-MM-dd'),
      end: format(weekEnd, 'yyyy-MM-dd'),
      startDate: weekStart,
      endDate: weekEnd,
    }
  }

  const weekRange = getWeekDateRange(weekOffset)

  const { data: overviewData, isLoading: overviewLoading } = useQuery({
    queryKey: ['attendance-overview', selectedBranch, weekOffset, weekRange.start, weekRange.end],
    queryFn: () => {
      // Calculate date range for the selected week
      const params = { 
        branch_id: selectedBranch || undefined,
        period: 'week',
        week_offset: weekOffset,
        date_from: weekRange.start,
        date_to: weekRange.end,
      }
      return getAttendanceOverview(params)
    },
  })

  if (summaryLoading || studentsLoading || devicesLoading || attendanceLoading || overviewLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress sx={{ color: 'primary.main' }} />
      </Box>
    )
  }

  const branches = branchesData?.results || []

  // Get statistics from overview data if available, otherwise use summary
  const totalStudents = overviewData?.total_students || studentsData?.count || 0
  const checkIns = summary?.check_ins || 0
  const checkOuts = summary?.check_outs || 0
  const attended = summary?.attended || 0
  const late = summary?.late || 0
  const activeDevices = devicesData?.count || 0
  
  // Calculate today's attendance rate (for circular progress) - independent of line chart
  const todayTotalStudents = studentsData?.count || 0
  
  // Calculate present (attended + late) and absent for today
  // Absent = total students - (attended + late) - students who checked in after lateness window
  const presentStudents = attended + late
  // Absent should only count students who didn't check in at all, or checked in after lateness window
  // For now, we'll use: total - (attended + late)
  // Students who checked in after lateness are already counted as late, so absent = total - present
  const absentStudents = Math.max(0, todayTotalStudents - presentStudents)
  
  const todayAttendanceRate = todayTotalStudents > 0 ? ((presentStudents / todayTotalStudents) * 100).toFixed(1) : 0
  
  // Transform daily data to include attendance percentage for line chart
  const chartData = (overviewData?.daily_data || []).map((day) => {
    const attendancePercentage = day.total_students > 0 
      ? ((day.present / day.total_students) * 100).toFixed(1) 
      : 0
    return {
      ...day,
      attendance_percentage: parseFloat(attendancePercentage),
    }
  })

  const metrics = [
    {
      label: t('dashboard.totalStudents'),
      value: totalStudents.toLocaleString(),
      change: '+7.5%',
      trend: 'up',
      color: '#0ABAB5',
    },
    {
      label: t('dashboard.todaysCheckIns'),
      value: checkIns.toLocaleString(),
      change: '+7.2%',
      trend: 'up',
      color: '#0ABAB5',
    },
    {
      label: t('dashboard.latenessToday'),
      value: late.toLocaleString(),
      change: '-0.2%',
      trend: 'down',
      color: '#FF9800',
    },
    {
      label: t('dashboard.absentToday'),
      value: absentStudents.toLocaleString(),
      change: '-0.2%',
      trend: 'down',
      color: '#FF6B9D',
    },
    {
      label: t('dashboard.activeDevices'),
      value: activeDevices.toLocaleString(),
      change: '+10.8%',
      trend: 'up',
      color: '#0ABAB5',
    },
  ]

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
            {t('dashboard.title')}
          </Typography>
          <Typography
            variant="body1"
          sx={{
            color: 'text.secondary',
            fontSize: '1rem',
          }}
        >
          {t('dashboard.description')}
        </Typography>
        </Box>
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>{t('branches.filterByBranch')}</InputLabel>
          <Select
            value={selectedBranch}
            label={t('branches.filterByBranch')}
            onChange={(e) => setSelectedBranch(e.target.value)}
          >
            <MenuItem value="">{t('branches.allBranches')}</MenuItem>
            {branches.map((branch) => (
              <MenuItem key={branch.id} value={branch.id}>
                {branch.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        {metrics.map((metric, index) => (
          <Grid item xs={12} sm={6} md={2.4} key={index}>
            <MetricCard>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    backgroundColor: metric.color,
                    mr: 1,
                  }}
                />
                <Typography
                  variant="body2"
                  sx={{
                    color: 'text.secondary',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                  }}
                >
                  {metric.label}
                </Typography>
              </Box>
              <MetricValue className="metric-value" sx={{ mb: 1 }}>
                {metric.value}
              </MetricValue>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                {metric.trend === 'up' ? (
                  <TrendingUpIcon
                    sx={{ fontSize: '1rem', color: '#0ABAB5' }}
                  />
                ) : (
                  <TrendingDownIcon
                    sx={{ fontSize: '1rem', color: '#FF6B9D' }}
                  />
                )}
                <Typography
                  variant="caption"
                  sx={{
                    color: metric.trend === 'up' ? '#0ABAB5' : '#FF6B9D',
                    fontWeight: 600,
                    fontSize: '0.75rem',
                  }}
                >
                  {metric.change}
                </Typography>
              </Box>
            </MetricCard>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} lg={8}>
          <StyledCard>
            <CardContent>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  mb: 3,
                }}
              >
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  {t('dashboard.attendanceOverview')}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Button
                    size="small"
                    startIcon={<ArrowBackIosIcon />}
                    onClick={() => setWeekOffset(weekOffset + 1)}
                    sx={{ minWidth: 'auto' }}
                  >
                    {t('dashboard.previousWeek')}
                  </Button>
                  <Typography variant="body2" sx={{ fontWeight: 600, minWidth: 150, textAlign: 'center' }}>
                    {weekOffset === 0
                      ? t('dashboard.thisWeek')
                      : weekOffset === 1
                      ? t('dashboard.lastWeek')
                      : `${weekOffset} ${t('dashboard.weeksAgo')}`}
                  </Typography>
                  <Button
                    size="small"
                    endIcon={<ArrowForwardIosIcon />}
                    onClick={() => setWeekOffset(Math.max(0, weekOffset - 1))}
                    disabled={weekOffset === 0}
                    sx={{ minWidth: 'auto' }}
                  >
                    {t('dashboard.nextWeek')}
                  </Button>
                </Box>
              </Box>

              <Box sx={{ mb: 3 }}>
                {/* Legend */}
                <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box
                      sx={{
                        width: 12,
                        height: 12,
                        borderRadius: '50%',
                        backgroundColor: '#0ABAB5',
                      }}
                    />
                    <Typography variant="caption" sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                      {t('dashboard.attendanceRate')}
                    </Typography>
                  </Box>
                </Box>

                {/* Line Chart Container */}
                <Box sx={{ height: 300, width: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={chartData}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
                      <XAxis
                        dataKey="date_label"
                        stroke="#666"
                        style={{ fontSize: '0.75rem' }}
                      />
                      <YAxis
                        stroke="#666"
                        style={{ fontSize: '0.75rem' }}
                        domain={[0, 100]}
                        tickFormatter={(value) => `${value}%`}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend
                        formatter={(value) => {
                          if (value === 'attendance_percentage') return t('dashboard.attendanceRate')
                          return value
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="attendance_percentage"
                        stroke="#0ABAB5"
                        strokeWidth={3}
                        dot={{ fill: '#0ABAB5', r: 4 }}
                        activeDot={{ r: 6 }}
                        name="attendance_percentage"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </Box>
              </Box>
{/* 
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-around',
                  pt: 2,
                  borderTop: '1px solid',
                  borderColor: 'divider',
                }}
              >
                {[
                  { label: t('dashboard.totalStudentsLabel'), value: totalStudents },
                  { label: t('dashboard.present'), value: Math.round(presentCount) },
                  { label: t('dashboard.absent'), value: Math.round(absentCount) },
                  { label: t('dashboard.attendanceRate'), value: `${typeof attendanceRate === 'number' ? attendanceRate.toFixed(1) : attendanceRate}%` },
                ].map((stat, index) => (
                  <Box key={index} sx={{ textAlign: 'center' }}>
                    <Typography
                      variant="h6"
                      sx={{
                        fontWeight: 700,
                        color: 'primary.main',
                        mb: 0.5,
                      }}
                    >
                      {stat.value}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{
                        color: 'text.secondary',
                        fontSize: '0.75rem',
                      }}
                    >
                      {stat.label}
                    </Typography>
                  </Box>
                ))}
              </Box> */}
            </CardContent>
          </StyledCard>
        </Grid>

        <Grid item xs={12} lg={4}>
          <StatCard>
            <CardContent sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  mb: 3,
                }}
              >
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  {t('dashboard.attendanceRate')}
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
                <CircularProgressContainer>
                  <CircularProgress
                    variant="determinate"
                    value={parseFloat(todayAttendanceRate)}
                    size={180}
                    thickness={4}
                  />
                  <CircularProgressLabel>
                    <Typography
                      variant="h4"
                      sx={{
                        fontWeight: 700,
                        color: 'primary.main',
                      }}
                    >
                      {todayAttendanceRate}%
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{
                        color: 'text.secondary',
                        fontSize: '0.75rem',
                      }}
                    >
                      {t('dashboard.today')}
                    </Typography>
                  </CircularProgressLabel>
                </CircularProgressContainer>
              </Box>

              <Box sx={{ mt: 'auto' }}>
                {/* <Box
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    backgroundColor: 'primary.main',
                    color: 'white',
                    mb: 2,
                    transition: 'all 0.3s ease',
                    cursor: 'pointer',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: '0 4px 12px rgba(10, 186, 181, 0.3)',
                    },
                  }}
                >
                  <Typography
                    variant="body2"
                    sx={{ fontWeight: 600, mb: 0.5 }}
                  >
                    {t('dashboard.quickActions')}
                  </Typography>
                  <Typography variant="caption" sx={{ opacity: 0.9 }}>
                    {t('dashboard.quickActionsDescription')}
                  </Typography>
                </Box> */}

                <Box sx={{ 
                   display: 'flex', 
                   gap: 2,
                   p: 2,
                   borderRadius: 2,
                   backgroundColor: 'primary.main',
                   color: 'white',
                   transition: 'all 0.3s ease',
                   cursor: 'pointer',
                   '&:hover': {
                     transform: 'translateY(-2px)',
                     boxShadow: '0 4px 12px rgba(10, 186, 181, 0.3)',
                 }
                }}
                >
                  <Box sx={{ flex: 1 }}>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        mb: 1,
                      }}
                    >
                      <Box
                        sx={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          backgroundColor: 'white',
                        }}
                      />
                      <Typography variant="caption" sx={{ fontSize: '0.75rem', color: 'white' }}>
                        {t('dashboard.present')}
                      </Typography>
                    </Box>
                    <Typography
                      variant="h6"
                      sx={{ fontWeight: 700, color: 'white' }}
                    >
                      {presentStudents}
                    </Typography>
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        mb: 1,
                      }}
                    >
                      <Box
                        sx={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          backgroundColor: '#FF6B9D',
                        }}
                      />
                      <Typography variant="caption" sx={{ fontSize: '0.75rem', color: 'white' }}>
                        {t('dashboard.absent')}
                      </Typography>
                    </Box>
                    <Typography
                      variant="h6"
                      sx={{ fontWeight: 700, color: '#FF6B9D' }}
                    >
                      {absentStudents}
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </CardContent>
          </StatCard>
        </Grid>
      </Grid>
    </Box>
  )
}

export default Dashboard
