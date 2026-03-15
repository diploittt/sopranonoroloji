// ═══════════════════════════════════════════════════════════════
//  RBAC Engine — Official Role-Permission Matrix
//  Resmi Rol Hiyerarşisi & Aksiyon Matrisi
// ═══════════════════════════════════════════════════════════════

// ─── Roles (alt → üst) ──────────────────────────────────────
export enum Role {
    Guest = 'guest',
    Member = 'member',
    Vip = 'vip',
    Operator = 'operator',    // İlk moderasyon seviyesi (DJ düzeyi)
    Moderator = 'moderator',   // Hard moderation
    Admin = 'admin',       // Room/System control
    SuperAdmin = 'superadmin',  // Platform control
    Owner = 'owner',       // Site sahibi (müşteri)
    GodMaster = 'godmaster',  // Sistem sahibi — en üst yetki
}

export const roleHierarchy: Record<Role | string, number> = {
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

export const ROLE_LABELS: Record<string, string> = {
    [Role.Guest]: 'Misafir',
    [Role.Member]: 'Üye',
    [Role.Vip]: 'VIP',
    [Role.Operator]: 'Operatör',
    [Role.Moderator]: 'Moderatör',
    [Role.Admin]: 'Admin',
    [Role.SuperAdmin]: 'Süper Admin',
    [Role.Owner]: 'Owner',
    [Role.GodMaster]: 'GodMaster',
};

// ─── Utility Functions ──────────────────────────────────────
export const getRoleLevel = (role: string | undefined): number =>
    roleHierarchy[(role || '').toLowerCase()] ?? 0;

export const hasRole = (userRole: string | undefined, minRole: Role): boolean =>
    getRoleLevel(userRole) >= getRoleLevel(minRole);

export const isHigherRole = (actorRole: string | undefined, targetRole: string | undefined): boolean =>
    getRoleLevel(actorRole) > getRoleLevel(targetRole);

export const isSameRole = (a: string | undefined, b: string | undefined): boolean =>
    getRoleLevel(a) === getRoleLevel(b);

// ─── Actions — 6 Categories ────────────────────────────────
export type Action =
    // A) SELF / CLIENT ACTIONS (herkes)
    | 'self.change_name'
    | 'self.mic_test'
    | 'self.sound_settings'
    | 'self.my_profile'
    | 'self.private_chat'
    | 'self.invite_one2one'
    | 'self.ignore'

    // B) ROOM INTERACTION (oda içi akış)
    | 'room.mic_free'           // Member+
    | 'room.mic_take'           // Member+
    | 'room.move_to_meeting'    // Member+
    | 'room.conference'         // VIP+
    | 'room.clear_text_local'   // Guest+
    | 'room.clear_text_global'  // Operator+
    | 'room.freeze_chat_local'  // Guest+
    | 'room.freeze_chat_global' // Moderator+
    | 'room.copy'               // Guest+
    | 'room.select_all'         // Guest+

    // C) SOFT MODERATION (Operator+)
    | 'mod.mute'                // Operator+
    | 'mod.gag'                 // Operator+
    | 'mod.clear_text'          // Operator+
    | 'mod.log_history'         // Operator+
    | 'mod.userinfo'            // Operator+
    | 'mod.force_take_mic'      // Operator+ (hierarchical)
    | 'mod.make_room_op'        // Moderator+

    // D) HARD MODERATION (Moderator+)
    | 'mod.kick'                // Moderator+
    | 'mod.hard_kick'           // Moderator+
    | 'mod.exit_browser'        // Moderator+
    | 'mod.cam_block'           // Moderator+
    | 'mod.ban_1day'            // Moderator+
    | 'mod.ban_1week'           // Moderator+
    | 'mod.ban_1month'          // Admin+

    // E) ROOM / SYSTEM CONTROL (Admin+)
    | 'ctrl.admin_panel'        // Admin+
    | 'ctrl.users_global'       // Admin+
    | 'ctrl.rooms_list'         // Admin+
    | 'ctrl.room_spy'           // Admin+
    | 'ctrl.move_user_room'     // Admin+
    | 'ctrl.room_broadcast'     // Admin+

    // F) PLATFORM CONTROL (SuperAdmin+)
    | 'platform.all_settings'   // SuperAdmin+
    | 'platform.ban_gag_list'   // SuperAdmin+
    | 'platform.ip_ban'         // SuperAdmin+
    | 'platform.admin_login'    // SuperAdmin+
    | 'platform.forbidden_words'// SuperAdmin+
    | 'platform.about'          // Admin+
    ;

// ─── PERMISSIONS MAP — Min role for each action ────────────
export const PERMISSIONS: Record<Action, Role> = {
    // A) Self / Client — Guest+
    'self.change_name': Role.Guest,
    'self.mic_test': Role.Guest,
    'self.sound_settings': Role.Guest,
    'self.my_profile': Role.Guest,
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

    // C) Soft Moderation — Operator+
    'mod.mute': Role.Operator,
    'mod.gag': Role.Operator,
    'mod.clear_text': Role.Operator,
    'mod.log_history': Role.Operator,
    'mod.userinfo': Role.Operator,
    'mod.force_take_mic': Role.Operator,
    'mod.make_room_op': Role.Moderator,

    // D) Hard Moderation — Moderator+
    'mod.kick': Role.Moderator,
    'mod.hard_kick': Role.Moderator,
    'mod.exit_browser': Role.Moderator,
    'mod.cam_block': Role.Moderator,
    'mod.ban_1day': Role.Moderator,
    'mod.ban_1week': Role.Moderator,
    'mod.ban_1month': Role.Admin,

    // E) Room / System Control — Admin+
    'ctrl.admin_panel': Role.Admin,
    'ctrl.users_global': Role.Admin,
    'ctrl.rooms_list': Role.Admin,
    'ctrl.room_spy': Role.Admin,
    'ctrl.move_user_room': Role.Admin,
    'ctrl.room_broadcast': Role.Admin,

    // F) Platform Control — SuperAdmin+
    'platform.all_settings': Role.SuperAdmin,
    'platform.ban_gag_list': Role.SuperAdmin,
    'platform.ip_ban': Role.SuperAdmin,
    'platform.admin_login': Role.SuperAdmin,
    'platform.forbidden_words': Role.SuperAdmin,
    'platform.about': Role.Admin,
};

// ─── Unified permission check ──────────────────────────────
// Hierarchical actions require actor > target
const HIERARCHICAL_ACTIONS: Action[] = [
    'mod.mute', 'mod.gag', 'mod.kick', 'mod.hard_kick',
    'mod.exit_browser', 'mod.cam_block',
    'mod.ban_1day', 'mod.ban_1week', 'mod.ban_1month',
    'mod.make_room_op', 'mod.clear_text', 'mod.force_take_mic',
    'room.mic_take', 'room.mic_free',
    'ctrl.move_user_room',
];

export const can = (userRole: string | undefined, action: Action, targetRole?: string): boolean => {
    if (!userRole) return false;
    const r = userRole.toLowerCase();

    // 1. Basic role requirement
    const required = PERMISSIONS[action];
    if (!hasRole(r, required)) return false;

    // 2. Owner / GodMaster override — always passes
    if (r === Role.Owner || r === Role.GodMaster) return true;

    // 3. Hierarchical check — actor must be strictly higher than target
    if (targetRole && HIERARCHICAL_ACTIONS.includes(action)) {
        return isHigherRole(r, targetRole);
    }

    return true;
};

// ─── Stealth Mode ──────────────────────────────────────────
// VIP+ default to stealth. Only strictly higher roles can see stealth users.
export const defaultStealth = (role: string | undefined): boolean =>
    hasRole(role, Role.Vip);

export const canSeeStealthUser = (viewerRole: string | undefined, targetRole: string | undefined): boolean => {
    if (!viewerRole) return false;
    if (viewerRole.toLowerCase() === Role.Owner) return true;
    return isHigherRole(viewerRole, targetRole);
};

// ─── Admin Panel Tab Access ────────────────────────────────
// Spesifikasyona göre:
//   Admin:      Users ✔, Rooms ✔, About ✔
//   SuperAdmin: Users ✔, Rooms ✔, AllSettings ✔, Ban/Gag ✔, IP Ban ✔, AdminLogin ✔, ForbiddenWords ✔, About ✔
//   Owner:      Everything
export type AdminTab = 'users' | 'rooms' | 'designs' | 'settings' | 'bans' | 'ipbans' | 'adminlogin' | 'words' | 'about' | 'logs';

export const ADMIN_TAB_ACCESS: Record<AdminTab, { minRole: Role; readOnlyBelow?: Role }> = {
    users: { minRole: Role.Admin },
    rooms: { minRole: Role.Admin },
    about: { minRole: Role.Admin },
    logs: { minRole: Role.Admin },
    designs: { minRole: Role.Owner },
    settings: { minRole: Role.Admin },
    bans: { minRole: Role.Admin },
    ipbans: { minRole: Role.Admin },
    adminlogin: { minRole: Role.SuperAdmin },
    words: { minRole: Role.Admin },
};

export const canAccessTab = (userRole: string | undefined, tab: AdminTab): boolean =>
    hasRole(userRole, ADMIN_TAB_ACCESS[tab].minRole);

export const isTabReadOnly = (userRole: string | undefined, tab: AdminTab): boolean => {
    const access = ADMIN_TAB_ACCESS[tab];
    if (!access.readOnlyBelow) return false;
    return !hasRole(userRole, access.readOnlyBelow);
};
