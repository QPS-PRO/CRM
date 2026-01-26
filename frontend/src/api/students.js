import client from './client'

export const getStudents = async (params) => {
  const response = await client.get('/core/students/', { params })
  return response.data
}

export const getStudent = async (id) => {
  const response = await client.get(`/core/students/${id}/`)
  return response.data
}

export const createStudent = async (data) => {
  const response = await client.post('/core/students/', data)
  return response.data
}

export const updateStudent = async (id, data) => {
  const response = await client.patch(`/core/students/${id}/`, data)
  return response.data
}

export const deleteStudent = async (id) => {
  const response = await client.delete(`/core/students/${id}/`)
  return response.data
}

export const getStudentsByGrade = async (grade) => {
  const response = await client.get('/core/students/by_grade/', { params: { grade } })
  return response.data
}

export const bulkUploadStudents = async (file) => {
  const formData = new FormData()
  formData.append('file', file)
  const response = await client.post('/core/students/bulk_upload/', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
  return response.data
}

export const getClasses = async (params) => {
  // Fetch unique class names directly from the backend endpoint
  const response = await client.get('/core/students/classes/', { params })
  return response.data
}
