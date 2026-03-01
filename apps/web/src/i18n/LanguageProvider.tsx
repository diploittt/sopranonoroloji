"use client";

import React, { createContext, useContext, useMemo, useState, useEffect } from 'react';
import { getTranslations } from '@/i18n';
import type { Translations, TranslationKeys } from '@/i18n';

interface LanguageContextValue {
    lang: string;
    t: Translations;
    setLanguage: (lang: string) => void;
}

const LanguageContext = createContext<LanguageContextValue>({
    lang: 'tr',
    t: getTranslations('tr'),
    setLanguage: () => { },
});

interface LanguageProviderProps {
    lang: string;
    children: React.ReactNode;
}

export function LanguageProvider({ lang: serverLang, children }: LanguageProviderProps) {
    // localStorage override takes priority over server default
    const [lang, setLangState] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('soprano_language') || serverLang;
        }
        return serverLang;
    });

    // Sync with server lang changes (e.g. admin changed default)
    useEffect(() => {
        const saved = localStorage.getItem('soprano_language');
        if (!saved) {
            setLangState(serverLang);
        }
    }, [serverLang]);

    const setLanguage = (newLang: string) => {
        localStorage.setItem('soprano_language', newLang);
        setLangState(newLang);
        // Also update document lang
        document.documentElement.lang = newLang;
    };

    const value = useMemo(() => ({
        lang,
        t: getTranslations(lang),
        setLanguage,
    }), [lang]);

    return (
        <LanguageContext.Provider value={value}>
            {children}
        </LanguageContext.Provider>
    );
}

/**
 * Hook to access translations.
 * Usage: const { t, lang, setLanguage } = useTranslation();
 *        t.send → "GÖNDER" | "SEND" | "SENDEN"
 *        setLanguage('en') → switches to English instantly
 */
export function useTranslation() {
    return useContext(LanguageContext);
}
