import client from './client'

export const getDevices = async (params) => {
  const response = await client.get('/attendance/devices/', { params })
  return response.data
}

export const getDevice = async (id) => {
  const response = await client.get(`/attendance/devices/${id}/`)
  return response.data
}

export const createDevice = async (data) => {
  const response = await client.post('/attendance/devices/', data)
  return response.data
}

export const updateDevice = async (id, data) => {
  const response = await client.patch(`/attendance/devices/${id}/`, data)
  return response.data
}

export const deleteDevice = async (id) => {
  const response = await client.delete(`/attendance/devices/${id}/`)
  return response.data
}

export const getDeviceByGrade = async (grade) => {
  const response = await client.get('/attendance/devices/by_grade/', { params: { grade } })
  return response.data
}

export const syncDeviceAttendance = async (deviceId) => {
  const response = await client.post(`/attendance/devices/${deviceId}/sync_attendance/`)
  return response.data
}

export const syncAttendance = async (deviceId) => {
  const response = await client.post(`/attendance/devices/${deviceId}/sync_attendance/`)
  return response.data
}

export const syncDeviceStudents = async (deviceId) => {
  const response = await client.post(`/attendance/devices/${deviceId}/sync_students/`)
  return response.data
}

export const testDeviceConnection = async (deviceId) => {
  const response = await client.get(`/attendance/devices/${deviceId}/test_connection/`)
  return response.data
}

