import React, { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'
import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Collapse,
  Chip,
  IconButton,
  AppBar,
  Toolbar,
  Avatar,
  Tooltip,
} from '@mui/material'
import { styled, alpha } from '@mui/material/styles'
import DashboardIcon from '@mui/icons-material/Dashboard'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import PeopleIcon from '@mui/icons-material/People'
import FamilyRestroomIcon from '@mui/icons-material/FamilyRestroom'
import DevicesIcon from '@mui/icons-material/Devices'
import BusinessIcon from '@mui/icons-material/Business'
import AssessmentIcon from '@mui/icons-material/Assessment'
import SmsIcon from '@mui/icons-material/Sms'
import SettingsIcon from '@mui/icons-material/Settings'
import ExpandLess from '@mui/icons-material/ExpandLess'
import ExpandMore from '@mui/icons-material/ExpandMore'
import MenuIcon from '@mui/icons-material/Menu'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import LogoutIcon from '@mui/icons-material/Logout'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import Divider from '@mui/material/Divider'
import LanguageIcon from '@mui/icons-material/Language'

const drawerWidth = 280
const collapsedDrawerWidth = 72

const StyledDrawer = styled(Drawer)(({ theme }) => ({
  '& .MuiDrawer-paper': {
    backgroundColor: '#ffffff',
    borderRight: '1px solid rgba(0, 0, 0, 0.08)',
    boxShadow: 'none',
    transition: 'width 0.3s ease',
    overflowX: 'hidden',
  },
}))

const LogoBox = styled(Box)(({ theme, collapsed }) => ({
  display: 'flex',
  alignItems: 'center',
  padding: theme.spacing(2.5, collapsed ? 1.5 : 2),
  gap: theme.spacing(1),
  cursor: 'pointer',
  justifyContent: collapsed ? 'center' : 'flex-start',
  '&:hover': {
    '& .logo-circle': {
      transform: 'scale(1.1)',
      transition: 'transform 0.3s ease',
    },
  },
}))

const LogoCircle = styled(Box)(({ theme }) => ({
  width: 40,
  height: 40,
  borderRadius: '50%',
  backgroundColor: theme.palette.primary.main,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'transform 0.3s ease',
  flexShrink: 0,
}))

const StyledListItemButton = styled(ListItemButton)(({ theme, selected, collapsed }) => ({
  margin: theme.spacing(0.5, collapsed ? 0.75 : 1.5),
  borderRadius: theme.spacing(1.5),
  padding: theme.spacing(1.25, collapsed ? 1.25 : 1.5),
  justifyContent: collapsed ? 'center' : 'flex-start',
  minHeight: 48,
  transition: 'all 0.3s ease',
  '&:hover': {
    backgroundColor: alpha(theme.palette.primary.main, 0.08),
    transform: collapsed ? 'scale(1.1)' : 'translateX(4px)',
  },
  ...(selected && {
    backgroundColor: alpha(theme.palette.primary.main, 0.12),
    color: theme.palette.primary.main,
    '& .MuiListItemIcon-root': {
      color: theme.palette.primary.main,
    },
    '& .MuiListItemText-primary': {
      fontWeight: 600,
    },
  }),
}))

const SectionLabel = styled(Typography)(({ theme, collapsed }) => ({
  padding: theme.spacing(1.5, collapsed ? 1 : 2, 0.5),
  fontSize: '0.75rem',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  color: theme.palette.text.secondary,
  textAlign: collapsed ? 'center' : 'left',
  opacity: collapsed ? 0 : 1,
  transition: 'opacity 0.3s ease',
}))

const menuItems = (t) => [
  {
    text: t('navigation.home'),
    icon: <DashboardIcon />,
    path: '/',
    badge: null,
  },
]

