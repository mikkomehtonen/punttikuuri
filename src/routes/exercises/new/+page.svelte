<script lang="ts">
	import { t } from '$lib/i18n';
	import type { Locale } from '$lib/i18n';
	import type { PageData } from './$types';

	let { data, form }: { data: PageData; form: import('./$types').ActionData } = $props();

	const locale = $derived(data.locale as Locale);
	let name = $state('');
	let shortName = $state('');
	let displayOrder = $state('');
</script>

<svelte:head>
	<title>{t('exercises.new', locale)} - {t('app.name', locale)}</title>
</svelte:head>

<h1 class="mb-6 text-2xl font-bold">{t('exercises.new', locale)}</h1>

<form method="POST" class="flex flex-col gap-4">
	{#if form?.error}
		<div class="rounded-lg bg-red-100 p-3 text-red-700 dark:bg-red-900/30 dark:text-red-300">
			{form.error}
		</div>
	{/if}

	<label class="flex flex-col gap-1">
		<span>{t('exercises.name', locale)}</span>
		<input
			name="name"
			type="text"
			bind:value={name}
			required
			maxlength={100}
			class="min-h-[44px] rounded-lg border border-gray-300 bg-white px-4 py-3 dark:border-gray-600 dark:bg-gray-800"
		/>
	</label>

	<label class="flex flex-col gap-1">
		<span>{t('exercises.shortName', locale)}</span>
		<input
			name="short_name"
			type="text"
			bind:value={shortName}
			maxlength={30}
			class="min-h-[44px] rounded-lg border border-gray-300 bg-white px-4 py-3 dark:border-gray-600 dark:bg-gray-800"
		/>
	</label>

	<label class="flex flex-col gap-1">
		<span>{t('exercises.displayOrder', locale)}</span>
		<input
			name="display_order"
			type="number"
			bind:value={displayOrder}
			class="min-h-[44px] rounded-lg border border-gray-300 bg-white px-4 py-3 dark:border-gray-600 dark:bg-gray-800"
		/>
	</label>

	<button class="min-h-[44px] rounded-lg bg-blue-600 px-6 py-3 font-medium text-white">
		{t('exercises.submit', locale)}
	</button>
</form>

<a
	href="/exercises"
	class="mt-4 flex inline-block min-h-[44px] min-w-[44px] items-center text-blue-600 underline dark:text-blue-400"
>
	{t('exercises.back', locale)}
</a>
