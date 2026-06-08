<script lang="ts">
	import { t } from '$lib/i18n';
	import type { Locale } from '$lib/i18n';

	let { data } = $props();
	const locale = $derived(data.locale as Locale);
</script>

<svelte:head>
	<title>{t('app.name', locale)}</title>
</svelte:head>

<div class="flex flex-col items-center justify-center gap-4 py-12">
	<h1 class="text-3xl font-bold">{t('app.name', locale)}</h1>
	<p class="text-gray-500 dark:text-gray-400">{t('nav.exercises', locale)}</p>
	<div class="flex gap-4">
		<a href="/login" class="rounded-lg bg-blue-600 px-6 py-3 text-white min-h-[44px] min-w-[44px] inline-flex items-center justify-center">{t('nav.login', locale)}</a>
		<a href="/register" class="rounded-lg border border-gray-300 dark:border-gray-600 px-6 py-3 min-h-[44px] min-w-[44px] inline-flex items-center justify-center">{t('nav.register', locale)}</a>
	</div>
</div>
