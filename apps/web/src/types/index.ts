export interface StreamEntry {
    stream: MediaStream;
    isLocal: boolean;
    username: string;
}

export interface User {
    socketId: string;
    username: string;
    displayName?: string;
    role: string;
    roomId?: string;
    micState: 'listener' | 'requested' | 'speaker';
    cameraOn: boolean;
    peerId?: string;
    avatar?: string;
    userId?: string;
    isStealth?: boolean;
    status?: 'online' | 'busy' | 'away' | 'brb' | 'phone' | 'outside' | 'stealth';
    isMuted?: boolean;
    isGagged?: boolean;
    isBanned?: boolean;
    isCamBlocked?: boolean;
    gender?: string;
    permissions?: Record<string, boolean>;
    visibilityMode?: 'hidden' | 'visible' | 'disguised'; // GodMaster only
    nameColor?: string;
    godmasterIcon?: string;
    platform?: 'web' | 'mobile' | 'embed';
}

export interface Message {
    id?: string;
    sender: string;
    message: string;
    type: 'system' | 'user';
    role?: string;
    timestamp?: string;
    avatar?: string;
    nameColor?: string;
    reactions?: Record<string, string[]>; // emoji → array of usernames
}

export interface RoomState {
    users: User[];
    messages: Message[];
    currentUser: User | null;
    localStream: MediaStream | null;
    remoteStreams: { peerId: string; stream: MediaStream; username?: string }[];
    activeStream: MediaStream | null;
    currentSpeaker: { userId: string; displayName: string; username?: string; socketId?: string; role?: string; avatar?: string; startedAt?: number; duration?: number } | null;
    micTimeLeft: number;
    queue: string[];
    availableDevices: { videoInputs: MediaDeviceInfo[], audioInputs: MediaDeviceInfo[], audioOutputs: MediaDeviceInfo[] };
    selectedVideoDeviceId: string | null;
    selectedAudioDeviceId: string | null;
    stereoMode: boolean;
    toastMessage: { type: 'success' | 'error' | 'info', title: string, message?: string } | null;
    isCameraOn: boolean;
    isMicOn: boolean;
    remoteVolume: number;
    isRemoteMuted: boolean;
    lastError: { type: string; message: string; id: number } | null;
    openDMs: string[];
    dmMessages: Record<string, { id: string, from: string, message: string, timestamp: number, isSelf?: boolean }[]>;
}

export type Role = 'owner' | 'superadmin' | 'admin' | 'moderator' | 'operator' | 'dj' | 'vip' | 'member' | 'guest';

export interface Tenant {
    id: string;
    alias?: string;
    name: string;
    domain: string;
    status: 'ACTIVE' | 'PASSIVE' | 'SUSPENDED';
    packageType?: string;
    roomLimit?: number;
    userLimitPerRoom?: number;
    createdAt?: string;
    updatedAt?: string;
    email?: string;
    phone?: string;
}

export interface Room {
    id: string;
    name: string;
    users: number; // For UI display
    description?: string;
    icon?: any; // For Lucide icons
    color?: string; // Tailwind gradient class
}

export interface AdminUser {
    id: string;
    username: string;
    role: string;
    avatar?: string;
}
