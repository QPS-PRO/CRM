import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Box, Grid, Card, CardContent, Typography, CardActionArea } from '@mui/material'
import { styled, alpha } from '@mui/material/styles'
import AccessTimeIcon from '@mui/icons-material/AccessTime'

const StyledCard = styled(Card)(({ theme }) => ({
  borderRadius: theme.spacing(2),
  boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
  transition: 'all 0.3s ease',
  height: '100%',
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: '0 8px 24px rgba(10, 186, 181, 0.15)',
  },
}))

const AppIcon = styled(Box)(({ theme }) => ({
  width: 64,
  height: 64,
  borderRadius: theme.spacing(2),
  backgroundColor: alpha(theme.palette.primary.main, 0.1),
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  marginBottom: theme.spacing(2),
  '& svg': {
    fontSize: '2rem',
    color: theme.palette.primary.main,
  },
}))

function Home() {
  const navigate = useNavigate()
  const { t } = useTranslation()

  const apps = [
    {
      name: t('home.attendanceApp'),
      description: t('home.attendanceAppDescription'),
      icon: <AccessTimeIcon />,
      path: '/attendance-dashboard',
      color: '#0ABAB5',
    },
  ]

  return (
    <Box>
      <Typography
        variant="h4"
        sx={{
          fontWeight: 700,
          mb: 4,
          color: 'text.primary',
        }}
      >
        {t('home.title')}
      </Typography>

      <Grid container spacing={3}>
        {apps.map((app) => (
          <Grid item xs={12} sm={6} md={4} key={app.name}>
            <StyledCard>
              <CardActionArea
                onClick={() => navigate(app.path)}
                sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}
              >
                <AppIcon>{app.icon}</AppIcon>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                  {app.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {app.description}
                </Typography>
              </CardActionArea>
            </StyledCard>
          </Grid>
        ))}
      </Grid>
    </Box>
  )
}

export default Home

