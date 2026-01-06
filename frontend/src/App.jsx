import { useMemo } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import { CacheProvider } from '@emotion/react'
import createCache from '@emotion/cache'
import rtlPlugin from 'stylis-plugin-rtl'
import CssBaseline from '@mui/material/CssBaseline'
import { AuthProvider } from './contexts/AuthContext'
import { LanguageProvider, useLanguage } from './contexts/LanguageContext'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import Home from './pages/Home'
import Dashboard from './pages/Dashboard'
import Students from './pages/Students'
import Parents from './pages/Parents'
import Attendance from './pages/Attendance'
import Devices from './pages/Devices'
import Branches from './pages/Branches'
import Reports from './pages/Reports'
import SMSLogs from './pages/SMSLogs'
import Settings from './pages/Settings'

// Create RTL cache
const cacheRtl = createCache({
  key: 'muirtl',
  stylisPlugins: [rtlPlugin],
})

// Create LTR cache
const cacheLtr = createCache({
  key: 'muiltr',
})

function AppContent() {
  const { isRTL, language } = useLanguage()

  const theme = useMemo(
    () =>
      createTheme({
        direction: isRTL ? 'rtl' : 'ltr',
        palette: {
          primary: {
            main: '#0ABAB5',
            light: '#3BC9C5',
            dark: '#08918D',
            contrastText: '#ffffff',
          },
          secondary: {
            main: '#FF6B9D',
          },
          background: {
            default: '#F5F7FA',
            paper: '#ffffff',
          },
        },
        typography: {
          fontFamily: isRTL
            ? '"Cairo", "Tajawal", "Arial", sans-serif'
            : '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
          h4: {
            fontWeight: 600,
          },
          h5: {
            fontWeight: 600,
          },
          h6: {
            fontWeight: 600,
          },
        },
        shape: {
          borderRadius: 12,
        },
      }),
    [isRTL]
  )

  // Update document direction
  useMemo(() => {
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr'
    document.documentElement.lang = language
  }, [isRTL, language])

  return (
    <CacheProvider value={isRTL ? cacheRtl : cacheLtr}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Routes>
                      <Route path="/" element={<Home />} />
                      <Route path="/attendance-dashboard" element={<Dashboard />} />
                      <Route path="/students" element={<Students />} />
                      <Route path="/parents" element={<Parents />} />
                      <Route path="/attendance" element={<Attendance />} />
                      <Route path="/reports" element={<Reports />} />
                      <Route path="/sms-logs" element={<SMSLogs />} />
                      <Route path="/devices" element={<Devices />} />
                      <Route path="/branches" element={<Branches />} />
                      <Route path="/settings" element={<Settings />} />
                      <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                  </Layout>
                </ProtectedRoute>
              }
            />
          </Routes>
        </AuthProvider>
      </ThemeProvider>
    </CacheProvider>
  )
}

function App() {
  return (
    <LanguageProvider>
      <AppContent />
    </LanguageProvider>
  )
}

export default App

