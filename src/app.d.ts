// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			user: {
				id: number;
				username: string;
				locale: string;
				theme: string;
			} | null;
			locale: 'en' | 'fi';
			theme: string;
		}
		interface PageData {
			locale: 'en' | 'fi';
			theme: string;
		}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
