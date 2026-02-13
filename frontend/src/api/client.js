import axios from 'axios'

const client = axios.create({
  baseURL: '/api',   // ⭐ هذا هو المهم
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
})

export default client
