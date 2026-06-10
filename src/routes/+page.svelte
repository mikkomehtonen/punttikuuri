<script lang="ts">
	import { t } from '$lib/i18n';
	import type { Locale } from '$lib/i18n';
	import type { PageData } from './$types';
	import Button from '$lib/components/Button.svelte';

	let { data }: { data: PageData } = $props();
	const locale = $derived(data.locale as Locale);
</script>

<svelte:head>
	<title>{t('app.name', locale)}</title>
</svelte:head>

<div class="flex flex-col items-center justify-center py-20">
	<h1 class="text-4xl font-bold text-primary-600 dark:text-primary-400">
		{t('app.name', locale)}
	</h1>
	<p class="mt-2 text-lg text-stone-500 dark:text-stone-400">
		{t('app.tagline', locale)}
	</p>
	<div class="mt-8 flex gap-4">
		<Button variant="primary" href="/login">
			{t('nav.login', locale)}
		</Button>
		<Button variant="secondary" href="/register">
			{t('nav.register', locale)}
		</Button>
	</div>
</div>
