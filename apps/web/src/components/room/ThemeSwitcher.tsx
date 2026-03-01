'use client';

import { useState, useEffect } from 'react';
import { Palette } from 'lucide-react';

type ThemeId = 'modern' | 'telegraph-1910' | 'midnight' | 'hasbihal-islamic';

const THEMES: { id: ThemeId; label: string; icon: string }[] = [
    { id: 'modern', label: 'Modern', icon: '🎨' },
];

export default function ThemeSwitcher() {
    const [theme, setTheme] = useState<ThemeId>('modern');
    const [mounted, setMounted] = useState(false);
    const [showPicker, setShowPicker] = useState(false);

    useEffect(() => {
        setMounted(true);
        const current = document.documentElement.getAttribute('data-theme') as ThemeId;
        if (current && THEMES.some(t => t.id === current)) {
            setTheme(current);
        } else {
            const saved = localStorage.getItem('soprano_user_theme') as ThemeId;
            if (saved && THEMES.some(t => t.id === saved)) {
                setTheme(saved);
                if (saved !== 'modern') {
                    document.documentElement.setAttribute('data-theme', saved);
                }
            }
        }

        const observer = new MutationObserver(() => {
            const updated = document.documentElement.getAttribute('data-theme') as ThemeId;
            if (updated && THEMES.some(t => t.id === updated)) {
                setTheme(updated);
            } else {
                setTheme('modern');
            }
        });
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
        return () => observer.disconnect();
    }, []);

    const switchTheme = (newTheme: ThemeId) => {
        setTheme(newTheme);
        localStorage.setItem('soprano_user_theme', newTheme);
        setShowPicker(false);


        if (newTheme === 'modern') {
            document.documentElement.removeAttribute('data-theme');
        } else {
            document.documentElement.setAttribute('data-theme', newTheme);
        }
    };

    if (!mounted) return null;

    const is1910 = theme === 'telegraph-1910';
    const isMidnight = theme === 'midnight';
    const isHasbihal = theme === 'hasbihal-islamic';

    const pickerBg = is1910
        ? '#e3d5b8'
        : isMidnight
            ? 'rgba(44,44,46,0.95)'
            : isHasbihal
                ? 'rgba(2,44,34,0.95)'
                : 'linear-gradient(135deg, #13151c, #1a1d28)';
    const pickerBorder = is1910
        ? '2px solid #2b2118'
        : isMidnight
            ? '1px solid rgba(255,255,255,0.15)'
            : isHasbihal
                ? '1px solid #7b9fef'
                : '1px solid rgba(255,255,255,0.1)';
    const pickerRadius = is1910 ? '4px' : isHasbihal ? '8px' : '12px';
    const titleColor = is1910
        ? '#2b2118'
        : isMidnight
            ? 'rgba(255,255,255,0.5)'
            : isHasbihal
                ? '#7b9fef'
                : 'rgba(255,255,255,0.4)';
    const titleFont = is1910
        ? "'Rye', serif"
        : isHasbihal
            ? "'Aref Ruqaa', serif"
            : "'Inter', sans-serif";

    return (
        <div className="theme-switcher-wrapper relative">
            <button
                onClick={() => setShowPicker(!showPicker)}
                className="relative group w-10 h-10 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center text-gray-400 hover:text-amber-400 hover:bg-amber-500/10 hover:border-amber-500/30 transition-all duration-300 shadow-lg"
                title="Tema Değiştir"
            >
                <Palette className="w-5 h-5 transition-transform group-hover:scale-110" />
            </button>

            {showPicker && (
                <>
                    <div className="fixed inset-0 z-[9998]" onClick={() => setShowPicker(false)} />

                    <div
                        className="theme-picker absolute bottom-full mb-2 right-0 z-[9999] min-w-[140px]"
                        style={{
                            background: pickerBg,
                            border: pickerBorder,
                            borderRadius: pickerRadius,
                            padding: '8px',
                            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                            backdropFilter: isMidnight ? 'blur(50px)' : undefined,
                        }}
                    >
                        <div
                            style={{
                                fontSize: '9px',
                                fontWeight: 700,
                                letterSpacing: '0.15em',
                                textTransform: 'uppercase',
                                textAlign: 'center',
                                marginBottom: '6px',
                                color: titleColor,
                                fontFamily: titleFont,
                            }}
                        >
                            TEMA
                        </div>
                        {THEMES.map((t) => {
                            const isActive = theme === t.id;
                            const activeBorder = is1910
                                ? '1px solid #2b2118'
                                : isMidnight
                                    ? '1px solid rgba(10,132,255,0.5)'
                                    : isHasbihal
                                        ? '1px solid #7b9fef'
                                        : '1px solid rgba(139,92,246,0.5)';
                            const activeBg = is1910
                                ? '#c5b08b'
                                : isMidnight
                                    ? 'rgba(10,132,255,0.2)'
                                    : isHasbihal
                                        ? 'rgba(123,159,239,0.2)'
                                        : 'rgba(139,92,246,0.2)';
                            const textColor = is1910
                                ? '#2b2118'
                                : isHasbihal
                                    ? (isActive ? '#7b9fef' : '#a3bfff')
                                    : isActive
                                        ? '#fff'
                                        : 'rgba(255,255,255,0.5)';

                            return (
                                <button
                                    key={t.id}
                                    onClick={() => switchTheme(t.id)}
                                    style={{
                                        display: 'block',
                                        width: '100%',
                                        padding: '6px 10px',
                                        marginBottom: '2px',
                                        borderRadius: is1910 ? '2px' : isHasbihal ? '4px' : '6px',
                                        fontSize: '11px',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        textAlign: 'left',
                                        border: isActive ? activeBorder : '1px solid transparent',
                                        background: isActive ? activeBg : 'transparent',
                                        color: textColor,
                                        fontFamily: t.id === 'telegraph-1910'
                                            ? "'Rye', serif"
                                            : t.id === 'hasbihal-islamic'
                                                ? "'Aref Ruqaa', serif"
                                                : "'Inter', sans-serif",
                                    }}
                                >
                                    {t.icon} {t.label}
                                </button>
                            );
                        })}
                    </div>
                </>
            )}
        </div>
    );
}
