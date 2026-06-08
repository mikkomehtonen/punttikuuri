import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vitest/config';
import { sveltekit } from '@sveltejs/kit/vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit(),
		SvelteKitPWA({
			registerType: 'autoUpdate',
			includeAssets: ['favicon.svg'],
			manifest: {
				name: 'Punttikuuri',
				short_name: 'Punttikuuri',
				description: 'Gym Workout Logger',
				theme_color: '#2563eb',
				background_color: '#ffffff',
				display: 'standalone',
				scope: '/',
				start_url: '/exercises',
				icons: [
					{
						src: 'favicon.svg',
						sizes: 'any',
						type: 'image/svg+xml',
						purpose: 'any maskable'
					}
				]
			},
			workbox: {
				globPatterns: ['**/*.{js,css,html,svg,png,ico,json}']
			}
		})
	],
	test: {
		expect: { requireAssertions: true },
		projects: [
			{
				extends: './vite.config.ts',
				test: {
					name: 'server',
					environment: 'node',
					include: ['src/**/*.{test,spec}.{js,ts}'],
					exclude: ['src/**/*.svelte.{test,spec}.{js,ts}']
				}
			},
			{
				extends: './vite.config.ts',
				test: {
					name: 'browser',
					environment: 'jsdom',
					environmentOptions: {
						html: '<!doctype html><html><body></body></html>'
					},
					include: ['src/**/*.svelte.{test,spec}.{js,ts}'],
					setupFiles: ['src/test-setup.ts']
				}
			}
		]
	}
});
