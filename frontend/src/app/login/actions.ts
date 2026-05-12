'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { SESSION_COOKIE, type SessionUser } from '@/lib/rbac';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

// ─────────────────────────────────────────────────────────────
// Login Action
// ─────────────────────────────────────────────────────────────

export interface LoginState {
  error?: string;
  success?: boolean;
}

export async function loginAction(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = (formData.get('email') as string | null)?.trim().toLowerCase() ?? '';
  const password = (formData.get('password') as string | null)?.trim() ?? '';

  if (!email || !password) {
    return { error: 'Email and password are required.' };
  }

  try {
    const res = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
      cache: 'no-store',
    });

    const data = await res.json();

    if (!res.ok) {
      return { error: data.error || 'Access Denied — invalid credentials.' };
    }

    // Set the cookie directly using the user object returned from Express
    const cookieStore = await cookies();
    
    // Use .soulservices.com in production so both webqa and backendwebqa can read it
    const isProd = process.env.NODE_ENV === 'production';
    
    cookieStore.set(SESSION_COOKIE, JSON.stringify(data.user), {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      domain: isProd ? '.soulservices.com' : undefined,
      path: '/',
      maxAge: 60 * 60 * 8, // 8 hours
    });

    redirect('/');
  } catch (err) {
    if (err instanceof Error && err.message === 'NEXT_REDIRECT') throw err;
    console.error(err);
    return { error: 'Identity service unavailable. Please contact your administrator.' };
  }
}

// ─────────────────────────────────────────────────────────────
// Logout Action
// ─────────────────────────────────────────────────────────────

export async function logoutAction(): Promise<void> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(SESSION_COOKIE)?.value;

  // Tell Express to clear its cookie
  try {
    await fetch(`${API_URL}/api/auth/logout`, {
      method: 'POST',
      headers: raw ? { Cookie: `${SESSION_COOKIE}=${raw}` } : {},
      cache: 'no-store',
    });
  } catch { /* non-fatal */ }

  // Clear from Next.js too
  cookieStore.delete(SESSION_COOKIE);
  redirect('/login');
}

// ─────────────────────────────────────────────────────────────
// Session Reader (server-side utility)
// ─────────────────────────────────────────────────────────────

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(SESSION_COOKIE)?.value;
  if (!raw) return null;

  try {
    // Forward the cookie to Express which re-fetches fresh permissions from DB
    const res = await fetch(`${API_URL}/api/auth/me`, {
      headers: { Cookie: `${SESSION_COOKIE}=${raw}` },
      cache: 'no-store',
    });

    if (!res.ok) return null;
    return await res.json() as SessionUser;
  } catch {
    return null;
  }
}
