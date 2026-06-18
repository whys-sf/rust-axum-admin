import http from './http'

export function login(payload) {
  // payload: { tenant_code, username, password }
  return http.post('/auth/login', payload)
}

export function userinfo() {
  return http.get('/auth/userinfo')
}

export function logout() {
  return http.post('/auth/logout')
}
