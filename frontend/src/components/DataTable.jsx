import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Checkbox,
  IconButton,
  Typography,
  TextField,
  InputAdornment,
  Button,
  Menu,
  MenuItem,
  Avatar,
  Tooltip,
} from '@mui/material'
import { styled, alpha } from '@mui/material/styles'
import SearchIcon from '@mui/icons-material/Search'
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward'
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'

const StyledTableContainer = styled(TableContainer)(({ theme }) => ({
  borderRadius: theme.spacing(2),
  boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
  backgroundColor: 'white',
}))

const StyledTableHead = styled(TableHead)(({ theme }) => ({
  backgroundColor: alpha(theme.palette.primary.main, 0.04),
  '& .MuiTableCell-head': {
    fontWeight: 600,
    fontSize: '0.875rem',
    color: theme.palette.text.primary,
    borderBottom: `2px solid ${alpha(theme.palette.primary.main, 0.1)}`,
  },
}))

const StyledTableCell = styled(TableCell)(({ theme }) => ({
  padding: theme.spacing(1.5, 2),
  '&:first-of-type': {
    paddingLeft: theme.spacing(3),
  },
  '&:last-of-type': {
    paddingRight: theme.spacing(3),
  },
}))

const StyledTableRow = styled(TableRow)(({ theme }) => ({
  transition: 'all 0.2s ease',
  '&:hover': {
    backgroundColor: alpha(theme.palette.primary.main, 0.04),
    transform: 'scale(1.01)',
    boxShadow: `0 2px 8px ${alpha(theme.palette.primary.main, 0.1)}`,
  },
  '&.Mui-selected': {
    backgroundColor: alpha(theme.palette.primary.main, 0.08),
  },
}))

const HeaderActions = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  padding: theme.spacing(2, 3),
  borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
}))

const SearchBox = styled(TextField)(({ theme }) => ({
  '& .MuiOutlinedInput-root': {
    borderRadius: theme.spacing(1.5),
    backgroundColor: alpha(theme.palette.common.black, 0.04),
    transition: 'all 0.3s ease',
    '&:hover': {
      backgroundColor: alpha(theme.palette.common.black, 0.06),
    },
    '&.Mui-focused': {
      backgroundColor: 'white',
      boxShadow: `0 0 0 2px ${alpha(theme.palette.primary.main, 0.2)}`,
    },
  },
}))

const ActionButton = styled(IconButton)(({ theme }) => ({
  transition: 'color 0.8s ease',
  '&:hover': {
    color: theme.palette.primary.main,
  },
}))

