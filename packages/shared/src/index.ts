// @soprano/shared — Barrel export
export {
  // Types
  type Role,
  type PermissionDef,
  type RoomMenuItem,

  // Constants
  ROLE_HIERARCHY,
  ROLE_LABELS,
  ROLE_ICONS,
  ROLE_COLORS,
  ALL_PERMISSIONS,

  // Functions
  getRoleLevel,
  isHigherRole,
  getRoleLabel,
  getRoleIcon,
  getRoleColor,
  getMenuForUser,
  sortUsersByRole,
  canPerformAction,
} from './roles';
