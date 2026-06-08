import en from './en.json';
import fi from './fi.json';

const translations: Record<string, Record<string, string>> = { en, fi };

export type Locale = 'en' | 'fi';

export function t(key: string, locale: Locale = 'en'): string {
	const dict = translations[locale];
	if (!dict) return key;
	return dict[key] ?? key;
}
