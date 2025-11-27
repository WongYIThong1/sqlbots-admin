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
 * Get CSRF token from localStorage
 */
export function getCSRFToken(): string | null {
  if (typeof window === 'undefined') {
    return null
  }
  return localStorage.getItem('csrf_token')
}

/**
 * Set CSRF token in localStorage
 */
export function setCSRFToken(token: string): void {
  if (typeof window === 'undefined') {
    return
  }
  localStorage.setItem('csrf_token', token)
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
  localStorage.removeItem('csrf_token')
}

/**
 * Fetch CSRF token from server
 */
export async function fetchCSRFToken(): Promise<string | null> {
  try {
    const response = await fetch('/api/csrf', {
      headers: getAuthHeaders(),
    })
    
    if (!response.ok) {
      return null
    }
    
    const data = await response.json()
    if (data.success && data.csrfToken) {
      setCSRFToken(data.csrfToken)
      return data.csrfToken
    }
    return null
  } catch (error) {
    console.error('Error fetching CSRF token:', error)
    return null
  }
}

/**
 * Create authenticated fetch headers with CSRF token
 */
export function getAuthHeaders(includeCSRF: boolean = true): HeadersInit {
  const token = getAdminToken()
  const csrfToken = includeCSRF ? getCSRFToken() : null
  
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...(csrfToken && { 'X-CSRF-Token': csrfToken }),
  }
}

