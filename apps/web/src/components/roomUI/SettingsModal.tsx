"use client";

import { RefreshCw, Mic, Video, Volume2, Play, ChevronDown, Globe, Type, Palette } from 'lucide-react';
import { useEffect, useRef, useState, useCallback } from 'react';
import { AnchorPopover } from '@/components/ui/AnchorPopover';
import { useTranslation } from '@/i18n/LanguageProvider';

interface DeviceList {
    videoInputs: MediaDeviceInfo[];
    audioInputs: MediaDeviceInfo[];
    audioOutputs: MediaDeviceInfo[];
}

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    anchorRef: React.RefObject<HTMLElement | null>;
    availableDevices: DeviceList;
    selectedVideoDeviceId: string | null;
    selectedAudioDeviceId: string | null;
    onRefreshDevices: () => void;
    onSelectVideoDevice: (deviceId: string) => void;
    onSelectAudioDevice: (deviceId: string) => void;
    cameraStream: MediaStream | null;
    // Language
    currentLanguage?: string;
    onLanguageChange?: (lang: string) => void;
}

const LANGUAGE_OPTIONS = [
    { value: 'tr', label: 'Türkçe', flag: '🇹🇷' },
    { value: 'en', label: 'English', flag: '🇬🇧' },
    { value: 'de', label: 'Deutsch', flag: '🇩🇪' },
];

const FONT_WEIGHT_OPTIONS = [
    { value: '400', label: 'Normal' },
    { value: '500', label: 'Orta' },
    { value: '600', label: 'Kalın' },
    { value: '700', label: 'Çok Kalın' },
];

const PRESET_COLORS = [
    'rgba(255,255,255,0.9)',
    '#a3bfff',
    '#fbbf24',
    '#4ade80',
    '#f87171',
    '#c084fc',
    '#fb923c',
    '#22d3ee',
];

// ─── Chat Text Settings (localStorage) ─────────────
function getChatTextSettings() {
    try {
        const raw = localStorage.getItem('soprano_chat_text_settings');
        if (raw) return JSON.parse(raw);
    } catch { }
    return { fontSize: 13, fontWeight: '400', textColor: 'rgba(255,255,255,0.9)' };
}
function saveChatTextSettings(s: { fontSize: number; fontWeight: string; textColor: string }) {
    localStorage.setItem('soprano_chat_text_settings', JSON.stringify(s));
    window.dispatchEvent(new Event('chatTextSettingsChanged'));
}

