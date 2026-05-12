/**
 * Helper to fetch from the Express backend in Client Components.
 */
export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export async function apiClientFetch(path: string, options: RequestInit = {}) {
  const isFormData = options.body instanceof FormData;

  // Create clean headers object
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> || {}),
  };

  if (!isFormData && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  // Clean URL to prevent potential double-slash or white-space connectivity issues
  const baseUrl = API_URL.replace(/\/+$/, '').trim();
  const cleanPath = path.trim().startsWith('/') ? path.trim() : `/${path.trim()}`;
  const fullUrl = `${baseUrl}${cleanPath}`;

  try {
    const response = await fetch(fullUrl, {
      ...options,
      credentials: 'include',
      headers,
    });

    return response;
  } catch (error: any) {
    // Skip logging abort errors, which are intentional cancellations
    if (error.name !== 'AbortError') {
      console.error(`[apiClientFetch] Network failure calling: ${fullUrl}`, error);
    }
    throw error;
  }
}
