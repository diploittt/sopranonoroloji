import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
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

    return (
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
                background: 'linear-gradient(145deg, rgba(10,14,24,0.98) 0%, rgba(6,8,16,0.99) 100%)',
                boxShadow: '0 32px 100px rgba(0,0,0,0.7), 0 0 0 1px rgba(123,159,239,0.1), 0 0 60px rgba(123,159,239,0.04)',
                willChange: 'transform',
                border: '1px solid rgba(123,159,239,0.08)',
            }}
            onMouseDown={handleDragStart}
            onContextMenu={(e) => {
                e.preventDefault();
                closePanel();
            }}
        >
            {/* ── Premium Window Header ── */}
            <div className="window-drag-handle relative h-12 flex items-center justify-between px-4 cursor-move select-none shrink-0"
                style={{
                    background: 'linear-gradient(180deg, rgba(200,60,60,0.08) 0%, rgba(160,40,40,0.04) 50%, rgba(15,18,28,0.6) 100%)',
                    borderBottom: '1px solid rgba(200,60,60,0.10)',
                }}
                onDoubleClick={toggleMaximize}
            >
                {/* Subtle top edge highlight */}
                <div className="absolute top-0 left-0 right-0 h-[1px]" style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(220,80,80,0.20) 30%, rgba(240,100,100,0.30) 50%, rgba(220,80,80,0.20) 70%, transparent 100%)' }} />
                {/* Bottom accent glow line */}
                <div className="absolute bottom-0 left-0 right-0 h-[1px]" style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(200,60,60,0.35) 25%, rgba(240,100,100,0.50) 50%, rgba(200,60,60,0.35) 75%, transparent 100%)', boxShadow: '0 0 8px rgba(200,60,60,0.12), 0 0 20px rgba(200,60,60,0.06)' }} />

                <div className="flex items-center gap-3">
                    <div className="relative p-2 rounded-xl" style={{ background: 'linear-gradient(135deg, rgba(123,159,239,0.15), rgba(90,127,212,0.08))', border: '1px solid rgba(123,159,239,0.15)' }}>
                        <Settings className="w-4 h-4 text-[#a3bfff]" />
                        <div className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full animate-pulse" style={{ background: 'linear-gradient(135deg, #a3bfff, #7b9fef)', boxShadow: '0 0 8px rgba(123,159,239,0.5)' }} />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[14px] font-black tracking-wide leading-tight" style={{ backgroundImage: 'linear-gradient(135deg, #a3bfff 0%, #7b9fef 40%, #5a7fd4 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', filter: 'drop-shadow(0 0 6px rgba(123,159,239,0.3))' }}>Soprano</span>
                        <span className="text-[8px] font-bold text-[#7b9fef]/50 tracking-[0.2em] uppercase" style={{ marginTop: '-1px' }}>Yönetim Paneli</span>
                    </div>
                    <span className="text-[8px] font-bold text-[#7b9fef]/60 px-2 py-0.5 rounded-full ml-1" style={{ background: 'linear-gradient(135deg, rgba(123,159,239,0.1), rgba(90,127,212,0.05))', border: '1px solid rgba(123,159,239,0.12)' }}>v3.0</span>
                </div>
                <div className="flex items-center gap-1">
                    <button className="p-1.5 hover:bg-white/8 rounded-lg text-gray-500 hover:text-gray-300 transition-all duration-200" onClick={() => closePanel()}>
                        <Minus className="w-3.5 h-3.5" />
                    </button>
                    <button
                        className="p-1.5 hover:bg-white/8 rounded-lg text-gray-500 hover:text-gray-300 transition-all duration-200"
                        onClick={toggleMaximize}
                    >
                        <Square className="w-3 h-3" />
                    </button>
                    <button
                        onClick={closePanel}
                        className="p-1.5 hover:bg-red-500/12 rounded-lg text-gray-500 hover:text-red-400 transition-all duration-200"
                    >
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* ── Premium Sidebar ── */}
                <div className="w-[200px] flex flex-col py-4 px-3 gap-1 overflow-y-auto shrink-0 relative"
                    style={{
                        background: 'linear-gradient(180deg, rgba(123,159,239,0.06) 0%, rgba(90,127,212,0.03) 50%, rgba(6,8,14,0.5) 100%)',
                        borderRight: '1px solid rgba(123,159,239,0.10)',
                    }}
                >
                    {/* Right edge glow line */}
                    <div className="absolute top-0 right-0 bottom-0 w-[1px]" style={{ background: 'linear-gradient(180deg, transparent 0%, rgba(123,159,239,0.25) 30%, rgba(163,191,255,0.35) 50%, rgba(123,159,239,0.25) 70%, transparent 100%)', boxShadow: '0 0 6px rgba(123,159,239,0.10)' }} />
                    {/* Sidebar section label */}
                    <div className="px-3 pb-2 mb-1">
                        <div className="text-[8px] font-black uppercase tracking-[0.2em] text-[#7b9fef]/30">Menü</div>
                    </div>

                    {authorizedTabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-semibold transition-all duration-250 group relative overflow-hidden
                                ${activeTab === tab.id
                                    ? 'text-white'
                                    : 'text-gray-500 hover:text-gray-300'
                                }
                            `}
                            style={activeTab === tab.id ? {} : {}}
                        >
                            {/* Active tab glow */}
                            {activeTab === tab.id && (
                                <>
                                    <div className="absolute inset-0 rounded-xl" style={{ background: 'linear-gradient(135deg, rgba(123,159,239,0.12), rgba(90,127,212,0.04))' }} />
                                    <div className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full" style={{ background: 'linear-gradient(180deg, #a3bfff, #5a7fd4)', boxShadow: '0 0 10px rgba(123,159,239,0.4)' }} />
                                </>
                            )}
                            {/* Hover background */}
                            {activeTab !== tab.id && (
                                <div className="absolute inset-0 rounded-xl bg-white/0 group-hover:bg-white/[0.02] transition-colors duration-200" />
                            )}
                            <tab.icon className={`w-4 h-4 relative z-10 transition-colors duration-200 ${activeTab === tab.id ? 'text-[#a3bfff]' : 'text-gray-600 group-hover:text-gray-400'}`} />
                            <span className="relative z-10">{tab.label}</span>
                        </button>
                    ))}

                    {/* Sidebar footer */}
                    <div className="flex-1" />
                    <div className="px-2 pt-3 mt-2" style={{ borderTop: '1px solid rgba(123,159,239,0.05)' }}>
                        <div className="flex items-center gap-2 px-2 py-2">
                            <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(123,159,239,0.15), rgba(90,127,212,0.08))', border: '1px solid rgba(123,159,239,0.12)' }}>
                                <Settings className="w-3 h-3 text-[#7b9fef]/50" />
                            </div>
                            <div>
                                <div className="text-[9px] font-bold text-gray-600">SopranoChat</div>
                                <div className="text-[7px] text-[#7b9fef]/30 font-medium tracking-wider">ADMIN PANEL</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Content Area ── */}
                <div className="flex-1 relative overflow-hidden flex flex-col" style={{ background: 'linear-gradient(180deg, rgba(12,15,24,0.3) 0%, transparent 40%)' }}>
                    {/* Top gold accent line */}
                    <div className="absolute inset-x-0 top-0 h-[1px] z-10" style={{ background: 'linear-gradient(90deg, transparent, rgba(123,159,239,0.08), transparent)' }} />

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
}
