import { http } from '@/lib/http'
import type { Job, JobLog, PageResult } from '@/lib/api/types'

export interface JobQuery {
  page?: number
  page_size?: number
  name?: string
  status?: number
}

export interface CreateJobPayload {
  name: string
  job_group?: string
  invoke_target: string
  cron_expr: string
  status?: number
  remark?: string | null
}

export type UpdateJobPayload = Partial<CreateJobPayload>

export interface JobLogQuery {
  page?: number
  page_size?: number
  job_id?: string
  status?: number
}

export const jobApi = {
  list: (query: JobQuery) => http.get<PageResult<Job>>('/jobs', query),
  create: (payload: CreateJobPayload) => http.post<Job>('/jobs', payload),
  update: (id: string, payload: UpdateJobPayload) =>
    http.put<Job>(`/jobs/${id}`, payload),
  remove: (id: string) => http.delete<null>(`/jobs/${id}`),
  setStatus: (id: string, status: number) =>
    http.put<Job>(`/jobs/${id}/status`, { status }),
  run: (id: string) => http.post<JobLog>(`/jobs/${id}/run`, {}),
  logs: (query: JobLogQuery) => http.get<PageResult<JobLog>>('/job-logs', query),
}
