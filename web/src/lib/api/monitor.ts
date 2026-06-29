import { http } from '@/lib/http'
import type { CacheStat, OnlineUser, ServerStat } from '@/lib/api/types'

export const monitorApi = {
  online: () => http.get<OnlineUser[]>('/online'),
  kick: (token: string) => http.delete<null>(`/online/${token}`),
  server: () => http.get<ServerStat>('/monitor/server'),
  cache: () => http.get<CacheStat>('/monitor/cache'),
}
