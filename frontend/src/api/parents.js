import client from './client'

export const getParents = async (params) => {
  const response = await client.get('/core/parents/', { params })
  return response.data
}

export const getAllParents = async () => {
  const response = await client.get('/core/parents/all/')
  return response.data
}

export const getParent = async (id) => {
  const response = await client.get(`/core/parents/${id}/`)
  return response.data
}

export const createParent = async (data) => {
  const response = await client.post('/core/parents/', data)
  return response.data
}

export const updateParent = async (id, data) => {
  const response = await client.patch(`/core/parents/${id}/`, data)
  return response.data
}

export const deleteParent = async (id) => {
  const response = await client.delete(`/core/parents/${id}/`)
  return response.data
}

export const bulkUploadParents = async (file) => {
  const formData = new FormData()
  formData.append('file', file)
  const response = await client.post('/core/parents/bulk_upload/', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
  return response.data
}

