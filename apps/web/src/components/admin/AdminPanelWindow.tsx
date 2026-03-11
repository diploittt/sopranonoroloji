import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useAdminPanelStore, type AdminTabId } from '@/stores/useAdminPanelStore';
import { X, Minus, Square, Users, Home, Ban, MessageSquare, FileText, Settings, GripHorizontal, Globe, Info } from 'lucide-react';
import { User, RoomState } from '@/types';
import { Socket } from 'socket.io-client';
import { Role, hasRole, canAccessTab, isTabReadOnly, type AdminTab } from '@/lib/rbac';

import { UsersTab } from './tabs/UsersTab';
import { RoomsTab } from './tabs/RoomsTab';
import { BansTab } from './tabs/BansTab';
import { WordsTab } from './tabs/WordsTab';
import { LogsTab } from './tabs/LogsTab';
import { SettingsTab } from './tabs/SettingsTab';
import { IpBansTab } from './tabs/IpBansTab';
import { AboutTab } from './tabs/AboutTab';


interface AdminPanelProps {
    socket: Socket | null;
    users: User[];
    currentUser: User | null;
    roomState: RoomState;
    systemSettings?: Record<string, any> | null;
}

const MIN_W = 600;
const MIN_H = 400;

export function AdminPanelWindow({ socket, users, currentUser, roomState, systemSettings }: AdminPanelProps) {
    const { isOpen, closePanel, activeTab, setActiveTab } = useAdminPanelStore();

    // Window State
    const [isMaximized, setIsMaximized] = useState(false);
    const [preMaxSize, setPreMaxSize] = useState({ width: 900, height: 600, x: 100, y: 100 });

    // ────── Refs for zero-re-render drag/resize ──────
    const windowRef = useRef<HTMLDivElement>(null);
    const posRef = useRef({ x: 0, y: 0 });
    const sizeRef = useRef({ width: 900, height: 600 });
    const interactionRef = useRef<'idle' | 'drag' | 'resize'>('idle');
    const dragOffsetRef = useRef({ x: 0, y: 0 });

    // Direct DOM update — no React state, no re-render
    const applyLayout = useCallback(() => {
        const el = windowRef.current;
        if (!el) return;
        el.style.transform = `translate(${posRef.current.x}px, ${posRef.current.y}px)`;
        el.style.width = `${sizeRef.current.width}px`;
        el.style.height = `${sizeRef.current.height}px`;
    }, []);

    // Center on first open
    useEffect(() => {
        if (isOpen) {
            const w = sizeRef.current.width;
            const h = sizeRef.current.height;
            posRef.current = {
                x: Math.max(0, Math.floor((window.innerWidth - w) / 2)),
                y: Math.max(0, Math.floor((window.innerHeight - h) / 2)),
            };
            applyLayout();
        }
    }, [isOpen, applyLayout]);

    // Socket open event
    useEffect(() => {
        if (isOpen && socket) {
            socket.emit('admin:open');
        }
    }, [isOpen, socket]);

    // ────── Global mouse move/up for drag & resize ──────
    useEffect(() => {
        const onMove = (e: MouseEvent) => {
            if (interactionRef.current === 'drag') {
                posRef.current = {
                    x: e.clientX - dragOffsetRef.current.x,
                    y: Math.max(0, e.clientY - dragOffsetRef.current.y),
                };
                applyLayout();
            } else if (interactionRef.current === 'resize') {
                sizeRef.current = {
                    width: Math.max(MIN_W, e.clientX - posRef.current.x),
                    height: Math.max(MIN_H, e.clientY - posRef.current.y),
                };
                applyLayout();
            }
        };

        const onUp = () => {
            if (interactionRef.current !== 'idle') {
                interactionRef.current = 'idle';
                document.body.style.userSelect = '';
                document.body.style.cursor = '';
            }
        };

        window.addEventListener('mousemove', onMove, { passive: true });
        window.addEventListener('mouseup', onUp);
        return () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
        };
    }, [applyLayout]);

    // ────── Drag start (from header only) ──────
    const handleDragStart = useCallback((e: React.MouseEvent) => {
        if (isMaximized) return;
        const target = e.target as HTMLElement;
        // Only start drag if clicking on the drag handle itself, not on buttons inside it
        if (!target.closest('.window-drag-handle') || target.closest('button')) return;
        interactionRef.current = 'drag';
        dragOffsetRef.current = {
            x: e.clientX - posRef.current.x,
            y: e.clientY - posRef.current.y,
        };
        document.body.style.userSelect = 'none';
        document.body.style.cursor = 'move';
    }, [isMaximized]);

    // ────── Resize start ──────
    const handleResizeStart = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        if (isMaximized) return;
        interactionRef.current = 'resize';
        document.body.style.userSelect = 'none';
        document.body.style.cursor = 'nwse-resize';
    }, [isMaximized]);

    // ────── Maximize / Restore ──────
    const toggleMaximize = useCallback(() => {
        if (isMaximized) {
            sizeRef.current = { width: preMaxSize.width, height: preMaxSize.height };
            posRef.current = { x: preMaxSize.x, y: preMaxSize.y };
        } else {
            setPreMaxSize({ ...sizeRef.current, ...posRef.current });
            posRef.current = { x: 0, y: 0 };
            sizeRef.current = { width: window.innerWidth, height: window.innerHeight };
        }
        setIsMaximized(prev => !prev);
        requestAnimationFrame(applyLayout);
    }, [isMaximized, preMaxSize, applyLayout]);

    // ────── RBAC Tabs ──────
    const authorizedTabs = useMemo(() => {
        if (!currentUser?.role) return [];
        const allTabs: { id: AdminTabId; label: string; icon: any; tabKey: AdminTab }[] = [
            { id: 'users', label: 'Kullanıcılar', icon: Users, tabKey: 'users' },
            { id: 'rooms', label: 'Odalar', icon: Home, tabKey: 'rooms' },

            { id: 'bans', label: 'Yasaklamalar', icon: Ban, tabKey: 'bans' },
            { id: 'ipbans', label: 'IP Yasakları', icon: Globe, tabKey: 'ipbans' },
            { id: 'words', label: 'Kelime Filtresi', icon: MessageSquare, tabKey: 'words' },
            { id: 'logs', label: 'Loglar', icon: FileText, tabKey: 'logs' },
            { id: 'settings', label: 'Ayarlar', icon: Settings, tabKey: 'settings' },
            { id: 'about', label: 'Hakkında', icon: Info, tabKey: 'about' },
        ];
        return allTabs.filter(tab => canAccessTab(currentUser.role, tab.tabKey));
    }, [currentUser?.role]);

    // Ensure active tab is authorized
    useEffect(() => {
        if (isOpen && authorizedTabs.length > 0) {
            const isAuthorized = authorizedTabs.find(t => t.id === activeTab);
            if (!isAuthorized) {
                setActiveTab(authorizedTabs[0].id as any);
            }
        }
    }, [isOpen, activeTab, authorizedTabs, setActiveTab]);

    if (!isOpen) return null;

    const content = (
        <div
            ref={windowRef}
            className={`fixed z-[9999] flex flex-col overflow-hidden
                ${isMaximized ? 'rounded-none' : 'rounded-2xl'}
            `}
            style={{
                top: 0,
                left: 0,
                transform: `translate(${posRef.current.x}px, ${posRef.current.y}px)`,
                width: sizeRef.current.width,
                height: sizeRef.current.height,
                background: 'linear-gradient(165deg, rgba(226,232,240,0.96) 0%, rgba(218,225,235,0.95) 50%, rgba(210,218,230,0.94) 100%)',
                backdropFilter: 'blur(28px) saturate(130%)',
                WebkitBackdropFilter: 'blur(28px) saturate(130%)',
                boxShadow: '0 40px 80px -15px rgba(0,0,0,0.25), 0 16px 32px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.8)',
                willChange: 'transform',
                border: '1px solid rgba(255,255,255,0.65)',
            }}
            onMouseDown={handleDragStart}
            onContextMenu={(e) => {
                e.preventDefault();
                closePanel();
            }}
        >
            {/* ── Premium Window Header ── */}
            <div className="window-drag-handle relative h-10 flex items-center justify-between px-4 cursor-move select-none shrink-0"
                style={{
                    background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                }}
                onDoubleClick={toggleMaximize}
            >
                {/* Subtle top edge highlight */}
                <div className="absolute top-0 left-0 right-0 h-[1px]" style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.2) 30%, rgba(255,255,255,0.25) 50%, rgba(255,255,255,0.2) 70%, transparent 100%)' }} />
                {/* Bottom accent line */}
                <div className="absolute bottom-0 left-0 right-0 h-[1px]" style={{ background: 'rgba(255,255,255,0.1)' }} />

                <div className="flex items-center gap-3">
                    <div className="relative p-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)' }}>
                        <Settings className="w-4 h-4 text-white/80" />
                        <div className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full animate-pulse" style={{ background: '#34d399', boxShadow: '0 0 8px rgba(52,211,153,0.5)' }} />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[14px] font-black tracking-wide leading-tight" style={{ color: '#fff', textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>Soprano</span>
                        <span className="text-[8px] font-bold text-white/60 tracking-[0.2em] uppercase" style={{ marginTop: '-1px' }}>Yönetim Paneli</span>
                    </div>
                    <span className="text-[8px] font-bold text-white/70 px-2 py-0.5 rounded-full ml-1" style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)' }}>v1.0</span>
                </div>
                <div className="flex items-center gap-1">
                    <button className="p-1.5 hover:bg-white/20 rounded-lg text-white/60 hover:text-white transition-all duration-200" onClick={() => closePanel()}>
                        <Minus className="w-3.5 h-3.5" />
                    </button>
                    <button
                        className="p-1.5 hover:bg-white/20 rounded-lg text-white/60 hover:text-white transition-all duration-200"
                        onClick={toggleMaximize}
                    >
                        <Square className="w-3 h-3" />
                    </button>
                    <button
                        onClick={closePanel}
                        className="p-1.5 hover:bg-red-500/20 rounded-lg text-white/60 hover:text-red-300 transition-all duration-200"
                    >
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* ── Premium Sidebar ── */}
                <div className="w-[200px] flex flex-col py-4 px-3 gap-1 overflow-y-auto shrink-0 relative"
                    style={{
                        background: 'rgba(218,225,235,0.5)',
                        borderRight: '1px solid rgba(100,116,139,0.18)',
                    }}
                >
                    {/* Right edge glow line */}
                    <div className="absolute top-0 right-0 bottom-0 w-[1px]" style={{ background: 'linear-gradient(180deg, transparent 0%, rgba(148,163,184,0.15) 30%, rgba(148,163,184,0.2) 50%, rgba(148,163,184,0.15) 70%, transparent 100%)' }} />
                    {/* Sidebar section label */}
                    <div className="px-3 pb-2 mb-1">
                        <div className="text-[8px] font-black uppercase tracking-[0.2em] text-gray-400">Menü</div>
                    </div>

                    {authorizedTabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-semibold transition-all duration-250 group relative overflow-hidden
                                ${activeTab === tab.id
                                    ? 'text-[#1e3a5f]'
                                    : 'text-gray-500 hover:text-gray-700'
                                }
                            `}
                            style={activeTab === tab.id ? {} : {}}
                        >
                            {/* Active tab glow */}
                            {activeTab === tab.id && (
                                <>
                                    <div className="absolute inset-0 rounded-xl" style={{ background: 'rgba(37,99,235,0.08)' }} />
                                    <div className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full" style={{ background: 'linear-gradient(180deg, #1e3a5f, #2c5282)', boxShadow: '0 0 10px rgba(37,99,235,0.2)' }} />
                                </>
                            )}
                            {/* Hover background */}
                            {activeTab !== tab.id && (
                                <div className="absolute inset-0 rounded-xl bg-transparent group-hover:bg-black/[0.03] transition-colors duration-200" />
                            )}
                            <tab.icon className={`w-4 h-4 relative z-10 transition-colors duration-200 ${activeTab === tab.id ? 'text-[#1e3a5f]' : 'text-gray-400 group-hover:text-gray-600'}`} />
                            <span className="relative z-10">{tab.label}</span>
                        </button>
                    ))}

                    {/* Sidebar footer removed — duplicate of header */}
                </div>

                {/* ── Content Area ── */}
                <div className="flex-1 relative overflow-hidden flex flex-col" style={{ background: 'rgba(255,255,255,0.1)' }}>
                    {/* Top accent line */}
                    <div className="absolute inset-x-0 top-0 h-[1px] z-10" style={{ background: 'linear-gradient(90deg, transparent, rgba(148,163,184,0.1), transparent)' }} />

                    {activeTab === 'users' && <UsersTab socket={socket} users={users} currentUser={currentUser} />}
                    {activeTab === 'rooms' && <RoomsTab socket={socket} currentUser={currentUser} systemSettings={systemSettings} />}

                    {activeTab === 'bans' && <BansTab socket={socket} />}
                    {activeTab === 'ipbans' && <IpBansTab socket={socket} />}
                    {activeTab === 'about' && <AboutTab socket={socket} />}
                    {activeTab === 'words' && <WordsTab socket={socket} />}
                    {activeTab === 'logs' && <LogsTab socket={socket} />}
                    {activeTab === 'settings' && <SettingsTab socket={socket} systemSettings={systemSettings} />}
                </div>
            </div>

            {/* ── Resize Handle ── */}
            {!isMaximized && (
                <div
                    className="absolute bottom-0 right-0 p-2.5 cursor-nwse-resize opacity-20 hover:opacity-80 group transition-opacity duration-300"
                    onMouseDown={handleResizeStart}
                >
                    <div className="w-3.5 h-3.5 border-r-2 border-b-2 border-[#7b9fef]/30 group-hover:border-[#a3bfff] transition-colors rounded-br-sm" />
                </div>
            )}
        </div>
    );

    return createPortal(content, document.body);
}
