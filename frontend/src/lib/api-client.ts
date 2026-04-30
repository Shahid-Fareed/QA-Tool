/**
 * Helper to fetch from the Express backend in Client Components.
 */
export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export async function apiClientFetch(path: string, options: RequestInit = {}) {
  const isFormData = options.body instanceof FormData;

  const headers: HeadersInit = {
    ...(options.headers || {}),
  };

  if (!isFormData && !headers['Content-Type' as keyof typeof headers]) {
    (headers as Record<string, string>)['Content-Type'] = 'application/json';
  }

  return fetch(`${API_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers,
  });
}
