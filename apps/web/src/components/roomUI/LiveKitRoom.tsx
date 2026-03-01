'use client';

import { useEffect, useState } from 'react';
import {
    LiveKitRoom as LKRoom,
    VideoConference,
    RoomAudioRenderer,
} from '@livekit/components-react';
import '@livekit/components-styles';

interface LiveKitRoomProps {
    room: string;
    username: string;
}

export default function LiveKitRoom({ room, username }: LiveKitRoomProps) {
    const [token, setToken] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const livekitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;

    useEffect(() => {
        if (!room || !username) return;

        const fetchToken = async () => {
            try {
                const res = await fetch(
                    `/api/livekit?room=${encodeURIComponent(room)}&username=${encodeURIComponent(username)}`
                );
                const data = await res.json();
                if (data.error) {
                    setError(data.error);
                    return;
                }
                setToken(data.token);
            } catch (err: any) {
                setError(err.message || 'Token alınamadı');
            }
        };

        fetchToken();
    }, [room, username]);

    if (error) {
        return (
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                color: '#ef4444',
                fontSize: 14,
                padding: 16,
                textAlign: 'center',
            }}>
                <div>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>⚠️</div>
                    <p>LiveKit Bağlantı Hatası</p>
                    <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>{error}</p>
                </div>
            </div>
        );
    }

    if (!token || !livekitUrl) {
        return (
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                color: 'rgba(255,255,255,0.5)',
                fontSize: 14,
            }}>
                <div style={{ textAlign: 'center' }}>
                    <div className="animate-spin" style={{
                        width: 24,
                        height: 24,
                        border: '2px solid rgba(255,255,255,0.2)',
                        borderTopColor: '#4facfe',
                        borderRadius: '50%',
                        margin: '0 auto 8px',
                    }} />
                    <p>Medya bağlantısı kuruluyor...</p>
                </div>
            </div>
        );
    }

    return (
        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
            <LKRoom
                serverUrl={livekitUrl}
                token={token}
                connect={true}
                video={false}
                audio={false}
                style={{ width: '100%', height: '100%' }}
            >
                <VideoConference />
                <RoomAudioRenderer />
            </LKRoom>
        </div>
    );
}
