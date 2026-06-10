export const pwaManifest = {
	name: 'Punttikuuri',
	short_name: 'Punttikuuri',
	description: 'Gym Workout Logger',
	theme_color: '#d97706',
	background_color: '#fafaf9',
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
