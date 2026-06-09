<script lang="ts">
	import { t } from '$lib/i18n';
	import type { Locale } from '$lib/i18n';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	const locale = $derived(data.locale as Locale);
</script>

<svelte:head>
	<title>{t('app.name', locale)}</title>
</svelte:head>

<div class="flex flex-col items-center justify-center gap-4 py-12">
	<h1 class="text-3xl font-bold">{t('app.name', locale)}</h1>
	<p class="text-gray-500 dark:text-gray-400">{t('nav.exercises', locale)}</p>
	<div class="flex gap-4">
		<a
			href="/login"
			class="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg bg-blue-600 px-6 py-3 text-white"
			>{t('nav.login', locale)}</a
		>
		<a
			href="/register"
			class="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-gray-300 px-6 py-3 dark:border-gray-600"
			>{t('nav.register', locale)}</a
		>
	</div>
</div>