export function SettingsModal({
    isOpen,
    onClose,
    availableDevices,
    selectedVideoDeviceId,
    selectedAudioDeviceId,
    onRefreshDevices,
    onSelectVideoDevice,
    onSelectAudioDevice,
    anchorRef,
    currentLanguage = 'tr',
    onLanguageChange,
}: SettingsModalProps) {
    const audioMeterRef = useRef<HTMLDivElement>(null);
    const { t, lang, setLanguage } = useTranslation();

    // Audio Output State
    const [selectedOutputId, setSelectedOutputId] = useState<string>('');
    const [isSinkSupported, setIsSinkSupported] = useState<boolean>(true);

    // Test States
    const [isTestingMic, setIsTestingMic] = useState(false);
    const micContextRef = useRef<AudioContext | null>(null);
    const micSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const micAnalyserRef = useRef<AnalyserNode | null>(null);
    const animationFrameRef = useRef<number | null>(null);

    // Chat Text Settings
    const [chatText, setChatText] = useState(getChatTextSettings);

    const updateChatText = useCallback((key: string, value: any) => {
        setChatText((prev: any) => {
            const next = { ...prev, [key]: value };
            saveChatTextSettings(next);
            return next;
        });
    }, []);

    // Active tab
    const [activeTab, setActiveTab] = useState<'devices' | 'text'>('devices');

    // Initial refresh on open
    useEffect(() => {
        if (isOpen) {
            onRefreshDevices();
            const element = document.createElement('audio');
            setIsSinkSupported('setSinkId' in element);
            const savedOutput = sessionStorage.getItem('speakerDeviceId');
            if (savedOutput) setSelectedOutputId(savedOutput);
            startMicTest();
        } else {
            stopMicTest();
        }
    }, [isOpen]);

    useEffect(() => {
        if (isOpen && isTestingMic) {
            startMicTest();
        }
    }, [selectedAudioDeviceId]);

    const handleOutputSelect = async (deviceId: string) => {
        setSelectedOutputId(deviceId);
        sessionStorage.setItem('speakerDeviceId', deviceId);
    };

    // --- TEST FUNCTIONS ---
    const testSpeaker = async () => {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = ctx.createOscillator();
        const dest = ctx.createMediaStreamDestination();
        osc.connect(dest);
        osc.start();
        osc.stop(0.5);
        const audio = new Audio();
        audio.srcObject = dest.stream;
        if (isSinkSupported && selectedOutputId) {
            try { await (audio as any).setSinkId(selectedOutputId); } catch (e) { console.error("Set Sink ID failed", e); }
        }
        audio.play();
    };

    const startMicTest = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: selectedAudioDeviceId ? { deviceId: { exact: selectedAudioDeviceId } } : true,
                video: false
            });
            if (micContextRef.current) micContextRef.current.close();
            const ctx = new AudioContext();
            const source = ctx.createMediaStreamSource(stream);
            const analyser = ctx.createAnalyser();
            analyser.fftSize = 256;
            source.connect(analyser);
            micContextRef.current = ctx;
            micSourceRef.current = source;
            micAnalyserRef.current = analyser;
            setIsTestingMic(true);
            drawMicLevel();
        } catch (e) {
            console.error("Mic test failed", e);
            setIsTestingMic(false);
        }
    };

    const stopMicTest = () => {
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        if (micSourceRef.current) {
            micSourceRef.current.disconnect();
            micSourceRef.current.mediaStream.getTracks().forEach(t => t.stop());
        }
        if (micContextRef.current) micContextRef.current.close();
        micSourceRef.current = null;
        micAnalyserRef.current = null;
        micContextRef.current = null;
        setIsTestingMic(false);
    };

    const drawMicLevel = () => {
        if (!micAnalyserRef.current || !audioMeterRef.current) return;
        const array = new Uint8Array(micAnalyserRef.current.frequencyBinCount);
        micAnalyserRef.current.getByteFrequencyData(array);
        const info = array.reduce((a, b) => a + b) / array.length;
        const width = Math.min(100, (info / 128) * 100);
        audioMeterRef.current.style.width = `${width}%`;
        if (width > 50) {
            audioMeterRef.current.style.boxShadow = `0 0 ${width / 2}px rgba(123, 159, 239, 0.8)`;
        } else {
            audioMeterRef.current.style.boxShadow = 'none';
        }
        animationFrameRef.current = requestAnimationFrame(drawMicLevel);
    };

    if (!isOpen) return null;

    // ─── Shared Styles ─────────────────────────────────
    const sectionStyle: React.CSSProperties = {
        padding: '10px 14px',
        borderRadius: 10,
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(123,159,239,0.06)',
    };

    const labelStyle: React.CSSProperties = {
        display: 'flex', alignItems: 'center', gap: 6,
        fontSize: 10, fontWeight: 700, color: '#a3bfff',
        textTransform: 'uppercase', letterSpacing: '0.06em',
        marginBottom: 6,
    };

    const selectWrapStyle: React.CSSProperties = {
        position: 'relative',
    };

    const selectStyle: React.CSSProperties = {
        width: '100%',
        background: 'rgba(30,41,59,0.5)',
        color: '#e8dcc8',
        fontSize: 12,
        fontWeight: 500,
        borderRadius: 8,
        padding: '8px 32px 8px 32px',
        border: '1px solid rgba(255,255,255,0.1)',
        outline: 'none',
        appearance: 'none' as any,
        cursor: 'pointer',
        transition: 'all 0.25s',
    };

    const dotStyle: React.CSSProperties = {
        position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
        width: 6, height: 6, borderRadius: '50%',
        background: '#22c55e',
        boxShadow: '0 0 6px rgba(34,197,94,0.5)',
        pointerEvents: 'none',
    };

    const chevStyle: React.CSSProperties = {
        position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
        width: 14, height: 14, color: '#6b7280', pointerEvents: 'none',
    };

    const tabStyle = (active: boolean): React.CSSProperties => ({
        flex: 1, padding: '6px 0', borderRadius: 6,
        fontSize: 11, fontWeight: 700, cursor: 'pointer',
        background: active ? 'rgba(123,159,239,0.15)' : 'transparent',
        color: active ? '#a3bfff' : '#6b7280',
        border: active ? '1px solid rgba(123,159,239,0.2)' : '1px solid transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
        transition: 'all 0.25s',
        textTransform: 'uppercase', letterSpacing: '0.04em',
    });

    return (
        <AnchorPopover
            targetRef={anchorRef}
            isOpen={isOpen}
            onClose={onClose}
            variant="panel"
            title={t.settings}
        >
            <div className="w-full flex flex-col overflow-hidden" style={{ minWidth: 310, maxWidth: 380 }}>
                {/* ─── Tabs ─── */}
                <div style={{ display: 'flex', gap: 4, padding: '0 14px 8px', borderBottom: '1px solid rgba(123,159,239,0.06)' }}>
                    <button style={tabStyle(activeTab === 'devices')} onClick={() => setActiveTab('devices')}>
                        <Video style={{ width: 12, height: 12 }} /> Cihazlar
                    </button>
                    <button style={tabStyle(activeTab === 'text')} onClick={() => setActiveTab('text')}>
                        <Type style={{ width: 12, height: 12 }} /> Yazı Ayarları
                    </button>
                </div>

                <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 8, overflowY: 'auto', maxHeight: 520 }}>

                    {activeTab === 'devices' && (
                        <>
                            {/* ═══ Camera ═══ */}
                            <div style={sectionStyle}>
                                <div style={labelStyle}>
                                    <Video style={{ width: 13, height: 13 }} />
                                    {t.cameraDevice}
                                </div>
                                <div style={selectWrapStyle}>
                                    <select
                                        value={selectedVideoDeviceId || ''}
                                        onChange={(e) => onSelectVideoDevice(e.target.value)}
                                        style={selectStyle}
                                    >
                                        <option value="">{t.cameraDevice}...</option>
                                        {availableDevices.videoInputs.map((device) => (
                                            <option key={device.deviceId} value={device.deviceId}>
                                                {device.label || `${t.cameraDevice} ${device.deviceId.substring(0, 5)}...`}
                                            </option>
                                        ))}
                                    </select>
                                    <div style={dotStyle} />
                                    <ChevronDown style={chevStyle} />
                                </div>
                            </div>

                            {/* ═══ Microphone ═══ */}
                            <div style={sectionStyle}>
                                <div style={labelStyle}>
                                    <Mic style={{ width: 13, height: 13 }} />
                                    {t.microphone}
                                </div>
                                <div style={selectWrapStyle}>
                                    <select
                                        value={selectedAudioDeviceId || ''}
                                        onChange={(e) => onSelectAudioDevice(e.target.value)}
                                        style={selectStyle}
                                    >
                                        <option value="">{t.microphone}...</option>
                                        {availableDevices.audioInputs.map((device) => (
                                            <option key={device.deviceId} value={device.deviceId}>
                                                {device.label || `${t.microphone} ${device.deviceId.substring(0, 5)}...`}
                                            </option>
                                        ))}
                                    </select>
                                    <div style={dotStyle} />
                                    <ChevronDown style={chevStyle} />
                                </div>
                                {/* Mic Meter */}
                                <div style={{ marginTop: 8, height: 4, borderRadius: 4, background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                                    <div ref={audioMeterRef} style={{ height: '100%', width: 0, background: 'linear-gradient(90deg, #5a7fd4, #7b9fef, #a3bfff)', borderRadius: 4, transition: 'width 75ms ease-out' }} />
                                </div>
                            </div>

                            {/* ═══ Speaker ═══ */}
                            <div style={sectionStyle}>
                                <div style={labelStyle}>
                                    <Volume2 style={{ width: 13, height: 13 }} />
                                    {t.speaker}
                                </div>
                                <div style={{ display: 'flex', gap: 6 }}>
                                    <div style={{ ...selectWrapStyle, flex: 1 }}>
                                        {!isSinkSupported ? (
                                            <div style={{ padding: '8px 12px', background: 'rgba(251,146,60,0.1)', color: '#fbbf24', fontSize: 11, borderRadius: 8, border: '1px solid rgba(251,146,60,0.2)' }}>
                                                Not Supported
                                            </div>
                                        ) : (
                                            <>
                                                <select
                                                    value={selectedOutputId || ''}
                                                    onChange={(e) => handleOutputSelect(e.target.value)}
                                                    style={selectStyle}
                                                >
                                                    <option value="">{t.speaker}...</option>
                                                    {availableDevices.audioOutputs.map((device) => (
                                                        <option key={device.deviceId} value={device.deviceId}>
                                                            {device.label || `${t.speaker} ${device.deviceId.substring(0, 5)}...`}
                                                        </option>
                                                    ))}
                                                </select>
                                                <div style={dotStyle} />
                                                <ChevronDown style={chevStyle} />
                                            </>
                                        )}
                                    </div>
                                    <button
                                        onClick={testSpeaker}
                                        style={{
                                            padding: '0 12px', borderRadius: 8,
                                            background: 'rgba(123,159,239,0.08)',
                                            border: '1px solid rgba(123,159,239,0.12)',
                                            color: '#a3bfff', cursor: 'pointer',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            transition: 'all 0.25s',
                                        }}
                                        title="Test"
                                    >
                                        <Play style={{ width: 14, height: 14, fill: 'currentColor' }} />
                                    </button>
                                </div>
                            </div>

                            {/* ═══ Language ═══ */}
                            <div style={sectionStyle}>
                                <div style={{ ...labelStyle, color: '#4ade80' }}>
                                    <Globe style={{ width: 13, height: 13 }} />
                                    Language / Dil
                                </div>
                                <div style={selectWrapStyle}>
                                    <select
                                        value={lang}
                                        onChange={(e) => {
                                            setLanguage(e.target.value);
                                            onLanguageChange?.(e.target.value);
                                        }}
                                        style={{ ...selectStyle, borderColor: 'rgba(74,222,128,0.15)' }}
                                    >
                                        {LANGUAGE_OPTIONS.map((opt) => (
                                            <option key={opt.value} value={opt.value}>
                                                {opt.flag} {opt.label}
                                            </option>
                                        ))}
                                    </select>
                                    <Globe style={{ ...chevStyle, left: 10, right: 'auto', width: 13, height: 13, color: '#4ade80' }} />
                                    <ChevronDown style={chevStyle} />
                                </div>
                            </div>
                        </>
                    )}

                    {activeTab === 'text' && (
                        <>
                            {/* ═══ Font Size ═══ */}
                            <div style={sectionStyle}>
                                <div style={labelStyle}>
                                    <Type style={{ width: 13, height: 13 }} />
                                    Yazı Boyutu
                                    <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 700, color: '#7b9fef', fontFamily: 'monospace', background: 'rgba(123,159,239,0.1)', padding: '1px 6px', borderRadius: 4 }}>
                                        {chatText.fontSize}px
                                    </span>
                                </div>
                                <input
                                    type="range" min={10} max={22} value={chatText.fontSize}
                                    onChange={e => updateChatText('fontSize', Number(e.target.value))}
                                    style={{ width: '100%', accentColor: '#7b9fef', height: 5, cursor: 'pointer' }}
                                />
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#6b7280', marginTop: 2 }}>
                                    <span>10px</span><span>22px</span>
                                </div>
                            </div>

                            {/* ═══ Font Weight ═══ */}
                            <div style={sectionStyle}>
                                <div style={labelStyle}>
                                    <Type style={{ width: 13, height: 13, strokeWidth: 3 }} />
                                    Yazı Kalınlığı
                                </div>
                                <div style={{ display: 'flex', gap: 4 }}>
                                    {FONT_WEIGHT_OPTIONS.map(opt => (
                                        <button
                                            key={opt.value}
                                            onClick={() => updateChatText('fontWeight', opt.value)}
                                            style={{
                                                flex: 1,
                                                padding: '5px 0',
                                                borderRadius: 6,
                                                fontSize: 10,
                                                fontWeight: Number(opt.value) as any,
                                                cursor: 'pointer',
                                                background: chatText.fontWeight === opt.value ? 'rgba(123,159,239,0.15)' : 'rgba(255,255,255,0.03)',
                                                color: chatText.fontWeight === opt.value ? '#a3bfff' : '#9ca3af',
                                                border: chatText.fontWeight === opt.value ? '1px solid rgba(123,159,239,0.25)' : '1px solid rgba(255,255,255,0.06)',
                                                transition: 'all 0.2s',
                                            }}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* ═══ Text Color ═══ */}
                            <div style={sectionStyle}>
                                <div style={labelStyle}>
                                    <Palette style={{ width: 13, height: 13 }} />
                                    Yazı Rengi
                                </div>
                                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                    {PRESET_COLORS.map(c => (
                                        <button
                                            key={c}
                                            onClick={() => updateChatText('textColor', c)}
                                            style={{
                                                width: 26, height: 26, borderRadius: 6,
                                                background: c,
                                                border: chatText.textColor === c ? '2px solid #a3bfff' : '2px solid rgba(255,255,255,0.08)',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s',
                                                boxShadow: chatText.textColor === c ? '0 0 8px rgba(123,159,239,0.4)' : 'none',
                                            }}
                                            title={c}
                                        />
                                    ))}
                                    <div style={{ position: 'relative' }}>
                                        <input
                                            type="color"
                                            value={chatText.textColor.startsWith('rgba') ? '#ffffff' : chatText.textColor}
                                            onChange={e => updateChatText('textColor', e.target.value)}
                                            style={{
                                                width: 26, height: 26, borderRadius: 6,
                                                border: '2px dashed rgba(123,159,239,0.3)',
                                                background: 'rgba(255,255,255,0.03)',
                                                cursor: 'pointer', padding: 0,
                                            }}
                                            title="Özel renk"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* ═══ Live Preview ═══ */}
                            <div style={{
                                ...sectionStyle,
                                background: 'rgba(30,41,59,0.4)',
                                border: '1px solid rgba(255,255,255,0.08)',
                            }}>
                                <div style={{ ...labelStyle, color: '#6b7280', fontSize: 9 }}>
                                    ÖN İZLEME
                                </div>
                                <div style={{
                                    padding: '8px 12px',
                                    borderRadius: 8,
                                    background: 'rgba(123,159,239,0.05)',
                                    border: '1px solid rgba(123,159,239,0.08)',
                                }}>
                                    <span style={{
                                        fontSize: chatText.fontSize,
                                        fontWeight: Number(chatText.fontWeight),
                                        color: chatText.textColor,
                                        lineHeight: 1.5,
                                    }}>
                                        Bu bir örnek mesajdır. 👋
                                    </span>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* Footer */}
                <div style={{
                    padding: '8px 14px',
                    borderTop: '1px solid rgba(123,159,239,0.04)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                    <button
                        onClick={onRefreshDevices}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 5,
                            fontSize: 9, fontWeight: 700, color: '#6b7280',
                            textTransform: 'uppercase', letterSpacing: '0.06em',
                            background: 'none', border: 'none', cursor: 'pointer',
                            transition: 'color 0.2s',
                        }}
                    >
                        <RefreshCw style={{ width: 10, height: 10 }} />
                        {t.settings}
                    </button>
                </div>
            </div>
        </AnchorPopover>
    );
}
