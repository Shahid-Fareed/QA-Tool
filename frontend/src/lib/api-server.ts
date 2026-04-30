import { cookies } from 'next/headers';
import { SESSION_COOKIE, type SessionUser } from '@/lib/rbac';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

/**
 * Make an authenticated server-side fetch to the Express backend,
 * forwarding the session cookie automatically.
 */
export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(SESSION_COOKIE)?.value;

  const url = `${API_URL}${path}`;
  console.log(`[apiFetch] ${options.method || 'GET'} ${url} - Cookie present: ${!!raw}`);

  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(raw ? { Cookie: `${SESSION_COOKIE}=${raw}` } : {}),
      ...(options.headers || {}),
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    console.error(`[apiFetch] Failed: ${res.status} ${res.statusText} for ${url}`);
  }

  return res;
}

/**
 * Get the current session from the cookie (local read, no network).
 */
export async function getLocalSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SessionUser;
  } catch {
    try {
      return JSON.parse(decodeURIComponent(raw)) as SessionUser;
    } catch {
      return null;
    }
  }
}
