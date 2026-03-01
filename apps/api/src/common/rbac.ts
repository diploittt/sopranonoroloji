// ═══════════════════════════════════════════════════════════════
//  Backend RBAC Engine — mirrors frontend rbac.ts
//  Single source of truth for backend permission enforcement
// ═══════════════════════════════════════════════════════════════

// ─── Roles (alt → üst) ──────────────────────────────────────
export enum Role {
  Guest = 'guest',
  Member = 'member',
  Vip = 'vip',
  Operator = 'operator',
  Moderator = 'moderator',
  Admin = 'admin',
  SuperAdmin = 'superadmin',
  Owner = 'owner',
  GodMaster = 'godmaster',
}

export const roleHierarchy: Record<string, number> = {
  [Role.Guest]: 100,
  [Role.Member]: 200,
  [Role.Vip]: 400,
  [Role.Operator]: 500,
  [Role.Moderator]: 600,
  [Role.Admin]: 700,
  [Role.SuperAdmin]: 900,
  [Role.Owner]: 1000,
  [Role.GodMaster]: 1100,
};

// ─── Actions — same as frontend ─────────────────────────────
export type Action =
  // A) SELF / CLIENT ACTIONS
  | 'self.change_name'
  | 'self.mic_test'
  | 'self.sound_settings'
  | 'self.my_profile'
  | 'self.talk_test'
  | 'self.private_chat'
  | 'self.invite_one2one'
  | 'self.ignore'
  // B) ROOM INTERACTION
  | 'room.mic_free'
  | 'room.mic_take'
  | 'room.move_to_meeting'
  | 'room.conference'
  | 'room.clear_text_local'
  | 'room.clear_text_global'
  | 'room.freeze_chat_local'
  | 'room.freeze_chat_global'
  | 'room.copy'
  | 'room.select_all'
  // C) SOFT MODERATION
  | 'mod.mute'
  | 'mod.gag'
  | 'mod.clear_text'
  | 'mod.log_history'
  | 'mod.userinfo'
  | 'mod.make_room_op'
  // D) HARD MODERATION
  | 'mod.kick'
  | 'mod.hard_kick'
  | 'mod.exit_browser'
  | 'mod.cam_block'
  | 'mod.ban_1day'
  | 'mod.ban_1week'
  | 'mod.ban_1month'
  // E) ROOM / SYSTEM CONTROL
  | 'ctrl.admin_panel'
  | 'ctrl.users_global'
  | 'ctrl.rooms_list'
  | 'ctrl.room_spy'
  | 'ctrl.move_user_room'
  | 'ctrl.room_broadcast'
  // F) PLATFORM CONTROL
  | 'platform.all_settings'
  | 'platform.ban_gag_list'
  | 'platform.ip_ban'
  | 'platform.admin_login'
  | 'platform.forbidden_words'
  | 'platform.about';

// ─── PERMISSIONS MAP — Min role for each action ─────────────
export const PERMISSIONS: Record<Action, Role> = {
  // A) Self / Client
  'self.change_name': Role.Guest,
  'self.mic_test': Role.Guest,
  'self.sound_settings': Role.Guest,
  'self.my_profile': Role.Guest,
  'self.talk_test': Role.Member,
  'self.private_chat': Role.Guest,
  'self.invite_one2one': Role.Guest,
  'self.ignore': Role.Guest,
  // B) Room Interaction
  'room.mic_free': Role.Member,
  'room.mic_take': Role.Member,
  'room.move_to_meeting': Role.Member,
  'room.conference': Role.Vip,
  'room.clear_text_local': Role.Guest,
  'room.clear_text_global': Role.Operator,
  'room.freeze_chat_local': Role.Guest,
  'room.freeze_chat_global': Role.Moderator,
  'room.copy': Role.Guest,
  'room.select_all': Role.Guest,
  // C) Soft Moderation
  'mod.mute': Role.Operator,
  'mod.gag': Role.Operator,
  'mod.clear_text': Role.Operator,
  'mod.log_history': Role.Operator,
  'mod.userinfo': Role.Operator,
  'mod.make_room_op': Role.Moderator,
  // D) Hard Moderation
  'mod.kick': Role.Moderator,
  'mod.hard_kick': Role.Moderator,
  'mod.exit_browser': Role.Moderator,
  'mod.cam_block': Role.Moderator,
  'mod.ban_1day': Role.Moderator,
  'mod.ban_1week': Role.Moderator,
  'mod.ban_1month': Role.Admin,
  // E) Room / System Control
  'ctrl.admin_panel': Role.Admin,
  'ctrl.users_global': Role.Admin,
  'ctrl.rooms_list': Role.Admin,
  'ctrl.room_spy': Role.Admin,
  'ctrl.move_user_room': Role.Admin,
  'ctrl.room_broadcast': Role.Admin,
  // F) Platform Control
  'platform.all_settings': Role.SuperAdmin,
  'platform.ban_gag_list': Role.SuperAdmin,
  'platform.ip_ban': Role.SuperAdmin,
  'platform.admin_login': Role.SuperAdmin,
  'platform.forbidden_words': Role.SuperAdmin,
  'platform.about': Role.Admin,
};

