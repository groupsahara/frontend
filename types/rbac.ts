// Shared RBAC types — mirror the backend response shapes.

export interface Permission {
  id: string;
  module: string;
  action: string;
}

// Item shape returned by GET /permissions/grouped
export interface GroupedPermissionItem {
  id: string;
  action: string;
}

// GET /permissions/grouped → { [module]: GroupedPermissionItem[] }
export type GroupedPermissions = Record<string, GroupedPermissionItem[]>;

export interface RolePermission {
  roleId: string;
  permissionId: string;
  permission: Permission;
}

export interface Role {
  id: string;
  name: string;
  description: string | null;
  tenantId: string | null;
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
  permissions?: RolePermission[];
  _count?: { users: number };
  // present on GET /roles/:id
  users?: { userId: string; roleId: string; user: { id: string; email: string } }[];
}

export interface UserRoleRef {
  userId: string;
  roleId: string;
  role: { id: string; name: string; description: string | null };
}

export interface ManagedUser {
  id: string;
  name?: string | null;
  email: string;
  phoneNumber?: string | null;
  isPasswordSet: boolean;
  tenantId: string | null;
  createdAt: string;
  updatedAt: string;
  roles: UserRoleRef[];
}
