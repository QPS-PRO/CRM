import { Navigate } from 'react-router-dom'
import { Box, CircularProgress } from '@mui/material'
import { useAuth } from '../contexts/AuthContext'

function ProtectedRoute({ children, requiredRole = null }) {
  const { isAuthenticated, loading, user } = useAuth()

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
        }}
      >
        <CircularProgress />
      </Box>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  // Check role-based access
  if (requiredRole) {
    const userRole = user?.role || 'VIEWER'
    const isAdmin = userRole === 'ADMIN' || user?.is_superuser || user?.is_staff
    
    if (requiredRole === 'ADMIN' && !isAdmin) {
      return <Navigate to="/attendance-dashboard" replace />
    }
  }

  return children
}

export default ProtectedRoute

