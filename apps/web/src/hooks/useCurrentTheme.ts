"use client";

import { useState, useEffect } from 'react';

/**
 * Returns the current theme id from data-theme attribute.
 * Re-syncs on localStorage changes (theme switch).
 */
export function useCurrentTheme(): string {
    const [theme, setTheme] = useState('modern');

    useEffect(() => {
        const read = () => document.documentElement.getAttribute('data-theme') || 'modern';
        setTheme(read());

        // Listen for theme changes via storage events and MutationObserver
        const observer = new MutationObserver(() => setTheme(read()));
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

        return () => observer.disconnect();
    }, []);

    return theme;
}
