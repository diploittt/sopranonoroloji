import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { RTCView } from '@livekit/react-native-webrtc';

interface CameraPreviewProps {
    localStream: any; // MediaStream from getUserMedia
    onClose?: () => void;
}

/**
 * CameraPreview — Shows local camera feed as a floating overlay
 * Uses RTCView from react-native-webrtc to render the stream
 */
export default function CameraPreview({ localStream, onClose }: CameraPreviewProps) {
    if (!localStream) return null;

    // Get stream URL for RTCView
    const streamURL = typeof localStream.toURL === 'function' ? localStream.toURL() : '';

    return (
        <View style={styles.container}>
            {/* Close button */}
            <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
                <Text style={styles.closeTxt}>✕</Text>
            </TouchableOpacity>

            <View style={styles.videoCard}>
                <RTCView
                    streamURL={streamURL}
                    style={styles.video}
                    objectFit="cover"
                    mirror={true}
                    zOrder={1}
                />
                <View style={styles.nameTag}>
                    <Text style={styles.nameText}>📷 Sen</Text>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 70,
        right: 8,
        zIndex: 100,
    },
    closeBtn: {
        position: 'absolute',
        top: -10,
        right: -4,
        zIndex: 110,
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: 'rgba(239, 68, 68, 0.9)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    closeTxt: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '700',
    },
    videoCard: {
        width: 140,
        height: 190,
        borderRadius: 12,
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: 'rgba(59, 130, 246, 0.4)',
        backgroundColor: '#000',
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 10,
    },
    video: {
        flex: 1,
    },
    nameTag: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        paddingHorizontal: 6,
        paddingVertical: 3,
    },
    nameText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: '600',
        textAlign: 'center',
    },
});
