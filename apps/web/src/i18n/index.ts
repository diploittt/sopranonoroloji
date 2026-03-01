export { default as tr } from './tr';
export { default as en } from './en';
export { default as de } from './de';
export type { TranslationKeys, Translations } from './tr';

import tr from './tr';
import en from './en';
import de from './de';
import type { Translations } from './tr';

const translations: Record<string, Translations> = { tr, en, de };

export function getTranslations(lang: string): Translations {
    return translations[lang] || translations.tr;
}
