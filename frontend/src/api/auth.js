import client from './client'

export const login = async (username, password) => {
  const response = await client.post('/core/auth/login/', {
    username,
    password,
  })
  return response.data
}

export const logout = async () => {
  const response = await client.post('/core/auth/logout/')
  return response.data
}

export const getCurrentUser = async () => {
  const response = await client.get('/core/auth/current-user/')
  return response.data
}

