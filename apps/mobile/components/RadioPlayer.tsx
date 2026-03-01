import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Modal,
    FlatList,
} from 'react-native';
import { getSocket } from '@/services/socket';

interface RadioStation {
    name: string;
    url: string;
    genre?: string;
}

interface RadioPlayerProps {
    visible: boolean;
    onClose: () => void;
    roomId: string;
}

// ═══ Default stations — web ile aynı ═══
const DEFAULT_STATIONS: RadioStation[] = [
    { name: 'Türkçe Pop', url: 'https://listen.radyospor.com/turkcepop/128/icecast.audio', genre: 'Pop' },
    { name: 'Slow Türkçe', url: 'https://listen.radyospor.com/slowturk/128/icecast.audio', genre: 'Slow' },
    { name: 'Rock FM', url: 'https://listen.radyospor.com/rockfm/128/icecast.audio', genre: 'Rock' },
    { name: 'Arabesk', url: 'https://listen.radyospor.com/arabesk/128/icecast.audio', genre: 'Arabesk' },
    { name: 'Jazz FM', url: 'https://listen.radyospor.com/jazzfm/128/icecast.audio', genre: 'Jazz' },
    { name: 'Klasik', url: 'https://listen.radyospor.com/klasik/128/icecast.audio', genre: 'Klasik' },
];

