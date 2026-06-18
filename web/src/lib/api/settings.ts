import { http } from '@/lib/http'
import type { AppSettings } from '@/lib/api/types'

export const settingsApi = {
  /** Public site settings (no auth required) — used by the login page. */
  public: () => http.get<AppSettings>('/public/settings'),
  get: () => http.get<AppSettings>('/settings'),
  update: (payload: Partial<AppSettings>) =>
    http.put<AppSettings>('/settings', payload),
}
