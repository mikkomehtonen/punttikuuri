<script lang="ts">
	import { t } from '$lib/i18n';
	import type { Locale } from '$lib/i18n';
	import type { PageData } from './$types';

	let { data, form }: { data: PageData; form: import('./$types').ActionData } = $props();

	const locale = $derived(data.locale as Locale);
	let username = $state('');
	let password = $state('');
</script>

<svelte:head>
	<title>{t('login.title', locale)} - {t('app.name', locale)}</title>
</svelte:head>

<h1 class="mb-6 text-2xl font-bold">{t('login.title', locale)}</h1>

<form method="POST" class="flex flex-col gap-4">
	{#if form?.error}
		<div class="rounded-lg bg-red-100 dark:bg-red-900/30 p-3 text-red-700 dark:text-red-300">{form.error}</div>
	{/if}

	<label class="flex flex-col gap-1">
		<span>{t('login.username', locale)}</span>
		<input
			name="username"
			type="text"
			bind:value={username}
			required
			class="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-3 min-h-[44px]"
		/>
	</label>

	<label class="flex flex-col gap-1">
		<span>{t('login.password', locale)}</span>
		<input
			name="password"
			type="password"
			bind:value={password}
			required
			class="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-3 min-h-[44px]"
		/>
	</label>

	<button class="rounded-lg bg-blue-600 px-6 py-3 text-white font-medium min-h-[44px]">
		{t('login.submit', locale)}
	</button>
</form>

<p class="mt-4 text-gray-500 dark:text-gray-400">
	{t('login.noAccount', locale)}
	<a href="/register" class="text-blue-600 dark:text-blue-400 underline">{t('login.registerLink', locale)}</a>
</p>
