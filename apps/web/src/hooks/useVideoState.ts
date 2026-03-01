import { useState, useMemo } from 'react';
import { User, StreamEntry } from '@/types'; // Functionality depends on existing types

export interface VideoStateProps {
    roomUsers: User[];
    currentUser: User | null;
    localStream: MediaStream | null;
    remoteStreams: { peerId: string; stream: MediaStream; kind?: string }[];
    currentSpeaker: { userId: string } | null;
    isCameraOn: boolean;
}

export function useVideoState({
    roomUsers,
    currentUser,
    localStream,
    remoteStreams,
    currentSpeaker,
    isCameraOn
}: VideoStateProps) {
    const [pinnedUserId, setPinnedUserId] = useState<string | null>(null);

    // DERIVE TV STREAM (The "Big Screen")
    const tvStreamEntry = useMemo(() => {
        // 1. Priority: Pinned User (Manual Override)
        if (pinnedUserId) {
            if (pinnedUserId === currentUser?.userId && localStream) {
                return { stream: localStream, isLocal: true, username: currentUser?.username || 'Ben' };
            }
            const remote = remoteStreams.find(s => {
                const u = roomUsers.find(ru => ru.userId === pinnedUserId);
                return u && s.peerId === u.userId && s.kind === 'video';
            });
            if (remote) {
                return { stream: remote.stream, isLocal: false, username: remote.peerId };
            }
        }

        // 2. Priority: Current Speaker with camera ON → Main TV
        if (currentSpeaker) {
            const isLocalSpeaker = currentSpeaker.userId === currentUser?.userId;

            if (isLocalSpeaker && isCameraOn && localStream) {
                return { stream: localStream, isLocal: true, username: currentUser?.username || 'Ben' };
            }

            if (!isLocalSpeaker) {
                const speakerUser = roomUsers.find(u => u.userId === currentSpeaker.userId);
                if (speakerUser && speakerUser.cameraOn) {
                    const remote = remoteStreams.find(s => s.peerId === speakerUser.userId && s.kind === 'video');
                    if (remote) {
                        return { stream: remote.stream, isLocal: false, username: speakerUser.username };
                    }
                }
            }
        }

        // 3. No speaker with camera → no TV stream (others go to grid)
        return null;
    }, [pinnedUserId, currentSpeaker, roomUsers, currentUser, localStream, remoteStreams, isCameraOn]);

    return {
        tvStreamEntry,
        pinnedUserId,
        setPinnedUserId
    };
}