export default function RadioPlayer({ visible, onClose, roomId }: RadioPlayerProps) {
    const [stations] = useState<RadioStation[]>(DEFAULT_STATIONS);
    const [currentStation, setCurrentStation] = useState<RadioStation | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);

    // Listen for radio events from server
    useEffect(() => {
        const socket = getSocket();
        if (!socket) return;

        const onRadioPlay = (data: { station: RadioStation }) => {
            setCurrentStation(data.station);
            setIsPlaying(true);
        };
        const onRadioStop = () => {
            setCurrentStation(null);
            setIsPlaying(false);
        };

        socket.on('radio:play', onRadioPlay);
        socket.on('radio:stop', onRadioStop);

        return () => {
            socket.off('radio:play', onRadioPlay);
            socket.off('radio:stop', onRadioStop);
        };
    }, []);

    const playStation = (station: RadioStation) => {
        setCurrentStation(station);
        setIsPlaying(true);
        // Emit to server — server handles actual playback for room
        const socket = getSocket();
        if (socket) socket.emit('radio:play', { roomId, station });
    };

    const stopPlayback = () => {
        setIsPlaying(false);
        setCurrentStation(null);
        const socket = getSocket();
        if (socket) socket.emit('radio:stop', { roomId });
    };

    const togglePlay = () => {
        if (isPlaying) {
            setIsPlaying(false);
        } else if (currentStation) {
            setIsPlaying(true);
        }
    };

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
                <View style={styles.container} onStartShouldSetResponder={() => true}>
                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={styles.headerIcon}>📻</Text>
                        <Text style={styles.headerTitle}>Radyo</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                            <Text style={styles.closeBtnText}>✕</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Now Playing */}
                    {currentStation && (
                        <View style={styles.nowPlaying}>
                            <View style={styles.nowPlayingInfo}>
                                <Text style={styles.nowPlayingLabel}>Şu an çalıyor</Text>
                                <Text style={styles.nowPlayingName}>{currentStation.name}</Text>
                                {currentStation.genre && (
                                    <Text style={styles.nowPlayingGenre}>{currentStation.genre}</Text>
                                )}
                            </View>
                            <View style={styles.controls}>
                                <TouchableOpacity style={styles.playBtn} onPress={togglePlay}>
                                    <Text style={styles.playBtnText}>
                                        {isPlaying ? '⏸️' : '▶️'}
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.stopBtn} onPress={stopPlayback}>
                                    <Text style={styles.stopBtnText}>⏹️</Text>
                                </TouchableOpacity>
                            </View>
                            {/* Sound wave animation */}
                            {isPlaying && (
                                <View style={styles.soundWave}>
                                    {[1, 2, 3, 4].map(i => (
                                        <View key={i} style={[styles.soundBar, { height: 6 + Math.random() * 14 }]} />
                                    ))}
                                </View>
                            )}
                        </View>
                    )}

                    {/* Station List */}
                    <FlatList
                        data={stations}
                        keyExtractor={(item) => item.url}
                        renderItem={({ item }) => {
                            const isActive = currentStation?.url === item.url;
                            return (
                                <TouchableOpacity
                                    style={[styles.stationItem, isActive && styles.stationItemActive]}
                                    onPress={() => playStation(item)}
                                >
                                    <View style={styles.stationInfo}>
                                        <Text style={[styles.stationName, isActive && styles.stationNameActive]}>
                                            {item.name}
                                        </Text>
                                        {item.genre && (
                                            <Text style={styles.stationGenre}>{item.genre}</Text>
                                        )}
                                    </View>
                                    {isActive ? (
                                        <Text style={styles.activeIcon}>🎵</Text>
                                    ) : (
                                        <Text style={styles.playIcon}>▶</Text>
                                    )}
                                </TouchableOpacity>
                            );
                        }}
                        contentContainerStyle={styles.stationList}
                    />
                </View>
            </TouchableOpacity>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    container: {
        backgroundColor: '#0F1626',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        maxHeight: '60%',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
    },
    headerIcon: {
        fontSize: 20,
    },
    headerTitle: {
        flex: 1,
        color: '#e5e7eb',
        fontSize: 16,
        fontWeight: '700',
    },
    closeBtn: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: 'rgba(255,255,255,0.05)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    closeBtnText: {
        color: '#6b7280',
        fontSize: 16,
    },
    nowPlaying: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: 'rgba(123,159,239,0.06)',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(123,159,239,0.1)',
        flexDirection: 'row',
        alignItems: 'center',
    },
    nowPlayingInfo: {
        flex: 1,
    },
    nowPlayingLabel: {
        fontSize: 10,
        color: '#7b9fef',
        fontWeight: '600',
        letterSpacing: 1,
        textTransform: 'uppercase',
    },
    nowPlayingName: {
        fontSize: 14,
        color: '#e5e7eb',
        fontWeight: '700',
        marginTop: 2,
    },
    nowPlayingGenre: {
        fontSize: 11,
        color: '#6b7280',
    },
    controls: {
        flexDirection: 'row',
        gap: 6,
    },
    playBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(123,159,239,0.2)',
        borderWidth: 1,
        borderColor: 'rgba(123,159,239,0.3)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    playBtnText: {
        fontSize: 16,
    },
    stopBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(239,68,68,0.2)',
        borderWidth: 1,
        borderColor: 'rgba(239,68,68,0.3)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    stopBtnText: {
        fontSize: 16,
    },
    soundWave: {
        flexDirection: 'row',
        gap: 2,
        alignItems: 'flex-end',
        height: 20,
        marginLeft: 8,
    },
    soundBar: {
        width: 3,
        borderRadius: 2,
        backgroundColor: '#7b9fef',
    },
    stationList: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        paddingBottom: 20,
    },
    stationItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderRadius: 12,
        marginBottom: 4,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
        backgroundColor: 'rgba(255,255,255,0.02)',
    },
    stationItemActive: {
        backgroundColor: 'rgba(123,159,239,0.08)',
        borderColor: 'rgba(123,159,239,0.2)',
    },
    stationInfo: {
        flex: 1,
    },
    stationName: {
        color: '#e5e7eb',
        fontSize: 14,
        fontWeight: '600',
    },
    stationNameActive: {
        color: '#7b9fef',
    },
    stationGenre: {
        color: '#6b7280',
        fontSize: 11,
        marginTop: 1,
    },
    activeIcon: {
        fontSize: 16,
    },
    playIcon: {
        fontSize: 14,
        color: '#6b7280',
    },
});
