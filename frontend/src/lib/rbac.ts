
// Based Access Control Core

export type Role = 'company_admin' | 'team_lead' | 'manager' | 'hr' | 'employee';
export type Action = 'read' | 'write' | 'edit' | 'delete';
export type Resource = 'projects' | 'use_cases' | 'test_cases' | 'bugs' | 'users' | 'generate' | 'test_runs' | 'visual_report' | 'qa_assistant' | 'code_evaluation';
export type Permission = `${Action}:${Resource}`;

export interface User {
  id: string;
  email: string;
  password: string;
  name: string;
  role: Role;
}

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  customPermissions?: Permission[];
}

const ALL_RESOURCES: Resource[] = ['projects', 'use_cases', 'test_cases', 'bugs', 'users', 'generate', 'test_runs', 'visual_report', 'qa_assistant', 'code_evaluation'];
const BUSINESS_RESOURCES: Resource[] = ['projects', 'use_cases', 'test_cases', 'bugs'];
const GENERATE_RESOURCE: Resource[] = ['generate', 'visual_report', 'qa_assistant', 'code_evaluation'];
const TEST_RUNS_RESOURCE: Resource[] = ['test_runs'];

const generatePerms = (actions: Action[], resources: Resource[]): Permission[] => {
  const perms: Permission[] = [];
  actions.forEach(a => {
    resources.forEach(r => {
      perms.push(`${a}:${r}` as Permission);
    });
  });
  return perms;
};

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  company_admin: generatePerms(['read', 'write', 'edit', 'delete'], ALL_RESOURCES),
  team_lead: [
    ...generatePerms(['read', 'write', 'edit'], BUSINESS_RESOURCES),
    ...generatePerms(['read', 'write'], GENERATE_RESOURCE),
    ...generatePerms(['read', 'write', 'edit'], TEST_RUNS_RESOURCE),
  ],
  manager: [
    ...generatePerms(['read', 'write', 'edit'], BUSINESS_RESOURCES),
    ...generatePerms(['read', 'write'], GENERATE_RESOURCE),
    ...generatePerms(['read', 'write', 'edit'], TEST_RUNS_RESOURCE),
  ],
  hr: [
    ...generatePerms(['read'], ALL_RESOURCES),
    'edit:users',
  ],
  employee: [
    ...generatePerms(['read'], BUSINESS_RESOURCES),
    'read:test_runs',
    'edit:test_runs',
    'read:qa_assistant',
  ],
};

export function hasPermission(
  role: Role,
  requiredPermission: Permission | Permission[],
  customPermissions?: Permission[]
): boolean {
  const required = Array.isArray(requiredPermission) ? requiredPermission : [requiredPermission];

  // 1. If custom permissions exist, they override the defaults completely.
  if (customPermissions && customPermissions.length > 0) {
    return required.some(p => customPermissions.includes(p));
  }

  // 2. Otherwise, fall back to the default permissions for the user's role.
  const defaultPerms = ROLE_PERMISSIONS[role] || [];
  return required.some(p => defaultPerms.includes(p));
}

export function getRoleLabel(role: Role): string {
  const labels: Record<Role, string> = {
    company_admin: 'Admin',
    team_lead: 'Team Lead',
    manager: 'Manager',
    hr: 'HR',
    employee: 'Employee',
  };
  return labels[role] ?? role;
}

export const SESSION_COOKIE = 'qa_session';
