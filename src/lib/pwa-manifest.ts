export const pwaManifest = {
	name: 'Punttikuuri',
	short_name: 'Punttikuuri',
	description: 'Gym Workout Logger',
	theme_color: '#2563eb',
	background_color: '#ffffff',
	display: 'standalone' as const,
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
};
