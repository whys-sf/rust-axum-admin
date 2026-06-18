import axios from 'axios'
import { ElMessage } from 'element-plus'
import router from '@/router'
import { clearToken, getToken } from '@/utils/auth'

// Snowflake ids exceed JS Number.MAX_SAFE_INTEGER, so the backend serializes
// every id as a JSON string. They stay exact through plain JSON.parse, so the
// frontend just treats ids as opaque strings — no BigInt handling required.
//
// All backend endpoints live under /api/v1; the dev server proxies this to the
// Axum app (see vite.config.js).
const http = axios.create({
  baseURL: '/api/v1',
  timeout: 15000,
})

http.interceptors.request.use((config) => {
  const token = getToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

http.interceptors.response.use(
  (resp) => {
    const body = resp.data
    // unified envelope: { code, message, data }
    if (body && typeof body === 'object' && 'code' in body) {
      if (body.code === 0 || body.code === 200) {
        return body.data
      }
      ElMessage.error(body.message || '请求失败')
      return Promise.reject(new Error(body.message || 'request failed'))
    }
    return body
  },
  (error) => {
    const status = error.response?.status
    if (status === 401) {
      clearToken()
      if (router.currentRoute.value.name !== 'login') {
        router.replace({ name: 'login' })
      }
      ElMessage.error('登录已失效，请重新登录')
    } else {
      const msg = error.response?.data?.message || error.message || '网络错误'
      ElMessage.error(msg)
    }
    return Promise.reject(error)
  },
)

export default http
