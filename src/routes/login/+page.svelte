<script lang="ts">
	import { t } from '$lib/i18n';
	import type { Locale } from '$lib/i18n';
	import type { PageData } from './$types';
	import Button from '$lib/components/Button.svelte';
	import Input from '$lib/components/Input.svelte';
	import Card from '$lib/components/Card.svelte';
	import Alert from '$lib/components/Alert.svelte';

	let { data, form }: { data: PageData; form: import('./$types').ActionData } = $props();

	const locale = $derived(data.locale as Locale);
	let username = $state('');
	let password = $state('');
</script>

<svelte:head>
	<title>{t('login.title', locale)} - {t('app.name', locale)}</title>
</svelte:head>

<h1 class="mb-8 text-2xl font-bold text-stone-800 dark:text-stone-100">
	{t('login.title', locale)}
</h1>

<div class="mx-auto max-w-md">
	<Card>
		<form method="POST" class="flex flex-col gap-4">
			{#if form?.error}
				<Alert type="error">
					{form.error}
				</Alert>
			{/if}

			<Input
				label={t('login.username', locale)}
				name="username"
				type="text"
				bind:value={username}
				required
			/>

			<Input
				label={t('login.password', locale)}
				name="password"
				type="password"
				bind:value={password}
				required
			/>

			<Button variant="primary" type="submit">
				{t('login.submit', locale)}
			</Button>
		</form>
	</Card>
</div>

<div class="mt-4 text-center">
	<Button variant="ghost" href="/register">
		{t('login.noAccount', locale)}
		{t('login.registerLink', locale)}
	</Button>
</div>
