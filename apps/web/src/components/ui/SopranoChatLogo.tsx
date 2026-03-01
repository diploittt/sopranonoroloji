"use client";

import React from "react";

/**
 * SopranoChat Brand Logo — Modern Two-Tone Wordmark
 * 
 * Usage:
 *   <SopranoChatLogo />                         — full wordmark
 *   <SopranoChatLogo variant="icon" />           — just the S icon
 *   <SopranoChatLogo variant="wordmark" />       — just the text
 *   <SopranoChatLogo size="sm" />                — small
 *   <SopranoChatLogo size="lg" />                — large
 *   <SopranoChatLogo animated />                 — with hover effects
 *   <SopranoChatLogo showTagline />              — with "Senin Sesin"
 */

interface SopranoChatLogoProps {
    variant?: "full" | "icon" | "wordmark";
    size?: "sm" | "md" | "lg" | "xl";
    animated?: boolean;
    showTagline?: boolean;
    className?: string;
    style?: React.CSSProperties;
}

const SIZES = {
    sm: { sopranoFont: 18, chatFont: 18, iconSize: 22, tagSize: 7, gap: 2, iconStroke: 1.8 },
    md: { sopranoFont: 24, chatFont: 24, iconSize: 28, tagSize: 8, gap: 3, iconStroke: 2 },
    lg: { sopranoFont: 34, chatFont: 34, iconSize: 38, tagSize: 10, gap: 4, iconStroke: 2.2 },
    xl: { sopranoFont: 44, chatFont: 44, iconSize: 48, tagSize: 12, gap: 5, iconStroke: 2.5 },
};

/** Modern S icon with sound wave */
function SIcon({ size = 28, stroke = 2, id = "sc" }: { size?: number; stroke?: number; id?: string }) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 48 48"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{ flexShrink: 0 }}
        >
            <defs>
                <linearGradient id={`${id}Grad`} x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#06b6d4" />
                    <stop offset="100%" stopColor="#14b8a6" />
                </linearGradient>
            </defs>
            {/* Background circle */}
            <circle cx="24" cy="24" r="22" fill="rgba(6,182,212,0.08)" stroke="rgba(6,182,212,0.2)" strokeWidth="1" />
            {/* Sound wave arcs */}
            <path d="M16 24c0-6 3.5-10 8-10s8 4 8 10-3.5 10-8 10-8-4-8-10" stroke={`url(#${id}Grad)`} strokeWidth={stroke} strokeLinecap="round" fill="none" opacity="0.3" />
            <path d="M19 24c0-4 2.2-7 5-7s5 3 5 7-2.2 7-5 7-5-3-5-7" stroke={`url(#${id}Grad)`} strokeWidth={stroke} strokeLinecap="round" fill="none" opacity="0.5" />
            {/* Center dot */}
            <circle cx="24" cy="24" r="2.5" fill="#06b6d4">
                <animate attributeName="opacity" values="0.6;1;0.6" dur="2s" repeatCount="indefinite" />
            </circle>
            <circle cx="24" cy="24" r="1" fill="#fff" opacity="0.8" />
            {/* Stylized S */}
            <path d="M20 18.5c0 0,2-2,4-2s4,1.5,4,3.5-2,3-4,3.5-4,1.5-4,3.5,2,3.5,4,3.5,4-2,4-2" stroke="white" strokeWidth={stroke} strokeLinecap="round" fill="none" opacity="0.9" />
        </svg>
    );
}

