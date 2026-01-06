import client from './client'

export const getSMSLogs = async (params) => {
  const response = await client.get('/attendance/sms-logs/', { params })
  return response.data
}

export const getSMSLog = async (id) => {
  const response = await client.get(`/attendance/sms-logs/${id}/`)
  return response.data
}

export const deleteSMSLog = async (id) => {
  const response = await client.delete(`/attendance/sms-logs/${id}/`)
  return response.data
}

export const getSMSStatistics = async (params) => {
  const response = await client.get('/attendance/sms-logs/statistics/', { params })
  return response.data
}

