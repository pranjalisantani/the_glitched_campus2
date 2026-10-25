const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('glitched_auth_token');
}

export function setAuthToken(token: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('glitched_auth_token', token);
  }
}

export function clearAuthToken(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('glitched_auth_token');
  }
}

export async function apiFetch<T = any>(
  endpoint: string,
  options: {
    method?: string;
    body?: any;
    token?: string | null;
    headers?: Record<string, string>;
  } = {}
): Promise<T> {
  const token = options.token !== undefined ? options.token : getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const res = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  const contentType = res.headers.get('content-type');
  let data: any = null;

  if (contentType && contentType.includes('application/json')) {
    data = await res.json();
  } else {
    data = await res.text();
  }

  if (!res.ok) {
    const errorMsg = data?.error || data?.message || `HTTP ${res.status}: ${res.statusText}`;
    const error = new Error(errorMsg) as any;
    error.status = res.status;
    error.code = data?.code;
    error.details = data;
    throw error;
  }

  return data as T;
}

export { API_BASE_URL };
