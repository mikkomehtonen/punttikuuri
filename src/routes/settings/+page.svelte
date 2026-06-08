<script lang="ts">
	import { t } from '$lib/i18n';
	import type { Locale } from '$lib/i18n';
	import type { PageData } from './$types';

	let { data, form }: { data: PageData; form: import('./$types').ActionData } = $props();

	const locale = $derived(data.locale as Locale);

	let selectedLocale = $state(data.currentLocale as string);
	let selectedTheme = $state(data.currentTheme as string);
</script>

<svelte:head>
	<title>{t('settings.title', locale)} - {t('app.name', locale)}</title>
</svelte:head>

<h1 class="mb-6 text-2xl font-bold">{t('settings.title', locale)}</h1>

{#if form?.saved}
	<div class="rounded-lg bg-green-100 dark:bg-green-900/30 p-3 mb-4 text-green-700 dark:text-green-300">{t('settings.saved', locale)}</div>
{/if}

<form method="POST" class="flex flex-col gap-6">
	<fieldset>
		<legend class="mb-2 font-medium">{t('settings.language', locale)}</legend>
		<div class="flex gap-4">
			<label class="flex items-center gap-2 min-h-[44px]">
				<input type="radio" name="locale" value="en" bind:group={selectedLocale} />
				<span>{t('settings.en', locale)}</span>
			</label>
			<label class="flex items-center gap-2 min-h-[44px]">
				<input type="radio" name="locale" value="fi" bind:group={selectedLocale} />
				<span>{t('settings.fi', locale)}</span>
			</label>
		</div>
	</fieldset>

	<fieldset>
		<legend class="mb-2 font-medium">{t('settings.theme', locale)}</legend>
		<div class="flex gap-4">
			<label class="flex items-center gap-2 min-h-[44px]">
				<input type="radio" name="theme" value="light" bind:group={selectedTheme} />
				<span>{t('settings.light', locale)}</span>
			</label>
			<label class="flex items-center gap-2 min-h-[44px]">
				<input type="radio" name="theme" value="dark" bind:group={selectedTheme} />
				<span>{t('settings.dark', locale)}</span>
			</label>
			<label class="flex items-center gap-2 min-h-[44px]">
				<input type="radio" name="theme" value="system" bind:group={selectedTheme} />
				<span>{t('settings.system', locale)}</span>
			</label>
		</div>
	</fieldset>

	<button class="rounded-lg bg-blue-600 px-6 py-3 text-white font-medium min-h-[44px] self-start">
		{t('settings.save', locale)}
	</button>
</form>
