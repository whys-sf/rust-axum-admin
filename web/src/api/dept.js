import http from './http'

// Returns a forest of department nodes: each node carries the flattened dept
// fields plus a `children` array.
export function listDepts() {
  return http.get('/depts')
}

export function createDept(payload) {
  return http.post('/depts', payload)
}

export function updateDept(id, payload) {
  return http.put(`/depts/${id}`, payload)
}

export function deleteDept(id) {
  return http.delete(`/depts/${id}`)
}
