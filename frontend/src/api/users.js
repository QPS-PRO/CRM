import client from './client'

export const getUsers = async (params = {}) => {
  const response = await client.get('/core/users/', { params })
  return response.data
}

export const getUser = async (id) => {
  const response = await client.get(`/core/users/${id}/`)
  return response.data
}

export const createUser = async (userData) => {
  const response = await client.post('/core/users/', userData)
  return response.data
}

export const updateUser = async (id, userData) => {
  const response = await client.patch(`/core/users/${id}/`, userData)
  return response.data
}

export const deleteUser = async (id) => {
  const response = await client.delete(`/core/users/${id}/`)
  return response.data
}
