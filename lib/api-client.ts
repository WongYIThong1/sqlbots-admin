/**
 * Get the admin token from localStorage
 */
export function getAdminToken(): string | null {
  if (typeof window === 'undefined') {
    return null
  }
  return localStorage.getItem('admin_token')
}

/**
 * Get admin data from localStorage
 */
export function getAdminData(): any | null {
  if (typeof window === 'undefined') {
    return null
  }
  const adminData = localStorage.getItem('admin')
  if (!adminData) {
    return null
  }
  try {
    return JSON.parse(adminData)
  } catch {
    return null
  }
}

/**
 * Clear admin authentication data
 */
export function clearAdminData(): void {
  if (typeof window === 'undefined') {
    return
  }
  localStorage.removeItem('admin_token')
  localStorage.removeItem('admin')
}

/**
 * Create authenticated fetch headers
 */
export function getAuthHeaders(): HeadersInit {
  const token = getAdminToken()
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  }
}

