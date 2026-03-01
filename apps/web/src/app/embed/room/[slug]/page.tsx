'use client';

import { use, useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { socket } from '@/lib/socket';
import { getPeer } from '@/lib/peer';
import { ensureAuthUser, AuthUser } from '@/lib/auth';
// import { VideoGrid } from '@/components/room/VideoGrid';
// import { ChatArea } from '@/components/room/ChatArea';
// Placeholder components until we locate the real ones
const VideoGrid = ({ ...props }: any) => <div className="text-white p-4">VideoGrid Placeholder (Component Missing)</div>;
const ChatArea = ({ ...props }: any) => <div className="text-white p-4">ChatArea Placeholder (Component Missing)</div>;
import { User, Message } from '@/types';
import { Mic, MicOff, Video, VideoOff, MessageSquare, X } from 'lucide-react';
import { setAuthUser } from '@/lib/auth';

export default function EmbedRoomPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = use(params);
    const searchParams = useSearchParams();
    const tenant = searchParams.get('tenant') || 'default';

    const [users, setUsers] = useState<User[]>([]);
    const [messages, setMessages] = useState<Message[]>([]);
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [showChat, setShowChat] = useState(false);

    // Media State
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [remoteStreams, setRemoteStreams] = useState<{ peerId: string; stream: MediaStream; username?: string }[]>([]);

    // Refs
    const streamRef = useRef<MediaStream | null>(null);
    const peerRef = useRef<any>(null);
    const callsRef = useRef<Map<string, any>>(new Map());

    const [isGagged, setIsGagged] = useState(false);

    const [passwordPrompt, setPasswordPrompt] = useState(false);
    const [passwordInput, setPasswordInput] = useState('');
    const [joinError, setJoinError] = useState<string | null>(null);

    // Theme & Branding State
    const [theme, setTheme] = useState({
        primaryColor: '#6366f1', // Indigo-500 default
        backgroundColor: '#000000'
    });
    const [branding, setBranding] = useState<{
        logoUrl?: string;
        productName?: string;
        backgroundStyle?: string;
        showWatermark: boolean;
    }>({ showWatermark: true });

    // 1. Fetch Tenant Branding & Setup
    useEffect(() => {
        // Fetch public tenant info
        const fetchBranding = async () => {
            try {
                const res = await fetch(`http://localhost:3000/api/tenants/public/${tenant}`);
                if (res.ok) {
                    const data = await res.json();

                    // Parse Theme
                    let customTheme = {};
                    if (data.theme) {
                        try { customTheme = JSON.parse(data.theme); } catch (e) { }
                    }

                    setTheme(prev => ({ ...prev, ...customTheme }));

                    setBranding({
                        logoUrl: data.logoUrl,
                        productName: data.productName,
                        backgroundStyle: data.backgroundStyle,
                        showWatermark: data.plan === 'free' || data.watermarkEnabled
                    });
                }
            } catch (error) {
                console.error('Failed to fetch branding:', error);
            }
        };
        fetchBranding();

        const handleMessage = (event: MessageEvent) => {
            if (event.data?.type === 'setTheme') {
                setTheme(prev => ({ ...prev, ...event.data.theme }));
            }
        };
        window.addEventListener('message', handleMessage);

        // Notify parent we are ready
        window.parent.postMessage({ type: 'ready' }, '*');

        return () => window.removeEventListener('message', handleMessage);
    }, [tenant]);

    const joinRoomWithPassword = () => {
        if (!currentUser) return;

        // Re-emit joinRoom with password
        // Peer logic initiates joinRoom usually, but here we might need to manually trigger or re-trigger.
        // Peer is already open, so we just emit socket event again.
        if (peerRef.current && peerRef.current.id) {
            socket.emit('joinRoom', {
                roomSlug: slug,
                username: currentUser.username,
                role: currentUser.role,
                peerId: peerRef.current.id,
                password: passwordInput
            });
            setPasswordPrompt(false);
            setJoinError(null);
        }
    };

    // 2. Initial Setup
    useEffect(() => {
        let user = ensureAuthUser();
        if (!user) {
            // Embed mode: auto-generate guest user (embeds are anonymous)
            user = {
                userId: `guest_${Math.random().toString(36).substring(2, 7)}`,
                username: `guest_${Math.random().toString(36).substring(2, 7)}`,
                avatar: '',
                isMember: false,
                role: 'guest'
            } as any; // Cast to satisfy ensureAuthUser return type if needed, or SetAuthUser
            setAuthUser(user as AuthUser);
        }
        setCurrentUser(user);

        // Configure Socket with Tenant
        // @ts-ignore - query type might be strict
        socket.io.opts.query = { tenant };

        // Listen for Gateway Errors
        socket.on('error', (err: { code: string, message: string }) => {
            if (err.code === 'REQUIRE_PASSWORD') {
                setPasswordPrompt(true);
            } else if (err.code === 'ROOM_FULL' || err.code === 'ROOM_LOCKED' || err.code === 'BANNED') {
                alert(`Giriş Başarısız: ${err.message}`);
                // Optional: redirect or show blocking UI
            } else {
                console.error('Socket Error:', err);
            }
        });

        navigator.mediaDevices.getUserMedia({ video: true, audio: true })
            .then((stream) => {
                setLocalStream(stream);
                streamRef.current = stream;

                if (!socket.connected) socket.connect();

                const peer = getPeer(user?.username || `guest_${Date.now()}`);
                peerRef.current = peer;

                peer.on('open', (peerId) => {
                    if (user && socket.connected) {
                        socket.emit('joinRoom', {
                            roomSlug: slug,
                            username: user.username,
                            role: user.role,
                            peerId: peerId,
                            password: passwordInput
                        });
                    }
                });

                peer.on('call', (call) => {
                    call.answer(stream);
                    call.on('stream', (remoteStream: MediaStream) => {
                        handleRemoteStream(call.peer, remoteStream);
                    });
                });
            })
            .catch(console.error);

        socket.on('roomUsers', (activeUsers: User[]) => {
            setUsers(activeUsers);

            // PostMessage to Parent
            window.parent.postMessage({ type: 'roomUsers', count: activeUsers.length }, '*');

            // Auto Call Logic
            if (!peerRef.current || !streamRef.current || !user) return;
            activeUsers.forEach(u => {
                if (u.username !== user!.username && !callsRef.current.has(u.username)) {
                    const call = peerRef.current.call(u.username, streamRef.current);
                    if (call) {
                        callsRef.current.set(u.username, call);
                        call.on('stream', (rs: MediaStream) => handleRemoteStream(u.username, rs));
                        call.on('close', () => {
                            setRemoteStreams(prev => prev.filter(s => s.peerId !== u.username));
                            callsRef.current.delete(u.username);
                        });
                    }
                }
            });
        });

        socket.on('chatMessage', (msg: Message) => {
            setMessages(prev => [...prev, msg]);
            if (msg.type === 'system') {
                if (msg.message.includes('katıldı')) window.parent.postMessage({ type: 'userJoined', user: msg.sender }, '*');
                if (msg.message.includes('ayrıldı')) window.parent.postMessage({ type: 'userLeft', user: msg.sender }, '*');
            }
        });

        socket.on('gagStatus', (data: { isGagged: boolean }) => {
            setIsGagged(data.isGagged);
            if (data.isGagged) alert('Söz hakkınız kısıtlandı (GAG). yazı yazamaz ve konuşamazsınız.');
        });

        return () => {
            if (localStream) localStream.getTracks().forEach(t => t.stop());
            if (peerRef.current) peerRef.current.destroy();
            socket.disconnect();
            socket.off('roomUsers');
            socket.off('chatMessage');
            socket.off('gagStatus');
            socket.off('error');
        };
    }, [slug, tenant]);

    const handleRemoteStream = (peerId: string, stream: MediaStream) => {
        setRemoteStreams(prev => {
            if (prev.find(p => p.peerId === peerId)) return prev;
            return [...prev, { peerId, stream, username: peerId }];
        });
    };

    const toggleMic = () => {
        if (localStream) {
            const track = localStream.getAudioTracks()[0];
            track.enabled = !track.enabled;
            // Force re-render just to update icon state
            setLocalStream(new MediaStream(localStream.getTracks()));
        }
    };

    const toggleCam = () => {
        if (localStream) {
            const track = localStream.getVideoTracks()[0];
            track.enabled = !track.enabled;
            socket.emit('toggleMediaState', { type: 'camera', isOn: track.enabled });
            setLocalStream(new MediaStream(localStream.getTracks()));
        }
    };

    const handleSendMessage = (text: string) => {
        if (!currentUser) return;
        socket.emit('sendChatMessage', {
            roomSlug: slug,
            message: text,
            username: currentUser.username,
            time: new Date().toISOString(),
        });
    };

    const latestCurrentUser = users.find(u => u.username === currentUser?.username) || currentUser;
    const isMicOn = localStream?.getAudioTracks()[0]?.enabled;
    const isCamOn = localStream?.getVideoTracks()[0]?.enabled;

    return (
        <div className="flex h-screen w-full relative overflow-hidden text-white font-sans"
            style={{
                backgroundColor: theme.backgroundColor,
                background: branding.backgroundStyle || theme.backgroundColor,
                backgroundSize: 'cover',
                backgroundPosition: 'center'
            }}>

            {/* Watermark for Free Plan */}
            {branding.showWatermark && (
                <div className="absolute bottom-4 right-4 z-50 pointer-events-none opacity-50 hover:opacity-100 transition-opacity">
                    <a href="https://soprano.chat" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-black/50 px-3 py-1.5 rounded-full backdrop-blur-sm border border-white/10 pointer-events-auto">
                        <img src="/logo.png" alt="Soprano" className="h-4 w-4" />
                        <span className="text-xs font-bold text-white/80">Powered by Soprano</span>
                    </a>
                </div>
            )}
            {/* Video Main Area */}
            <div className={`flex-1 relative transition-all duration-300 ${showChat ? 'mr-80' : 'mr-0'}`}>
                <div className="absolute top-4 left-4 z-10 flex items-center gap-3 bg-black/50 backdrop-blur-md px-4 py-2 rounded-full border border-white/5 shadow-lg">
                    {branding.logoUrl ? (
                        <img src={branding.logoUrl} alt="Logo" className="h-6 w-auto object-contain" />
                    ) : (
                        <span className="font-bold tracking-tight">{branding.productName || 'SopranoChat'}</span>
                    )}
                    <div className="w-px h-4 bg-white/20" />
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.5)]" />
                        <span className="text-xs font-bold tracking-wide text-red-400">LIVE</span>
                    </div>
                    <span className="text-xs opacity-50">|</span>
                    <span className="text-xs font-medium text-zinc-300">/{slug}</span>
                </div>

                <div className="h-full p-4">
                    <VideoGrid localStream={localStream} remoteStreams={remoteStreams} users={users} currentUsername={currentUser?.username} />
                </div>

                {/* Bottom Controls */}
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/60 backdrop-blur px-4 py-2 rounded-2xl border border-white/10 shadow-2xl">
                    <button onClick={toggleMic} className={`p-3 rounded-xl transition-all ${isMicOn ? 'bg-white/10 hover:bg-white/20' : 'bg-red-500/20 text-red-500'}`}>
                        {isMicOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
                    </button>
                    <button onClick={toggleCam} className={`p-3 rounded-xl transition-all ${isCamOn ? 'bg-white/10 hover:bg-white/20' : 'bg-red-500/20 text-red-500'}`}>
                        {isCamOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
                    </button>
                    <div className="w-px h-6 bg-white/10 mx-1" />
                    <button
                        onClick={() => setShowChat(!showChat)}
                        className={`p-3 rounded-xl transition-all ${showChat ? 'bg-indigo-500 text-white' : 'bg-white/10 hover:bg-white/20'}`}
                        style={{ backgroundColor: showChat ? theme.primaryColor : undefined }}
                    >
                        <MessageSquare className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Slide-over Chat */}
            <div className={`fixed inset-y-0 right-0 w-80 bg-black/90 backdrop-blur-xl border-l border-white/10 transform transition-transform duration-300 z-50 ${showChat ? 'translate-x-0' : 'translate-x-full'}`}>
                <div className="h-14 border-b border-white/10 flex items-center justify-between px-4">
                    <h3 className="font-bold flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-indigo-400" />
                        Sohbet
                    </h3>
                    <button onClick={() => setShowChat(false)} className="p-2 hover:bg-white/10 rounded-lg">
                        <X className="w-5 h-5 text-gray-400" />
                    </button>
                </div>
                <div className="h-[calc(100%-3.5rem)]">
                    <ChatArea messages={messages} onSendMessage={handleSendMessage} disabled={isGagged} />
                </div>
            </div>

            {/* Password Dialog */}
            {passwordPrompt && (
                <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-gray-900 border border-indigo-500/30 p-6 rounded-2xl w-full max-w-sm shadow-2xl relative overflow-hidden">
                        <div className="absolute inset-0 bg-indigo-500/5 pointer-events-none" />
                        <h3 className="text-xl font-bold mb-2 relative z-10 text-white">🔒 Oda Kilitli</h3>
                        <p className="text-gray-400 text-sm mb-4 relative z-10">Bu odaya girmek için şifre gereklidir.</p>

                        <input
                            type="password"
                            autoFocus
                            placeholder="Şifre"
                            value={passwordInput}
                            onChange={(e) => setPasswordInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && joinRoomWithPassword()}
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white mb-4 focus:outline-none focus:border-indigo-500 transition-colors relative z-10"
                        />

                        <div className="flex gap-2 relative z-10">
                            <button
                                onClick={() => window.history.back()}
                                className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold py-2 rounded-xl"
                            >
                                İptal
                            </button>
                            <button
                                onClick={joinRoomWithPassword}
                                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 rounded-xl"
                            >
                                Giriş Yap
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
