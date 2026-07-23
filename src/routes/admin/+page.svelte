<script lang="ts">
	import { t } from '$lib/i18n';
	import type { Locale } from '$lib/i18n';
	import type { PageData } from './$types';
	import Button from '$lib/components/Button.svelte';
	import Input from '$lib/components/Input.svelte';
	import Card from '$lib/components/Card.svelte';
	import Alert from '$lib/components/Alert.svelte';

	let {
		data,
		form
	}: {
		data: PageData;
		form: import('./$types').ActionData;
	} = $props();

	const locale = $derived(data.locale as Locale);
	let selectedUsername = $state('');
	let password = $state('');
</script>

<svelte:head>
	<title>{t('admin.title', locale)} - {t('app.name', locale)}</title>
</svelte:head>

<h1 class="mb-8 text-2xl font-bold text-stone-800 dark:text-stone-100">
	{t('admin.title', locale)}
</h1>

{#if data.resetUsername}
	<div class="mb-4">
		<Alert type="success">
			{t('admin.resetSuccess', locale)}
			{data.resetUsername}
		</Alert>
	</div>
{/if}

{#if form?.error && form?.field !== 'password'}
	<div class="mb-4">
		<Alert type="error">
			{form.error}
		</Alert>
	</div>
{/if}

<div class="mx-auto max-w-md">
	<Card>
		<h2 class="mb-4 font-medium text-stone-800 dark:text-stone-100">
			{t('admin.users', locale)}
		</h2>
		<ul class="mb-6 flex flex-col gap-1">
			{#each data.users as u (u.id)}
				<li class="text-sm text-stone-700 dark:text-stone-300">
					{u.username}
				</li>
			{/each}
		</ul>

		<form method="POST" class="flex flex-col gap-4">
			<label class="flex flex-col gap-1">
				<span class="mb-1.5 block text-sm font-medium text-stone-700 dark:text-stone-300">
					{t('admin.selectUser', locale)}
				</span>
				<select
					name="username"
					bind:value={selectedUsername}
					required
					class="min-h-[44px] w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-stone-900 shadow-sm transition-colors focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
				>
					{#each data.users as u (u.id)}
						<option value={u.username}>{u.username}</option>
					{/each}
				</select>
			</label>

			<Input
				label={t('admin.newPassword', locale)}
				name="password"
				type="password"
				bind:value={password}
				required
				error={form?.field === 'password' ? form?.error : undefined}
			/>

			<Button variant="primary" type="submit">
				{t('admin.resetPassword', locale)}
			</Button>
		</form>
	</Card>
</div>
