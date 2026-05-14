'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { SESSION_COOKIE, hasPermission, type SessionUser } from '@/lib/rbac';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

async function getAuthHeaders(): Promise<HeadersInit> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(SESSION_COOKIE)?.value;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (raw) headers['Cookie'] = `${SESSION_COOKIE}=${raw}`;
  return headers;
}

async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  try { return JSON.parse(raw) as SessionUser; } catch { return null; }
}

export interface RoleTemplate {
  _id: string;
  name: string;
  description: string;
  permissions: string[];
  createdAt: string;
  updatedAt: string;
}

export async function fetchRoleTemplates(): Promise<{ success: boolean; templates?: RoleTemplate[]; error?: string }> {
  const session = await getSession();
  if (!session || !hasPermission(session.role, 'read:users', session.customPermissions)) {
    return { success: false, error: 'Forbidden' };
  }
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_URL}/api/role-templates`, { headers, cache: 'no-store' });
    if (!res.ok) return { success: false, error: 'Failed to fetch templates' };
    const templates = await res.json();
    return { success: true, templates };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function createRoleTemplate(data: { name: string; description: string; permissions: string[] }) {
  const session = await getSession();
  if (!session || !hasPermission(session.role, 'write:users', session.customPermissions)) {
    return { success: false, error: 'Forbidden — insufficient permissions.' };
  }
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_URL}/api/role-templates`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
      cache: 'no-store',
    });
    const resData = await res.json();
    if (!res.ok) return { success: false, error: resData.error || 'Failed to create template.' };
    revalidatePath('/settings/roles');
    return { success: true, template: resData };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function updateRoleTemplate(id: string, data: { name?: string; description?: string; permissions?: string[] }) {
  const session = await getSession();
  if (!session || !hasPermission(session.role, 'edit:users', session.customPermissions)) {
    return { success: false, error: 'Forbidden — insufficient permissions.' };
  }
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_URL}/api/role-templates/${id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(data),
      cache: 'no-store',
    });
    const resData = await res.json();
    if (!res.ok) return { success: false, error: resData.error || 'Failed to update template.' };
    revalidatePath('/settings/roles');
    return { success: true, template: resData };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deleteRoleTemplate(id: string) {
  const session = await getSession();
  if (!session || !hasPermission(session.role, 'delete:users', session.customPermissions)) {
    return { success: false, error: 'Forbidden — insufficient permissions.' };
  }
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_URL}/api/role-templates/${id}`, {
      method: 'DELETE',
      headers,
      cache: 'no-store',
    });
    if (!res.ok) {
      const data = await res.json();
      return { success: false, error: data.error || 'Failed to delete template.' };
    }
    revalidatePath('/settings/roles');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
