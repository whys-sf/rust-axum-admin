import { http } from '@/lib/http'
import type { OperationLog, PageResult } from '@/lib/api/types'

export interface LogQuery {
  page?: number
  page_size?: number
  username?: string
}

export const logApi = {
  list: (query: LogQuery) => http.get<PageResult<OperationLog>>('/logs', query),
}
