import React, { useEffect, useState, useCallback, useRef, useImperativeHandle, forwardRef } from 'react';
import { Platform, PermissionsAndroid, View, StyleSheet } from 'react-native';
import {
    Room,
    RoomEvent,
    ConnectionState,
    DisconnectReason,
    Track,
} from 'livekit-client';
import { LIVEKIT_URL } from '@/constants';
import { getLiveKitToken } from '@/services/livekit';
import { AudioSession } from '@livekit/react-native';

export interface LiveKitMediaHandle {
    toggleCamera: () => Promise<boolean>;
    toggleMic: () => Promise<boolean>;
    isCameraOn: boolean;
    isMicOn: boolean;
    getRoom: () => Room | null;
}

interface LiveKitMediaProps {
    room: string;
    username: string;
    onCameraStateChange?: (on: boolean) => void;
    onMicStateChange?: (on: boolean) => void;
    showLocalPreview?: boolean;
}

/**
 * LiveKit Media Component — Audio + Video
 * Uses LiveKit's built-in setCameraEnabled/setMicrophoneEnabled
 * which properly handles React Native WebRTC internals.
 */
const LiveKitMedia = forwardRef<LiveKitMediaHandle, LiveKitMediaProps>(
    ({ room: roomName, username, onCameraStateChange, onMicStateChange }, ref) => {
        const roomRef = useRef<Room | null>(null);
        const [cameraOn, setCameraOn] = useState(false);
        const [micOn, setMicOn] = useState(false);

        // Request Android permissions
        const requestPermissions = async (): Promise<boolean> => {
            if (Platform.OS !== 'android') return true;
            try {
                const granted = await PermissionsAndroid.requestMultiple([
                    PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
                    PermissionsAndroid.PERMISSIONS.CAMERA,
                ]);
                return (
                    granted['android.permission.RECORD_AUDIO'] === 'granted' &&
                    granted['android.permission.CAMERA'] === 'granted'
                );
            } catch (err) {
                console.error('[LiveKit] Permission error:', err);
                return false;
            }
        };

        // Toggle camera using LiveKit's built-in API
        const toggleCamera = useCallback(async (): Promise<boolean> => {
            const lkRoom = roomRef.current;
            if (!lkRoom) {
                console.warn('[LiveKit] No room connected');
                return false;
            }

            try {
                const newState = !cameraOn;

                if (newState) {
                    // Request permissions first
                    const hasPerms = await requestPermissions();
                    if (!hasPerms) {
                        console.warn('[LiveKit] Camera permission denied');
                        return false;
                    }
                }

                // Use LiveKit's built-in camera toggle — handles RN WebRTC properly
                await lkRoom.localParticipant.setCameraEnabled(newState);

                setCameraOn(newState);
                onCameraStateChange?.(newState);
                console.log('[LiveKit] Camera', newState ? 'started' : 'stopped');
                return newState;
            } catch (err: any) {
                console.error('[LiveKit] Camera toggle error:', err?.message || err);
                return cameraOn; // return current state on error
            }
        }, [cameraOn, onCameraStateChange]);

        // Toggle mic using LiveKit's built-in API
        const toggleMic = useCallback(async (): Promise<boolean> => {
            const lkRoom = roomRef.current;
            if (!lkRoom) return false;

            try {
                const newState = !micOn;
                await lkRoom.localParticipant.setMicrophoneEnabled(newState);
                setMicOn(newState);
                onMicStateChange?.(newState);
                return newState;
            } catch (err: any) {
                console.error('[LiveKit] Mic toggle error:', err?.message || err);
                return micOn;
            }
        }, [micOn, onMicStateChange]);

        // Expose handle to parent
        useImperativeHandle(ref, () => ({
            toggleCamera,
            toggleMic,
            isCameraOn: cameraOn,
            isMicOn: micOn,
            getRoom: () => roomRef.current,
        }), [toggleCamera, toggleMic, cameraOn, micOn]);

        // Connect to LiveKit room
        const connect = useCallback(async () => {
            try {
                const hasPermissions = await requestPermissions();
                if (!hasPermissions) return;

                await AudioSession.startAudioSession();
                const token = await getLiveKitToken(roomName, username);

                const lkRoom = new Room({
                    adaptiveStream: true,
                    dynacast: true,
                });

                lkRoom.on(RoomEvent.Connected, () => {
                    console.log('[LiveKit] Connected to room:', roomName);
                });

                lkRoom.on(RoomEvent.Disconnected, (reason?: DisconnectReason) => {
                    console.log('[LiveKit] Disconnected, reason:', reason);
                    setCameraOn(false);
                    setMicOn(false);
                });

                lkRoom.on(RoomEvent.TrackSubscribed, (track, _pub, participant) => {
                    console.log('[LiveKit] Track subscribed:', track.kind, 'from', participant.identity);
                });

                lkRoom.on(RoomEvent.TrackPublished, (pub, participant) => {
                    console.log('[LiveKit] Track published:', pub.kind, 'by', participant.identity);
                });

                lkRoom.on(RoomEvent.ConnectionStateChanged, (state: ConnectionState) => {
                    console.log('[LiveKit] Connection state:', state);
                });

                await lkRoom.connect(LIVEKIT_URL, token);
                roomRef.current = lkRoom;

            } catch (err: any) {
                console.error('[LiveKit] Connection error:', err);
            }
        }, [roomName, username]);

        // Auto-connect on mount, cleanup on unmount
        useEffect(() => {
            connect();
            return () => {
                if (roomRef.current) {
                    try {
                        roomRef.current.localParticipant.setCameraEnabled(false).catch(() => { });
                        roomRef.current.localParticipant.setMicrophoneEnabled(false).catch(() => { });
                    } catch { }
                    roomRef.current.disconnect();
                    roomRef.current = null;
                }
                AudioSession.stopAudioSession();
                setCameraOn(false);
                setMicOn(false);
            };
        }, []);

        // Headless — no UI rendered (video rendered by participants in parent)
        return null;
    }
);

export default LiveKitMedia;
