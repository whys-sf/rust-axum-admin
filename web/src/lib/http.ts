import axios, { type AxiosRequestConfig } from 'axios'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth'

/** Uniform backend envelope: `{ code, message, data }` (code 0 == success). */
export interface ApiEnvelope<T> {
  code: number
  message: string
  data: T | null
}

const instance = axios.create({ baseURL: '/api/v1', timeout: 15000 })

instance.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token) config.headers.Authorization = `Bearer ${token}`
  const tenantId = useAuthStore.getState().actingTenantId
  if (tenantId) config.headers['X-Tenant-Id'] = tenantId
  return config
})

instance.interceptors.response.use(
  (resp) => resp,
  (error) => {
    const status = error.response?.status
    const message =
      error.response?.data?.message ?? error.message ?? '请求失败，请稍后再试'
    if (status === 401) {
      useAuthStore.getState().clear()
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    } else {
      toast.error(message)
    }
    return Promise.reject(error)
  },
)

/** Issue a request and unwrap the `data` field of the envelope. */
async function request<T>(config: AxiosRequestConfig): Promise<T> {
  const resp = await instance.request<ApiEnvelope<T>>(config)
  return resp.data.data as T
}

/** Raw axios instance (auth + tenant headers attached). Use for non-JSON
 *  responses such as binary downloads. */
export const httpClient = instance

export const http = {
  get: <T>(url: string, params?: object) =>
    request<T>({ method: 'get', url, params }),
  post: <T>(url: string, data?: unknown) =>
    request<T>({ method: 'post', url, data }),
  put: <T>(url: string, data?: unknown) =>
    request<T>({ method: 'put', url, data }),
  delete: <T>(url: string) => request<T>({ method: 'delete', url }),
}
