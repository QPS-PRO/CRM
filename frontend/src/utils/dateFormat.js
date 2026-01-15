import { format } from 'date-fns'

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const MONTH_NAMES_FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

/**
 * Format a timestamp string in its original timezone without conversion
 * The backend now returns timestamps in device timezone (e.g., "2026-01-15T03:47:00+03:00")
 * This function extracts and formats the time without converting to browser's local timezone
 */
export function formatTimestampInOriginalTimezone(timestampString, formatString = 'dd MMM, yyyy HH:mm') {
  if (!timestampString) return '-'
  
  try {
    // Parse the ISO string to extract date/time components
    // Format: "2026-01-15T03:47:00+03:00" or "2026-01-15T03:47:00Z" or "2026-01-15T03:47:00"
    const isoMatch = timestampString.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/)
    
    if (isoMatch) {
      const [, year, month, day, hours, minutes] = isoMatch
      const yearNum = parseInt(year)
      const monthNum = parseInt(month)
      const dayNum = parseInt(day)
      const hoursNum = parseInt(hours)
      const minutesNum = parseInt(minutes)
      
      // Format based on the format string
      let result = formatString
      
      // Replace format tokens with actual values
      result = result.replace(/yyyy/g, year)
      result = result.replace(/MMM/g, MONTH_NAMES[monthNum - 1])
      result = result.replace(/MMMM/g, MONTH_NAMES_FULL[monthNum - 1])
      result = result.replace(/MM/g, month.padStart(2, '0'))
      result = result.replace(/dd/g, day.padStart(2, '0'))
      result = result.replace(/HH/g, hours.padStart(2, '0'))
      result = result.replace(/mm/g, minutes.padStart(2, '0'))
      
      return result
    }
    
    // Fallback: try parsing as regular date (will convert to browser timezone)
    const date = new Date(timestampString)
    if (!isNaN(date.getTime())) {
      return format(date, formatString)
    }
    
    return timestampString
  } catch (error) {
    console.error('Error formatting timestamp:', error, timestampString)
    return timestampString
  }
}

/**
 * Format time only (HH:mm) from timestamp in original timezone
 */
export function formatTimeInOriginalTimezone(timestampString) {
  return formatTimestampInOriginalTimezone(timestampString, 'HH:mm')
}
