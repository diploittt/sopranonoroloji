// ═══════════════════════════════════════════════════════════════
// DEPRECATED — Re-exports from roomPermissions.ts for backwards compat.
// New code should import from '@/common/roomPermissions' directly.
// ═══════════════════════════════════════════════════════════════

export { ALL_PERMISSIONS } from './roomPermissions';

// Legacy re-export: `can()` helper
import { ALL_PERMISSIONS, getRoleLevel, isHigherRole } from './roomPermissions';
import { Role } from './roles';

export type Action = string;

export const PERMISSIONS = ALL_PERMISSIONS;

export const can = (userRole: string | undefined, action: string, targetRole?: string): boolean => {
    if (!userRole) return false;
    const perm = ALL_PERMISSIONS[action];
    if (!perm) return false;
    if (getRoleLevel(userRole) < perm.minLevel) return false;
    if (targetRole && perm.requiresTarget) {
        return isHigherRole(userRole, targetRole);
    }
    return true;
};
