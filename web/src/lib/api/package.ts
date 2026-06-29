import { http } from '@/lib/http'
import type { Feature, Package } from '@/lib/api/types'

export interface CreatePackagePayload {
  code: string
  name: string
  description?: string | null
  status?: number
  sort?: number
  default_user_limit?: number
  feature_codes: string[]
}

export interface UpdatePackagePayload {
  name?: string
  description?: string | null
  status?: number
  sort?: number
  default_user_limit?: number
  feature_codes?: string[]
}

export const packageApi = {
  features: () => http.get<Feature[]>('/platform/features'),
  list: () => http.get<Package[]>('/platform/packages'),
  create: (payload: CreatePackagePayload) =>
    http.post<Package>('/platform/packages', payload),
  update: (id: string, payload: UpdatePackagePayload) =>
    http.put<Package>(`/platform/packages/${id}`, payload),
  remove: (id: string) => http.delete<null>(`/platform/packages/${id}`),
}
