'use client';

import { useEffect, useState, useRef, ReactNode } from 'react';

interface MacWindowProps {
    children: ReactNode;
    title?: string;
    subtitle?: string;
    onClose?: () => void;
}

/**
 * MacOS-tarzı yüzen pencere bileşeni.
 * - Rounded corners (yumuşatılmış köşeler)
 * - Traffic light butonları (kırmızı/sarı/yeşil)
 * - Glassmorphism (buzlu cam efekti)
 * - Derin gölge (havada asılı durma hissi)
 * - Spring/bounce açılma animasyonu
 * - Arkaplan dimming (odak pencereye kayar)
 */
export function MacWindow({ children, title = 'SopranoChat', subtitle, onClose }: MacWindowProps) {
    const [isVisible, setIsVisible] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [isMaximized, setIsMaximized] = useState(false);
    const windowRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Kısa gecikme sonrası spring animasyonunu tetikle
        const timer = setTimeout(() => setIsVisible(true), 50);
        return () => clearTimeout(timer);
    }, []);

    const handleClose = () => {
        setIsVisible(false);
        setTimeout(() => {
            onClose?.();
            // Popup pencere ise kapat, değilse ana sayfaya yönlendir
            if (window.opener) {
                window.close();
            } else {
                window.location.href = '/';
            }
        }, 300);
    };

    const handleMinimize = () => {
        setIsMinimized(true);
        setTimeout(() => setIsMinimized(false), 600);
    };

    const handleMaximize = () => {
        setIsMaximized(!isMaximized);
    };

    return (
        <>
            {/* Dim overlay — arka planı karart */}
            <div
                className={`mac-window-overlay ${isVisible ? 'visible' : ''}`}
                onClick={handleClose}
            />

            {/* Ana pencere */}
            <div
                ref={windowRef}
                className={`mac-window ${isVisible ? 'visible' : ''} ${isMinimized ? 'minimized' : ''} ${isMaximized ? 'maximized' : ''}`}
            >
                {/* Title Bar — sürüklenebilir alan */}
                <div className="mac-titlebar">
                    {/* Traffic Light Butonları */}
                    <div className="mac-traffic-lights">
                        <button
                            className="mac-tl-btn mac-tl-close"
                            onClick={handleClose}
                            title="Kapat"
                        >
                            <svg viewBox="0 0 12 12" width="10" height="10">
                                <path d="M3.5 3.5L8.5 8.5M8.5 3.5L3.5 8.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                            </svg>
                        </button>
                        <button
                            className="mac-tl-btn mac-tl-minimize"
                            onClick={handleMinimize}
                            title="Küçült"
                        >
                            <svg viewBox="0 0 12 12" width="10" height="10">
                                <path d="M2.5 6H9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                            </svg>
                        </button>
                        <button
                            className="mac-tl-btn mac-tl-maximize"
                            onClick={handleMaximize}
                            title={isMaximized ? 'Küçült' : 'Tam Ekran'}
                        >
                            <svg viewBox="0 0 12 12" width="10" height="10">
                                {isMaximized ? (
                                    <>
                                        <path d="M3 8L3 4.5C3 3.67 3.67 3 4.5 3H8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" fill="none" />
                                        <path d="M9 4L9 7.5C9 8.33 8.33 9 7.5 9H4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" fill="none" />
                                    </>
                                ) : (
                                    <>
                                        <path d="M2 7.5L4.5 10L10 4.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                                    </>
                                )}
                            </svg>
                        </button>
                    </div>

                    {/* Pencere Başlığı */}
                    <div className="mac-title-text">
                        <span className="mac-title-main">{title}</span>
                        {subtitle && (
                            <span className="mac-title-sub"> — {subtitle}</span>
                        )}
                    </div>

                    {/* Spacer  */}
                    <div className="mac-titlebar-spacer" />
                </div>

                {/* İçerik alanı */}
                <div className="mac-window-content">
                    {children}
                </div>
            </div>
        </>
    );
}

/**
 * Odayı popup pencerede açar (fallback — PWA dışı kullanım için).
 */
export function openChatWindow(roomSlug: string, tenantSlug?: string): Window | null {
    const url = tenantSlug ? `/t/${tenantSlug}/room/${roomSlug}` : `/room/${roomSlug}`;

    // Zaten popup penceredeyse, aynı pencerede yönlendir (popup içinden popup açma)
    if (window.opener) {
        window.location.href = url;
        return null;
    }

    const width = Math.max(1200, Math.round(screen.availWidth * 0.72));
    const height = Math.max(900, Math.round(screen.availHeight * 0.9));
    const left = Math.round((screen.availWidth - width) / 2);
    const top = Math.round((screen.availHeight - height) / 2);

    const features = [
        `width=${width}`,
        `height=${height}`,
        `left=${left}`,
        `top=${top}`,
        'popup=yes',
        'resizable=yes',
        'scrollbars=no',
        'toolbar=no',
        'menubar=no',
        'location=no',
        'status=no',
    ].join(',');

    const win = window.open(url, '_blank', features);
    if (win) {
        win.focus();
        return win;
    }

    window.location.href = url;
    return null;
}