const attendanceSubItems = (t) => [
  {
    text: t('navigation.attendanceDashboard'),
    icon: <DashboardIcon />,
    path: '/attendance-dashboard',
  },
  {
    text: t('navigation.attendanceLogs'),
    icon: <AccessTimeIcon />,
    path: '/attendance',
  },
  {
    text: t('navigation.devices'),
    icon: <DevicesIcon />,
    path: '/devices',
  },
  {
    text: t('navigation.students'),
    icon: <PeopleIcon />,
    path: '/students',
  },
  {
    text: t('navigation.parents'),
    icon: <FamilyRestroomIcon />,
    path: '/parents',
  },
  {
    text: t('navigation.branches'),
    icon: <BusinessIcon />,
    path: '/branches',
  },
  {
    text: t('navigation.smsLogs'),
    icon: <SmsIcon />,
    path: '/sms-logs',
  },
  {
    text: t('navigation.reports'),
    icon: <AssessmentIcon />,
    path: '/reports',
  },
  {
    text: t('navigation.settings'),
    icon: <SettingsIcon />,
    path: '/settings',
  },
]

const appItems = (t) => [
  {
    text: t('navigation.attendance'),
    icon: <AccessTimeIcon />,
    path: '/attendance',
    subItems: attendanceSubItems(t),
  },
]

