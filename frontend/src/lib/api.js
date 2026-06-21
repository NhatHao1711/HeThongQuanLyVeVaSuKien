const API_BASE = 'http://localhost:8080/api';

export async function apiRequest(endpoint, options = {}) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    cache: 'no-store',
    ...options,
  };

  try {
    const res = await fetch(`${API_BASE}${endpoint}`, config);

    // Auto-logout on 401/403 (expired/invalid token)
    if (res.status === 401 || res.status === 403) {
      // Only auto-logout if user had a token (was logged in)
      if (token) {
        console.warn('Token expired or invalid. Logging out...');
        removeToken();
        // Only redirect if in browser and not already on login page
        if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
      }
      return { success: false, message: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.' };
    }

    const data = await res.json();
    return data;
  } catch (err) {
    console.error('API request failed:', err);
    return { success: false, message: 'Không thể kết nối đến server' };
  }
}

export function setToken(token) {
  localStorage.setItem('token', token);
}

export function getToken() {
  return typeof window !== 'undefined' ? localStorage.getItem('token') : null;
}

export function removeToken() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
}

export function setUser(user) {
  localStorage.setItem('user', JSON.stringify(user));
}

export function getUser() {
  if (typeof window === 'undefined') return null;
  const user = localStorage.getItem('user');
  return user ? JSON.parse(user) : null;
}

export function isLoggedIn() {
  return !!getToken();
}
