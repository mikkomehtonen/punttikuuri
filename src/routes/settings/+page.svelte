<script lang="ts">
	import { t } from '$lib/i18n';
	import type { Locale } from '$lib/i18n';
	import type { PageData } from './$types';
	import Button from '$lib/components/Button.svelte';
	import Card from '$lib/components/Card.svelte';
	import Alert from '$lib/components/Alert.svelte';

	let { data }: { data: PageData } = $props();

	const locale = $derived(data.locale as Locale);
	const saved = $derived(data.saved);

	let selectedLocale = $state(data.currentLocale);
	let selectedTheme = $state(data.currentTheme);
</script>

<svelte:head>
	<title>{t('settings.title', locale)} - {t('app.name', locale)}</title>
</svelte:head>

<h1 class="mb-8 text-2xl font-bold">{t('settings.title', locale)}</h1>

{#if saved}
	<div class="mb-4">
		<Alert type="success">
			{t('settings.saved', locale)}
		</Alert>
	</div>
{/if}

<div class="max-w-md">
	<Card>
		<form method="POST" class="flex flex-col gap-6">
			<fieldset>
				<legend class="mb-2 font-medium">{t('settings.language', locale)}</legend>
				<div class="flex gap-4">
					<label class="flex min-h-[44px] items-center gap-2">
						<input
							type="radio"
							name="locale"
							value="en"
							bind:group={selectedLocale}
							class="accent-primary-600"
						/>
						<span>{t('settings.en', locale)}</span>
					</label>
					<label class="flex min-h-[44px] items-center gap-2">
						<input
							type="radio"
							name="locale"
							value="fi"
							bind:group={selectedLocale}
							class="accent-primary-600"
						/>
						<span>{t('settings.fi', locale)}</span>
					</label>
				</div>
			</fieldset>

			<fieldset>
				<legend class="mb-2 font-medium">{t('settings.theme', locale)}</legend>
				<div class="flex gap-4">
					<label class="flex min-h-[44px] items-center gap-2">
						<input
							type="radio"
							name="theme"
							value="light"
							bind:group={selectedTheme}
							class="accent-primary-600"
						/>
						<span>{t('settings.light', locale)}</span>
					</label>
					<label class="flex min-h-[44px] items-center gap-2">
						<input
							type="radio"
							name="theme"
							value="dark"
							bind:group={selectedTheme}
							class="accent-primary-600"
						/>
						<span>{t('settings.dark', locale)}</span>
					</label>
					<label class="flex min-h-[44px] items-center gap-2">
						<input
							type="radio"
							name="theme"
							value="system"
							bind:group={selectedTheme}
							class="accent-primary-600"
						/>
						<span>{t('settings.system', locale)}</span>
					</label>
				</div>
			</fieldset>

			<div>
				<Button variant="primary" type="submit">
					{t('settings.save', locale)}
				</Button>
			</div>
		</form>
	</Card>
</div>
