import client from './client'

export const getBranches = async (params = {}) => {
  const response = await client.get('/core/branches/', { params })
  return response.data
}

export const getBranch = async (id) => {
  const response = await client.get(`/core/branches/${id}/`)
  return response.data
}

export const createBranch = async (data) => {
  const response = await client.post('/core/branches/', data)
  return response.data
}

export const updateBranch = async (id, data) => {
  const response = await client.patch(`/core/branches/${id}/`, data)
  return response.data
}

export const deleteBranch = async (id) => {
  const response = await client.delete(`/core/branches/${id}/`)
  return response.data
}