export default function SopranoChatLogo({
    variant = "full",
    size = "md",
    animated = false,
    showTagline = false,
    className = "",
    style,
}: SopranoChatLogoProps) {
    const s = SIZES[size];

    const containerStyle: React.CSSProperties = {
        display: "inline-flex",
        alignItems: "center",
        gap: s.gap,
        cursor: "default",
        userSelect: "none",
        position: "relative",
        ...style,
    };

    const wrapClass = `soprano-logo ${animated ? "soprano-logo-animated" : ""} ${className}`;

    return (
        <>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap');
                .soprano-logo { transition: filter 0.4s ease, transform 0.4s ease; }
                ${animated ? `
                .soprano-logo-animated:hover {
                    filter: drop-shadow(0 0 24px rgba(6,182,212,0.25)) drop-shadow(0 0 8px rgba(6,182,212,0.15));
                    transform: translateY(-1px);
                }` : ''}
                @keyframes scLogoShimmer {
                    0% { background-position: 200% center; }
                    100% { background-position: -200% center; }
                }
            `}</style>
            <div className={wrapClass} style={containerStyle}>
                {variant !== "wordmark" && variant === "icon" && <SIcon size={s.iconSize} stroke={s.iconStroke} id={`sc${size}`} />}
                {variant !== "icon" && (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", position: "relative" }}>
                        {/* Wordmark */}
                        <div style={{
                            display: 'flex', alignItems: 'baseline',
                            filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.3))',
                            flexShrink: 0, position: 'relative', zIndex: 1,
                            gap: s.gap + 1,
                        }}>
                            {/* "Soprano" — white, clean */}
                            <span style={{
                                fontFamily: "'Plus Jakarta Sans', 'Inter', system-ui, sans-serif",
                                fontWeight: 800,
                                fontSize: s.sopranoFont,
                                lineHeight: 1,
                                letterSpacing: '-0.02em',
                                color: '#ffffff',
                            }}>
                                Soprano
                            </span>
                            {/* "Chat" — turkuaz gradient */}
                            <span style={{
                                fontFamily: "'Plus Jakarta Sans', 'Inter', system-ui, sans-serif",
                                fontWeight: 700,
                                fontSize: s.chatFont,
                                lineHeight: 1,
                                letterSpacing: '-0.01em',
                                background: 'linear-gradient(135deg, #06b6d4, #14b8a6, #22d3ee)',
                                backgroundSize: '200% auto',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                backgroundClip: 'text',
                                animation: animated ? 'scLogoShimmer 4s ease-in-out infinite' : undefined,
                            }}>
                                Chat
                            </span>
                        </div>

                        {/* Tagline */}
                        {showTagline && (
                            <span style={{
                                fontFamily: "'Plus Jakarta Sans', 'Inter', system-ui, sans-serif",
                                fontSize: s.tagSize,
                                fontWeight: 600,
                                letterSpacing: "0.25em",
                                textTransform: "uppercase",
                                color: "rgba(6,182,212,0.4)",
                                marginTop: 4,
                                textAlign: "center",
                            }}>
                                Senin Sesin
                            </span>
                        )}
                    </div>
                )}
            </div>
        </>
    );
}

/** Standalone SVG export for favicon/external use */
export function SopranoChatSVGString() {
    return `<svg width="64" height="64" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
<defs>
<linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
<stop offset="0%" stop-color="#06b6d4"/>
<stop offset="100%" stop-color="#14b8a6"/>
</linearGradient>
</defs>
<circle cx="24" cy="24" r="22" fill="rgba(6,182,212,0.08)" stroke="rgba(6,182,212,0.2)" stroke-width="1"/>
<path d="M16 24c0-6 3.5-10 8-10s8 4 8 10-3.5 10-8 10-8-4-8-10" stroke="url(#g)" stroke-width="2" stroke-linecap="round" fill="none" opacity="0.3"/>
<path d="M19 24c0-4 2.2-7 5-7s5 3 5 7-2.2 7-5 7-5-3-5-7" stroke="url(#g)" stroke-width="2" stroke-linecap="round" fill="none" opacity="0.5"/>
<circle cx="24" cy="24" r="2.5" fill="#06b6d4" opacity="0.8"/>
<circle cx="24" cy="24" r="1" fill="#fff" opacity="0.8"/>
<path d="M20 18.5c0 0,2-2,4-2s4,1.5,4,3.5-2,3-4,3.5-4,1.5-4,3.5,2,3.5,4,3.5,4-2,4-2" stroke="white" stroke-width="2" stroke-linecap="round" fill="none" opacity="0.9"/>
</svg>`;
}
