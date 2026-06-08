import en from './en.json';
import fi from './fi.json';

const translations: Record<string, Record<string, string>> = { en, fi };

export type Locale = 'en' | 'fi';

export function t(key: string, locale: Locale = 'en'): string {
	const dict = translations[locale];
	if (!dict) return key;
	return dict[key] ?? key;
}

export function getLocaleFromAcceptLanguage(header: string | null): Locale {
	if (!header) return 'en';
	if (header.startsWith('fi') || header.startsWith('fi-FI')) return 'fi';
	return 'en';
}
