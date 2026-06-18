import axios from 'axios'
import JSONbig from 'json-bigint'
import { ElMessage } from 'element-plus'
import router from '@/router'
import { clearToken, getToken } from '@/utils/auth'

// Snowflake BIGINT ids overflow JS Number.MAX_SAFE_INTEGER, so plain JSON.parse
// silently corrupts them. Parse responses keeping oversized integers as strings
// (small numbers stay numbers), and serialize requests so that BigInt values are
// emitted as exact unquoted numbers the backend's i64 fields accept.
const jsonBig = JSONbig({ storeAsString: true, useNativeBigInt: true })

// All backend endpoints live under /api/v1; the dev server proxies this to the
// Axum app (see vite.config.js).
const http = axios.create({
  baseURL: '/api/v1',
  timeout: 15000,
  transformResponse: [
    (data) => {
      if (typeof data !== 'string' || data.length === 0) {
        return data
      }
      try {
        return jsonBig.parse(data)
      } catch {
        return data
      }
    },
  ],
  transformRequest: [
    (data, headers) => {
      if (data && typeof data === 'object' && !(data instanceof FormData)) {
        headers['Content-Type'] = 'application/json'
        return jsonBig.stringify(data)
      }
      return data
    },
  ],
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
