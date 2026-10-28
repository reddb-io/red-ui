export interface PermissionResource {
  kind: string;
  name: string;
  tenant?: string;
}

export interface PermissionCheck {
  action: string;
  resource: PermissionResource;
  current_tenant?: string;
}

export interface PermissionDecision extends PermissionCheck {
  allowed: boolean;
  reason?: string;
}
