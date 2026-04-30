"use client";

import { useState, useEffect } from "react";
import { apiClientFetch } from "@/lib/api-client";
import { Role, Permission } from "@/lib/rbac";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  customPermissions: Permission[];
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchMe() {
      try {
        const res = await apiClientFetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          setUser(data);
        } else {
          setError("Failed to fetch session");
        }
      } catch (err) {
        setError("Network error");
      } finally {
        setIsLoading(false);
      }
    }

    fetchMe();
  }, []);

  return { user, isLoading, error };
}
