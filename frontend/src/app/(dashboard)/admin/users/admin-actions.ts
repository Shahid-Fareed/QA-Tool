'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { Role, Permission, SESSION_COOKIE, hasPermission, type SessionUser } from '@/lib/rbac';

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

export async function updateUserRoleAndPermissions(
  userId: string,
  role: Role,
  customPermissions: Permission[]
) {
  const session = await getSession();
  if (!session || !hasPermission(session.role, 'edit:users', session.customPermissions)) {
    return { success: false, error: 'Forbidden — insufficient permissions to edit users.' };
  }

  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_URL}/api/users/${userId}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ role, customPermissions }),
      cache: 'no-store',
    });

    if (!res.ok) {
      const data = await res.json();
      return { success: false, error: data.error || 'Failed to update user.' };
    }

    revalidatePath('/admin/users');
    return { success: true };
  } catch (error: any) {
    console.error('Error updating user:', error);
    return { success: false, error: error.message };
  }
}

function generateRandomPassword(length = 14): string {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()-_=+[]{}|;:,.<>?";
  let password = "";
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

export async function createUser(data: {
  name: string;
  email: string;
  password?: string;
  role: Role;
  customPermissions: Permission[];
  employeeId?: string;
}) {
  const session = await getSession();
  if (!session || !hasPermission(session.role, 'write:users', session.customPermissions)) {
    return { success: false, error: 'Forbidden — insufficient permissions to create users.' };
  }

  const finalPassword = data.password || generateRandomPassword();

  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_URL}/api/users`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ ...data, password: finalPassword }),
      cache: 'no-store',
    });

    if (!res.ok) {
      const errorData = await res.json();
      return { success: false, error: errorData.error || 'Failed to create user.' };
    }

    revalidatePath('/admin/users');
    return { success: true, password: finalPassword };
  } catch (error: any) {
    console.error('Error creating user:', error);
    return { success: false, error: error.message };
  }
}

export async function getUserById(userId: string) {
  const session = await getSession();
  if (!session || !hasPermission(session.role, 'read:users', session.customPermissions)) {
    return { success: false, error: 'Forbidden' };
  }

  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_URL}/api/users`, { headers, cache: 'no-store' });
    if (!res.ok) return { success: false, error: 'Failed to fetch users' };

    const users = await res.json();
    const user = users.find((u: any) => u._id === userId);
    if (!user) return { success: false, error: 'User not found' };

    return { success: true, user };
  } catch (error) {
    return { success: false, error: 'Service unavailable' };
  }
}

export async function deleteUser(userId: string) {
  const session = await getSession();
  if (!session || !hasPermission(session.role, 'delete:users', session.customPermissions)) {
    return { success: false, error: 'Forbidden — insufficient permissions to delete users.' };
  }

  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_URL}/api/users/${userId}`, {
      method: 'DELETE',
      headers,
      cache: 'no-store',
    });

    if (!res.ok) {
      const data = await res.json();
      return { success: false, error: data.error || 'Failed to delete user.' };
    }

    revalidatePath('/admin/users');
    return { success: true };
  } catch (error: any) {
    console.error('Error deleting user:', error);
    return { success: false, error: error.message };
  }
}
