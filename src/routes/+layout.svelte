<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import { t } from '$lib/i18n';
	import type { Locale } from '$lib/i18n';
	import type { LayoutData } from './$types';

	let { children, data }: { children: import('svelte').Snippet; data: LayoutData } = $props();

	const locale = $derived((data.locale ?? 'en') as Locale);
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
	<header class="border-b border-gray-200 dark:border-gray-700">
		<div class="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
			<a href="/exercises" class="text-lg font-bold">{t('app.name', locale)}</a>
			<nav class="flex gap-4">
				{#if data.user}
					<a href="/exercises" class="min-h-[44px] min-w-[44px] inline-flex items-center justify-center">{t('nav.exercises', locale)}</a>
					<a href="/settings" class="min-h-[44px] min-w-[44px] inline-flex items-center justify-center">{t('nav.settings', locale)}</a>
					<form method="POST" action="/logout">
						<button class="min-h-[44px] min-w-[44px] inline-flex items-center justify-center">{t('nav.logout', locale)}</button>
					</form>
				{:else}
					<a href="/login" class="min-h-[44px] min-w-[44px] inline-flex items-center justify-center">{t('nav.login', locale)}</a>
					<a href="/register" class="min-h-[44px] min-w-[44px] inline-flex items-center justify-center">{t('nav.register', locale)}</a>
				{/if}
			</nav>
		</div>
	</header>

	<main class="mx-auto max-w-2xl px-4 py-6">
		{@render children()}
	</main>
</div>