function Layout({ children }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [appsOpen, setAppsOpen] = useState(true)
  const [attendanceOpen, setAttendanceOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [anchorEl, setAnchorEl] = useState(null)
  const [langAnchorEl, setLangAnchorEl] = useState(null)
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuth()
  const { t } = useTranslation()
  const { language, changeLanguage } = useLanguage()

  const handleAvatarClick = (event) => {
    setAnchorEl(event.currentTarget)
  }

  const handleMenuClose = () => {
    setAnchorEl(null)
  }

  const handleLogout = async () => {
    await logout()
    navigate('/login')
    handleMenuClose()
  }

  const handleLangMenuOpen = (event) => {
    setLangAnchorEl(event.currentTarget)
  }

  const handleLangMenuClose = () => {
    setLangAnchorEl(null)
  }

  const handleLanguageChange = (lang) => {
    changeLanguage(lang)
    handleLangMenuClose()
  }

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen)
  }

  const handleAppsToggle = () => {
    if (!collapsed) {
      setAppsOpen(!appsOpen)
    }
  }

  const handleAttendanceToggle = () => {
    if (!collapsed) {
      setAttendanceOpen(!attendanceOpen)
    }
  }

  const handleCollapseToggle = () => {
    setCollapsed(!collapsed)
    if (collapsed) {
      setAppsOpen(true)
    }
  }

  const currentWidth = collapsed ? collapsedDrawerWidth : drawerWidth

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <LogoBox collapsed={collapsed} onClick={() => navigate('/')}>
        <LogoCircle className="logo-circle">
          <Typography
            variant="h6"
            sx={{
              color: 'white',
              fontWeight: 700,
              fontSize: '1.2rem',
            }}
          >
            S
          </Typography>
        </LogoCircle>
        {!collapsed && (
          <Typography
            variant="h6"
            sx={{
              fontWeight: 700,
              color: '#1a1a1a',
              fontSize: '1.25rem',
              whiteSpace: 'nowrap',
            }}
          >
          {t('navigation.schoolHub')}
          </Typography>
        )}
        {!collapsed && (
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation()
              handleCollapseToggle()
            }}
            sx={{
              ml: 'auto',
              color: 'text.secondary',
              '&:hover': { color: 'primary.main' },
            }}
          >
            <ChevronLeftIcon sx={{ fontSize: '0.875rem' }} />
          </IconButton>
        )}
      </LogoBox>

      <Box sx={{ flex: 1, overflow: 'auto' }}>
        <List sx={{ px: collapsed ? 0.5 : 1 }}>
          {menuItems(t).map((item) => {
            const selected = location.pathname === item.path
            return (
              <ListItem key={item.text} disablePadding>
                <Tooltip title={collapsed ? item.text : ''} placement="right">
                  <StyledListItemButton
                    selected={selected}
                    collapsed={collapsed}
                    onClick={() => {
                      navigate(item.path)
                      setMobileOpen(false)
                    }}
                  >
                    <ListItemIcon
                      sx={{
                        color: selected ? 'primary.main' : 'text.secondary',
                        minWidth: collapsed ? 0 : 40,
                        justifyContent: 'center',
                      }}
                    >
                      {item.icon}
                    </ListItemIcon>
                    {!collapsed && (
                      <>
                        <ListItemText
                          primary={item.text}
                          primaryTypographyProps={{
                            fontSize: '0.9375rem',
                          }}
                        />
                        {item.badge && (
                          <Chip
                            label={item.badge}
                            size="small"
                            sx={{
                              height: 20,
                              fontSize: '0.7rem',
                              backgroundColor: '#FF6B9D',
                              color: 'white',
                              fontWeight: 600,
                            }}
                          />
                        )}
                      </>
                    )}
                  </StyledListItemButton>
                </Tooltip>
              </ListItem>
            )
          })}

          {!collapsed && <SectionLabel collapsed={collapsed}>{t('navigation.apps')}</SectionLabel>}
          {appItems(t).map((item) => {
            const hasSubItems = item.subItems && item.subItems.length > 0
            const isSelected = location.pathname === item.path || (hasSubItems && item.subItems.some(subItem => location.pathname === subItem.path))
            const isOpen = item.text === t('navigation.attendance') ? attendanceOpen : appsOpen
            
            return (
              <React.Fragment key={item.text}>
                {!collapsed && hasSubItems && (
                  <ListItem disablePadding>
                    <ListItemButton
                      onClick={item.text === t('navigation.attendance') ? handleAttendanceToggle : handleAppsToggle}
                      sx={{
                        margin: (theme) => theme.spacing(0.5, 1.5),
                        borderRadius: (theme) => theme.spacing(1.5),
                        padding: (theme) => theme.spacing(1.25, 1.5),
                        backgroundColor: isSelected ? alpha('#0ABAB5', 0.12) : 'transparent',
                        '&:hover': {
                          backgroundColor: alpha('#0ABAB5', 0.08),
                        },
                      }}
                    >
                      <ListItemIcon
                        sx={{
                          color: isSelected ? 'primary.main' : 'text.secondary',
                          minWidth: 40,
                        }}
                      >
                        {item.icon}
                      </ListItemIcon>
                      <ListItemText
                        primary={item.text}
                        primaryTypographyProps={{
                          fontSize: '0.9375rem',
                          fontWeight: isSelected ? 600 : 500,
                          color: isSelected ? 'primary.main' : 'text.primary',
                        }}
                      />
                      {isOpen ? <ExpandLess /> : <ExpandMore />}
                    </ListItemButton>
                  </ListItem>
                )}
                <Collapse in={(isOpen || collapsed) && hasSubItems} timeout="auto" unmountOnExit>
                  <List component="div" disablePadding>
                    {hasSubItems && item.subItems.map((subItem) => {
                      const subSelected = location.pathname === subItem.path
                      return (
                        <ListItem key={subItem.text} disablePadding>
                          <Tooltip title={collapsed ? subItem.text : ''} placement="right">
                            <StyledListItemButton
                              selected={subSelected}
                              collapsed={collapsed}
                              sx={{ pl: collapsed ? 0 : 4 }}
                              onClick={() => {
                                navigate(subItem.path)
                                setMobileOpen(false)
                              }}
                            >
                              <ListItemIcon
                                sx={{
                                  color: subSelected ? 'primary.main' : 'text.secondary',
                                  minWidth: collapsed ? 0 : 40,
                                  justifyContent: 'center',
                                }}
                              >
                                {subItem.icon}
                              </ListItemIcon>
                              {!collapsed && (
                                <ListItemText
                                  primary={subItem.text}
                                  primaryTypographyProps={{
                                    fontSize: '0.9375rem',
                                  }}
                                />
                              )}
                            </StyledListItemButton>
                          </Tooltip>
                        </ListItem>
                      )
                    })}
                  </List>
                </Collapse>
                {!hasSubItems && (
                  <ListItem disablePadding>
                    <Tooltip title={collapsed ? item.text : ''} placement="right">
                      <StyledListItemButton
                        selected={isSelected}
                        collapsed={collapsed}
                        onClick={() => {
                          navigate(item.path)
                          setMobileOpen(false)
                        }}
                      >
                        <ListItemIcon
                          sx={{
                            color: isSelected ? 'primary.main' : 'text.secondary',
                            minWidth: collapsed ? 0 : 40,
                            justifyContent: 'center',
                          }}
                        >
                          {item.icon}
                        </ListItemIcon>
                        {!collapsed && (
                          <ListItemText
                            primary={item.text}
                            primaryTypographyProps={{
                              fontSize: '0.9375rem',
                            }}
                          />
                        )}
                      </StyledListItemButton>
                    </Tooltip>
                  </ListItem>
                )}
              </React.Fragment>
            )
          })}
        </List>
      </Box>

      {collapsed && (
        <Box sx={{ p: 1, display: 'flex', justifyContent: 'center' }}>
          <IconButton
            onClick={handleCollapseToggle}
            sx={{
              color: 'text.secondary',
              '&:hover': { color: 'primary.main' },
            }}
          >
            <ChevronRightIcon />
          </IconButton>
        </Box>
      )}
    </Box>
  )

  return (
    <Box sx={{ display: 'flex', bgcolor: 'background.default', minHeight: '100vh' }}>
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${currentWidth}px)` },
          ml: { sm: `${currentWidth}px` },
          backgroundColor: 'white',
          color: 'text.primary',
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          transition: 'width 0.3s ease, margin-left 0.3s ease',
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Box sx={{ flexGrow: 1 }} />
          <IconButton color="inherit" onClick={handleLangMenuOpen} sx={{ mr: 1 }}>
            <LanguageIcon />
          </IconButton>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              cursor: 'pointer',
              padding: '4px 8px',
              borderRadius: 1,
              '&:hover': {
                backgroundColor: alpha('#0ABAB5', 0.08),
              },
            }}
            onClick={handleAvatarClick}
          >
            <Avatar
              sx={{
                width: 36,
                height: 36,
                bgcolor: 'primary.main',
              }}
            >
              {user?.username?.charAt(0).toUpperCase() || 'A'}
            </Avatar>
            <Typography
              variant="body2"
              sx={{
                fontWeight: 500,
                color: 'text.primary',
                display: { xs: 'none', sm: 'block' },
              }}
            >
              {user?.username || 'User'}
            </Typography>
          </Box>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
            onClick={handleMenuClose}
            PaperProps={{
              elevation: 0,
              sx: {
                overflow: 'visible',
                filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.32))',
                mt: 1.5,
                '& .MuiAvatar-root': {
                  width: 32,
                  height: 32,
                  ml: -0.5,
                  mr: 1,
                },
                '&:before': {
                  content: '""',
                  display: 'block',
                  position: 'absolute',
                  top: 0,
                  right: 14,
                  width: 10,
                  height: 10,
                  bgcolor: 'background.paper',
                  transform: 'translateY(-50%) rotate(45deg)',
                  zIndex: 0,
                },
              },
            }}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          >
            <MenuItem disabled>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {user?.username || 'User'}
              </Typography>
            </MenuItem>
            {user?.email && (
              <MenuItem disabled>
                <Typography variant="body2" color="text.secondary">
                  {user.email}
                </Typography>
              </MenuItem>
            )}
            <Divider />
            <MenuItem onClick={handleLogout}>
              <ListItemIcon>
                <LogoutIcon fontSize="small" />
              </ListItemIcon>
              {t('auth.logout')}
            </MenuItem>
          </Menu>
          <Menu
            anchorEl={langAnchorEl}
            open={Boolean(langAnchorEl)}
            onClose={handleLangMenuClose}
          >
            <MenuItem
              onClick={() => handleLanguageChange('en')}
              selected={language === 'en'}
            >
              English
            </MenuItem>
            <MenuItem
              onClick={() => handleLanguageChange('ar')}
              selected={language === 'ar'}
            >
              العربية
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>
      <Box
        component="nav"
        sx={{
          width: { sm: currentWidth },
          flexShrink: { sm: 0 },
          transition: 'width 0.3s ease',
        }}
      >
        <StyledDrawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true,
          }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
            },
          }}
        >
          {drawer}
        </StyledDrawer>
        <StyledDrawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: currentWidth,
            },
          }}
          open
        >
          {drawer}
        </StyledDrawer>
      </Box>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 2, sm: 3 },
          width: { sm: `calc(100% - ${currentWidth}px)` },
          backgroundColor: 'background.default',
          transition: 'width 0.3s ease',
        }}
      >
        <Toolbar />
        {children}
      </Box>
    </Box>
  )
}

export default Layout
