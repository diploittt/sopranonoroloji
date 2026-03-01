import { api } from './api';

/**
 * Backend'den LiveKit token alır
 */
export async function getLiveKitToken(
    room: string,
    username: string,
): Promise<string> {
    const data = await api.get<{ token: string }>(
        `/livekit/token?room=${encodeURIComponent(room)}&username=${encodeURIComponent(username)}`,
    );
    return data.token;
}
