// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			user: {
				id: number;
				username: string;
				locale: 'en' | 'fi';
				theme: 'light' | 'dark' | 'system';
			} | null;
			locale: 'en' | 'fi';
			theme: 'light' | 'dark' | 'system';
		}
		interface PageData {
			locale: 'en' | 'fi';
			theme: 'light' | 'dark' | 'system';
			logoLinkUrl: string;
			isAdmin: boolean;
		}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