// ─── Hierarchical actions (actor must be > target) ──────────
const HIERARCHICAL_ACTIONS: Action[] = [
  'mod.mute',
  'mod.gag',
  'mod.kick',
  'mod.hard_kick',
  'mod.exit_browser',
  'mod.cam_block',
  'mod.ban_1day',
  'mod.ban_1week',
  'mod.ban_1month',
  'mod.make_room_op',
  'mod.clear_text',
  'room.mic_take',
  'room.mic_free',
  'ctrl.move_user_room',
];

// ─── Utility Functions ──────────────────────────────────────

export const getRoleLevel = (role: string | undefined): number =>
  roleHierarchy[(role || '').toLowerCase()] ?? 0;

export const hasRole = (userRole: string | undefined, minRole: Role): boolean =>
  getRoleLevel(userRole) >= getRoleLevel(minRole);

export const isHigherRole = (
  actorRole: string | undefined,
  targetRole: string | undefined,
): boolean => getRoleLevel(actorRole) > getRoleLevel(targetRole);

/**
 * Unified permission check.
 */
export const can = (
  userRole: string | undefined,
  action: Action,
  targetRole?: string,
): boolean => {
  if (!userRole) return false;
  const r = userRole.toLowerCase();

  // 1. Basic role requirement
  const required = PERMISSIONS[action];
  if (!hasRole(r, required)) return false;

  // 2. Owner / GodMaster override
  if (r === Role.Owner || r === Role.GodMaster) return true;

  // 3. Hierarchical check
  if (targetRole && HIERARCHICAL_ACTIONS.includes(action)) {
    return isHigherRole(r, targetRole);
  }

  return true;
};

/**
 * Resolve effective permissions for a user.
 * Merges role-based defaults with per-user overrides from the DB JSON.
 */
export const resolvePermissions = (
  role: string,
  userPermissions?: Record<string, boolean> | null,
): Record<Action, boolean> => {
  const resolved: Partial<Record<Action, boolean>> = {};

  for (const [action, minRole] of Object.entries(PERMISSIONS)) {
    const a = action as Action;
    // Default: role-based
    resolved[a] = hasRole(role, minRole);

    // Override: per-user checkbox
    if (userPermissions && a in userPermissions) {
      resolved[a] = userPermissions[a];
    }
  }

  return resolved as Record<Action, boolean>;
};

/**
 * Check if user has a specific permission, considering per-user overrides.
 */
export const canWithOverrides = (
  userRole: string | undefined,
  action: Action,
  userPermissions?: Record<string, boolean> | null,
  targetRole?: string,
): boolean => {
  if (!userRole) return false;

  // Check per-user override first
  if (userPermissions && action in userPermissions) {
    if (!userPermissions[action]) return false; // Explicitly denied
    // Explicitly granted — still check hierarchy
  } else {
    // No override — check role
    if (!can(userRole, action, targetRole)) return false;
  }

  // Owner / GodMaster override
  if (userRole.toLowerCase() === Role.Owner || userRole.toLowerCase() === Role.GodMaster) return true;

  // Hierarchy check
  if (targetRole && HIERARCHICAL_ACTIONS.includes(action)) {
    return isHigherRole(userRole, targetRole);
  }

  return true;
};

// ─── Admin Tab Access ────────────────────────────────────────
export type AdminTab =
  | 'users'
  | 'rooms'
  | 'settings'
  | 'bans'
  | 'ipbans'
  | 'adminlogin'
  | 'words'
  | 'about'
  | 'logs';

export const ADMIN_TAB_ACCESS: Record<AdminTab, Role> = {
  users: Role.Admin,
  rooms: Role.Admin,
  about: Role.Admin,
  logs: Role.Admin,
  settings: Role.SuperAdmin,
  bans: Role.SuperAdmin,
  ipbans: Role.SuperAdmin,
  adminlogin: Role.SuperAdmin,
  words: Role.SuperAdmin,
};

export const canAccessTab = (
  userRole: string | undefined,
  tab: AdminTab,
): boolean => hasRole(userRole, ADMIN_TAB_ACCESS[tab]);
