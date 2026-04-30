// ── Role-Based Access Control ──────────────────────────────────────

const ALL_RESOURCES = [
  "projects",
  "use_cases",
  "test_cases",
  "bugs",
  "users",
  "generate",
  "test_runs",
  "visual_report",
  "qa_assistant",
  "code_evaluation",
];
const BUSINESS_RESOURCES = ["projects", "use_cases", "test_cases", "bugs"];
const GENERATE_RESOURCE = [
  "generate",
  "visual_report",
  "qa_assistant",
  "code_evaluation",
];
const TEST_RUNS_RESOURCE = ["test_runs"];

function generatePerms(actions, resources) {
  const perms = [];
  actions.forEach((a) => {
    resources.forEach((r) => {
      perms.push(`${a}:${r}`);
    });
  });
  return perms;
}

const ROLE_PERMISSIONS = {
  company_admin: generatePerms(
    ["read", "write", "edit", "delete"],
    ALL_RESOURCES,
  ),
  team_lead: [
    ...generatePerms(["read", "write", "edit"], BUSINESS_RESOURCES),
    ...generatePerms(["read", "write"], GENERATE_RESOURCE),
    ...generatePerms(["read", "write", "edit"], TEST_RUNS_RESOURCE),
  ],
  manager: [
    ...generatePerms(["read", "write", "edit"], BUSINESS_RESOURCES),
    ...generatePerms(["read", "write"], GENERATE_RESOURCE),
    ...generatePerms(["read", "write", "edit"], TEST_RUNS_RESOURCE),
  ],
  hr: [...generatePerms(["read"], ALL_RESOURCES), "edit:users"],
  employee: [
    ...generatePerms(["read"], BUSINESS_RESOURCES),
    "read:test_runs",
    "edit:test_runs",
    "read:qa_assistant",
  ],
};

function hasPermission(role, requiredPermission, customPermissions) {
  const required = Array.isArray(requiredPermission)
    ? requiredPermission
    : [requiredPermission];

  // 1. If custom permissions exist, they override the defaults completely.
  if (customPermissions && customPermissions.length > 0) {
    return required.some((p) => customPermissions.includes(p));
  }

  // 2. Otherwise, fall back to the default permissions for the user's role.
  const defaultPerms = ROLE_PERMISSIONS[role] || [];
  return required.some((p) => defaultPerms.includes(p));
}

function getRoleLabel(role) {
  const labels = {
    company_admin: "Company Admin",
    team_lead: "Team Lead",
    manager: "Manager",
    hr: "HR",
    employee: "Employee",
  };
  return labels[role] ?? role;
}

const SESSION_COOKIE = "qa_session";

module.exports = {
  ROLE_PERMISSIONS,
  hasPermission,
  getRoleLabel,
  SESSION_COOKIE,
};
