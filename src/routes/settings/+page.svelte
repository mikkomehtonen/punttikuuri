<script lang="ts">
	import { t } from '$lib/i18n';
	import type { Locale } from '$lib/i18n';
	import type { PageData } from './$types';

	let { data, form }: { data: PageData; form: import('./$types').ActionData } = $props();

	const locale = $derived(data.locale as Locale);
	const { currentLocale, currentTheme } = data;

	let selectedLocale = $state(currentLocale as string);
	let selectedTheme = $state(currentTheme as string);
</script>

<svelte:head>
	<title>{t('settings.title', locale)} - {t('app.name', locale)}</title>
</svelte:head>

<h1 class="mb-6 text-2xl font-bold">{t('settings.title', locale)}</h1>

{#if form?.saved}
	<div
		class="mb-4 rounded-lg bg-green-100 p-3 text-green-700 dark:bg-green-900/30 dark:text-green-300"
	>
		{t('settings.saved', locale)}
	</div>
{/if}

<form method="POST" class="flex flex-col gap-6">
	<fieldset>
		<legend class="mb-2 font-medium">{t('settings.language', locale)}</legend>
		<div class="flex gap-4">
			<label class="flex min-h-[44px] items-center gap-2">
				<input type="radio" name="locale" value="en" bind:group={selectedLocale} />
				<span>{t('settings.en', locale)}</span>
			</label>
			<label class="flex min-h-[44px] items-center gap-2">
				<input type="radio" name="locale" value="fi" bind:group={selectedLocale} />
				<span>{t('settings.fi', locale)}</span>
			</label>
		</div>
	</fieldset>

	<fieldset>
		<legend class="mb-2 font-medium">{t('settings.theme', locale)}</legend>
		<div class="flex gap-4">
			<label class="flex min-h-[44px] items-center gap-2">
				<input type="radio" name="theme" value="light" bind:group={selectedTheme} />
				<span>{t('settings.light', locale)}</span>
			</label>
			<label class="flex min-h-[44px] items-center gap-2">
				<input type="radio" name="theme" value="dark" bind:group={selectedTheme} />
				<span>{t('settings.dark', locale)}</span>
			</label>
			<label class="flex min-h-[44px] items-center gap-2">
				<input type="radio" name="theme" value="system" bind:group={selectedTheme} />
				<span>{t('settings.system', locale)}</span>
			</label>
		</div>
	</fieldset>

	<button class="min-h-[44px] self-start rounded-lg bg-blue-600 px-6 py-3 font-medium text-white">
		{t('settings.save', locale)}
	</button>
</form>
