// ═══════════════════════════════════════════════════════════════
// DEPRECATED — Re-exports from roomPermissions.ts for backwards compat.
// New code should import from '@/common/roomPermissions' directly.
// ═══════════════════════════════════════════════════════════════

export {
    ROLE_HIERARCHY,
    ROLE_LABELS,
    getRoleLevel,
    isHigherRole,
} from './roomPermissions';

// Legacy enum kept for any code that references Role.Owner etc.
export enum Role {
    GodMaster = 'godmaster',
    Owner = 'owner',
    SuperAdmin = 'superadmin',
    Admin = 'admin',
    Moderator = 'moderator',
    Operator = 'operator',
    Dj = 'dj',
    Vip = 'vip',
    Member = 'member',
    Guest = 'guest',
}

export const hasRole = (userRole: string | undefined, minRole: Role): boolean => {
    const { getRoleLevel: getLevel } = require('./roomPermissions');
    return getLevel(userRole) >= getLevel(minRole);
};

export const canSeeStealthUser = (viewerRole: string | undefined, targetRole: string | undefined): boolean => {
    if (!viewerRole) return false;
    const { getRoleLevel: getLevel, isHigherRole: isHigher } = require('./roomPermissions');
    // GodMaster can see everyone
    if (viewerRole.toLowerCase() === 'godmaster') return true;
    if (viewerRole.toLowerCase() === 'owner') return true;
    return isHigher(viewerRole, targetRole);
};

export const roleHierarchy = {} as Record<string, number>;