function DataTable({
  title,
  data = [],
  columns = [],
  onRowClick,
  onEdit,
  onDelete,
  onCreateNew,
  searchValue,
  onSearchChange,
  renderActions,
  renderTags,
  renderAvatar,
  showCheckbox = true,
  onBulkDelete,
  sortOptions,
  onSortChange,
  sortBy: externalSortBy,
  sortOrder: externalSortOrder,
  headerButtons,
  // Pagination props
  page,
  rowsPerPage,
  totalCount,
  onPageChange,
  onRowsPerPageChange,
  loading,
}) {
  const [selected, setSelected] = useState([])
  const [internalSortBy, setInternalSortBy] = useState(null)
  const [internalSortOrder, setInternalSortOrder] = useState('asc')
  const [bulkActionAnchor, setBulkActionAnchor] = useState(null)
  const [sortAnchor, setSortAnchor] = useState(null)
  const [selectedBulkAction, setSelectedBulkAction] = useState(null)
  const [rowMenuAnchor, setRowMenuAnchor] = useState(null)
  const [selectedRow, setSelectedRow] = useState(null)
  const { t } = useTranslation()

  const sortBy = externalSortBy !== undefined ? externalSortBy : internalSortBy
  const sortOrder = externalSortOrder !== undefined ? externalSortOrder : internalSortOrder

  const handleSelectAll = (event) => {
    if (event.target.checked) {
      setSelected(data.map((row) => row.id))
    } else {
      setSelected([])
    }
  }

  const handleSelectRow = (id) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  const handleSort = (column) => {
    if (onSortChange) {
      const newOrder = sortBy === column && sortOrder === 'asc' ? 'desc' : 'asc'
      onSortChange(column === sortBy && sortOrder === 'asc' ? { column, order: 'desc' } : { column, order: 'asc' })
    } else {
      if (sortBy === column) {
        setInternalSortOrder(internalSortOrder === 'asc' ? 'desc' : 'asc')
      } else {
        setInternalSortBy(column)
        setInternalSortOrder('asc')
      }
    }
  }

  const handleBulkActionMenuOpen = (event) => {
    setBulkActionAnchor(event.currentTarget)
  }

  const handleBulkActionMenuClose = () => {
    setBulkActionAnchor(null)
  }

  const handleBulkActionSelect = (action) => {
    setSelectedBulkAction(action)
    setBulkActionAnchor(null)
  }

  const handleApplyBulkAction = () => {
    if (selectedBulkAction === 'delete' && onBulkDelete && selected.length > 0) {
      onBulkDelete(selected)
      setSelected([])
      setSelectedBulkAction(null)
    }
  }

  const handleSortMenuOpen = (event) => {
    setSortAnchor(event.currentTarget)
  }

  const handleSortMenuClose = () => {
    setSortAnchor(null)
  }

  const handleSortOptionSelect = (option) => {
    if (onSortChange) {
      onSortChange({ column: option.value, order: 'asc' })
    }
    setSortAnchor(null)
  }

  const handleRowMenuOpen = (event, row) => {
    setRowMenuAnchor(event.currentTarget)
    setSelectedRow(row)
  }

  const handleRowMenuClose = () => {
    setRowMenuAnchor(null)
    setSelectedRow(null)
  }

  const getInitials = (name) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const getAvatarColor = (name) => {
    const colors = [
      '#0ABAB5',
      '#FF6B9D',
      '#4CAF50',
      '#FF9800',
      '#9C27B0',
      '#F44336',
      '#2196F3',
    ]
    const index = name.charCodeAt(0) % colors.length
    return colors[index]
  }

  return (
    <Box>
      <HeaderActions>
        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="h5" sx={{ fontWeight: 600 }}>
            {title}
          </Typography>
          {onCreateNew && (
            <Button
              variant="contained"
              onClick={onCreateNew}
              sx={{
                backgroundColor: 'primary.main',
                textTransform: 'none',
                borderRadius: 2,
                px: 2,
                '&:hover': {
                  backgroundColor: 'primary.dark',
                  transform: 'translateY(-2px)',
                  boxShadow: '0 4px 12px rgba(10, 186, 181, 0.3)',
                },
              }}
            >
            {t('common.createNew')}
          </Button>
          )}
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {headerButtons}
          <Button
            variant="outlined"
            size="small"
            sx={{ textTransform: 'none', borderRadius: 2 }}
            onClick={handleBulkActionMenuOpen}
            endIcon={bulkActionAnchor ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
            disabled={!onBulkDelete}
          >
            {t('common.bulkActions')}
          </Button>
          {selected.length > 0 && selectedBulkAction && (
            <Button
              variant="contained"
              size="small"
              sx={{
                textTransform: 'none',
                borderRadius: 2,
                backgroundColor: 'primary.main',
              }}
              onClick={handleApplyBulkAction}
            >
              {t('common.apply')} ({selected.length})
            </Button>
          )}
          {sortOptions && sortOptions.length > 0 && (
            <>
              <Button
                variant="outlined"
                size="small"
                sx={{ textTransform: 'none', borderRadius: 2 }}
                onClick={handleSortMenuOpen}
                endIcon={sortAnchor ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
              >
                {t('common.sortBy')}: {sortOptions.find(opt => opt.value === sortBy)?.label || sortOptions[0]?.label || 'Date Created'}
              </Button>
              <Menu
                anchorEl={sortAnchor}
                open={Boolean(sortAnchor)}
                onClose={handleSortMenuClose}
              >
                {sortOptions.map((option) => (
                  <MenuItem
                    key={option.value}
                    onClick={() => handleSortOptionSelect(option)}
                    selected={sortBy === option.value}
                  >
                    {option.label}
                  </MenuItem>
                ))}
              </Menu>
            </>
          )}
        </Box>
        <Menu
          anchorEl={bulkActionAnchor}
          open={Boolean(bulkActionAnchor)}
          onClose={handleBulkActionMenuClose}
        >
            <MenuItem
              onClick={() => handleBulkActionSelect('delete')}
              selected={selectedBulkAction === 'delete'}
            >
              <DeleteOutlineIcon sx={{ mr: 1, fontSize: '1rem' }} />
              {t('common.moveToTrash')}
            </MenuItem>
        </Menu>
      </HeaderActions>

      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          p: 2,
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <SearchBox
            key="search-input"
            placeholder={t('common.search')}
            size="small"
            value={searchValue || ''}
            onChange={(e) => {
              e.persist()
              onSearchChange?.(e.target.value)
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: 'text.secondary' }} />
                </InputAdornment>
              ),
            }}
            sx={{ width: 250 }}
            autoComplete="off"
          />
        </Box>
      </Box>

      <StyledTableContainer>
        <Table>
          <StyledTableHead>
            <TableRow>
              {showCheckbox && (
                <StyledTableCell padding="checkbox">
                  <Checkbox
                    indeterminate={
                      selected.length > 0 && selected.length < data.length
                    }
                    checked={data.length > 0 && selected.length === data.length}
                    onChange={handleSelectAll}
                  />
                </StyledTableCell>
              )}
              {columns.map((column) => (
                <StyledTableCell
                  key={column.id}
                  sx={{
                    cursor: 'pointer',
                    userSelect: 'none',
                    '&:hover': {
                      backgroundColor: alpha('#0ABAB5', 0.05),
                    },
                  }}
                  onClick={() => column.sortable && handleSort(column.id)}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {column.label}
                    {column.sortable && (
                      <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                        <ArrowUpwardIcon
                          sx={{
                            fontSize: 14,
                            color:
                              sortBy === column.id && sortOrder === 'asc'
                                ? 'primary.main'
                                : 'text.disabled',
                          }}
                        />
                        <ArrowDownwardIcon
                          sx={{
                            fontSize: 14,
                            marginTop: '-8px',
                            color:
                              sortBy === column.id && sortOrder === 'desc'
                                ? 'primary.main'
                                : 'text.disabled',
                          }}
                        />
                      </Box>
                    )}
                  </Box>
                </StyledTableCell>
              ))}
              <StyledTableCell align="right">{t('common.actions')}</StyledTableCell>
            </TableRow>
          </StyledTableHead>
          <TableBody>
            {data.map((row) => (
              <StyledTableRow
                key={row.id}
                selected={selected.includes(row.id)}
                sx={{ cursor: onRowClick ? 'pointer' : 'default' }}
                onClick={() => onRowClick?.(row)}
              >
                {showCheckbox && (
                  <StyledTableCell padding="checkbox">
                    <Checkbox
                      checked={selected.includes(row.id)}
                      onChange={() => handleSelectRow(row.id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </StyledTableCell>
                )}
                {columns.map((column) => {
                  const columnId = column.id
                  const isNameColumn = columnId === 'name' || columnId === 'student_name'
                  const isTagsColumn = columnId === 'tags'
                  
                  return (
                    <StyledTableCell key={columnId}>
                      {isNameColumn ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          {renderAvatar ? (
                            renderAvatar(row)
                          ) : (
                            <Avatar
                              sx={{
                                bgcolor: getAvatarColor(row[columnId] || ''),
                                width: 36,
                                height: 36,
                                fontSize: '0.875rem',
                                fontWeight: 600,
                              }}
                            >
                              {getInitials(row[columnId] || '')}
                            </Avatar>
                          )}
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {row[columnId]}
                          </Typography>
                        </Box>
                      ) : isTagsColumn && renderTags ? (
                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                          {renderTags(row)}
                        </Box>
                      ) : (
                        <Typography variant="body2">{row[columnId] || '-'}</Typography>
                      )}
                    </StyledTableCell>
                  )
                })}
                <StyledTableCell align="right">
                  <Box
                    sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {onEdit && (
                      <Tooltip
                        title={t('common.edit')}
                        TransitionProps={{ timeout: 0 }}
                        componentsProps={{
                          tooltip: {
                            sx: {
                              transition: 'none !important',
                              animation: 'none !important',
                            },
                          },
                        }}
                      >
                        <ActionButton
                          size="small"
                          onClick={() => onEdit(row)}
                        >
                          <EditIcon fontSize="small" />
                        </ActionButton>
                      </Tooltip>
                    )}
                    {onDelete && (
                      <Tooltip
                        title={t('common.delete')}
                        TransitionProps={{ timeout: 0 }}
                        componentsProps={{
                          tooltip: {
                            sx: {
                              transition: 'none !important',
                              animation: 'none !important',
                            },
                          },
                        }}
                      >
                        <ActionButton
                          size="small"
                          onClick={() => onDelete(row)}
                          sx={{
                            '&:hover': {
                              color: '#F44336',
                            },
                          }}
                        >
                          <DeleteIcon fontSize="small" />
                        </ActionButton>
                      </Tooltip>
                    )}
                    {renderActions && (
                      <ActionButton
                        size="small"
                        onClick={(e) => handleRowMenuOpen(e, row)}
                      >
                        <MoreVertIcon fontSize="small" />
                      </ActionButton>
                    )}
                  </Box>
                </StyledTableCell>
              </StyledTableRow>
            ))}
          </TableBody>
        </Table>
      </StyledTableContainer>

      {renderActions && (
        <Menu
          anchorEl={rowMenuAnchor}
          open={Boolean(rowMenuAnchor)}
          onClose={handleRowMenuClose}
        >
          {renderActions(selectedRow)}
        </Menu>
      )}

      {/* Pagination */}
      {page !== undefined && totalCount !== undefined && (
        <TablePagination
          component="div"
          count={totalCount}
          page={page}
          onPageChange={(event, newPage) => {
            if (onPageChange) {
              onPageChange(newPage)
            }
          }}
          rowsPerPage={rowsPerPage || 15}
          onRowsPerPageChange={(event) => {
            if (onRowsPerPageChange) {
              onRowsPerPageChange(parseInt(event.target.value, 10))
            }
          }}
          rowsPerPageOptions={[15]}
          labelRowsPerPage={t('common.rowsPerPage')}
          labelDisplayedRows={({ from, to, count }) => {
            return `${from}-${to} ${t('common.of')} ${count !== -1 ? count : `more than ${to}`}`
          }}
        />
      )}
    </Box>
  )
}

export default DataTable

