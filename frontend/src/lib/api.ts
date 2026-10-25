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

export interface ApiFetchOptions {
  method?: string;
  body?: any;
  token?: string | null;
  headers?: Record<string, string>;
  timeoutMs?: number;
  retries?: number;
}

export interface SystemSettings {
  isCompetitionFrozen: boolean;
  freezeReason?: string;
  frozenAt?: string;
  frozenByEmail?: string;
}

export async function apiFetch<T = any>(
  endpoint: string,
  options: ApiFetchOptions = {}
): Promise<T> {
  const method = (options.method || 'GET').toUpperCase();
  const token = options.token !== undefined ? options.token : getAuthToken();
  const timeoutMs = options.timeoutMs ?? (method === 'GET' ? 10000 : 15000);

  // Safe retry policy: only GET requests are retried automatically.
  // Mutations (POST, PUT, PATCH, DELETE) are NEVER blindly retried.
  const maxRetries = options.retries !== undefined ? options.retries : (method === 'GET' ? 2 : 0);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  let attempt = 0;
  while (true) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(url, {
        method,
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const contentType = res.headers.get('content-type');
      let data: any = null;

      if (contentType && contentType.includes('application/json')) {
        data = await res.json();
      } else {
        data = await res.text();
      }

      if (!res.ok) {
        // If 503 or 504 on a GET request and retries remain, retry with backoff
        if (method === 'GET' && (res.status === 503 || res.status === 504) && attempt < maxRetries) {
          attempt++;
          await new Promise((resolve) => setTimeout(resolve, attempt * 600));
          continue;
        }

        const errorMsg = data?.error || data?.message || `HTTP ${res.status}: ${res.statusText}`;
        const error = new Error(errorMsg) as any;
        error.status = res.status;
        error.code = data?.code;
        error.details = data;
        throw error;
      }

      return data as T;
    } catch (err: any) {
      clearTimeout(timeoutId);

      const isAbort = err.name === 'AbortError' || controller.signal.aborted;
      const isNetworkError = isAbort || err instanceof TypeError || err.message?.includes('fetch');

      // Retry GET requests on network failures
      if (method === 'GET' && isNetworkError && attempt < maxRetries) {
        attempt++;
        await new Promise((resolve) => setTimeout(resolve, attempt * 800));
        continue;
      }

      // Enhance error with clean diagnostic codes
      if (isAbort) {
        const timeoutError = new Error(`Request to ${endpoint} timed out after ${timeoutMs}ms.`) as any;
        timeoutError.status = 408;
        timeoutError.code = 'NETWORK_TIMEOUT';
        throw timeoutError;
      }

      if (err instanceof TypeError || err.message?.includes('fetch')) {
        const netError = new Error(`Unable to connect to server at ${API_BASE_URL}. Check network connection.`) as any;
        netError.status = 0;
        netError.code = 'NETWORK_ERROR';
        throw netError;
      }

      throw err;
    }
  }
}

export async function getFreezeStatus(): Promise<SystemSettings> {
  return apiFetch<SystemSettings>('/freeze-status', { retries: 2 });
}

export async function setCompetitionFreeze(isFrozen: boolean, reason?: string): Promise<{ message: string; settings: SystemSettings }> {
  return apiFetch('/admin/freeze', {
    method: 'POST',
    body: { isFrozen, reason }
  });
}

export { API_BASE_URL };
