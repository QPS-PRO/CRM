import client from './client'

export const getAttendanceRecords = async (params) => {
  const response = await client.get('/attendance/records/', { params })
  return response.data
}

export const getAttendanceRecord = async (id) => {
  const response = await client.get(`/attendance/records/${id}/`)
  return response.data
}

export const createAttendanceRecord = async (data) => {
  const response = await client.post('/attendance/records/', data)
  return response.data
}

export const createAttendanceFromDevice = async (data) => {
  const response = await client.post('/attendance/records/create_from_device/', data)
  return response.data
}

export const getStudentAttendance = async (studentId) => {
  const response = await client.get('/attendance/records/student_attendance/', {
    params: { student_id: studentId },
  })
  return response.data
}

export const getTodaySummary = async (params) => {
  const response = await client.get('/attendance/records/today_summary/', { params })
  return response.data
}

export const getAttendanceOverview = async (params) => {
  const response = await client.get('/attendance/records/attendance_overview/', { params })
  return response.data
}

export const getAttendanceReport = async (params) => {
  const response = await client.get('/attendance/records/attendance_report/', { params })
  return response.data
}

export const deleteAttendanceRecord = async (id) => {
  const response = await client.delete(`/attendance/records/${id}/`)
  return response.data
}

export const getAttendanceSettings = async () => {
  const response = await client.get('/attendance/settings/')
  return Array.isArray(response.data) ? response.data[0] : response.data
}

export const updateAttendanceSettings = async (data) => {
  const response = await client.patch('/attendance/settings/1/', data)
  return response.data
}

