<script lang="ts">
	import { t } from '$lib/i18n';
	import type { Locale } from '$lib/i18n';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const locale = $derived(data.locale as Locale);
	const exercises = $derived(data.exercises ?? []);
</script>

<svelte:head>
	<title>{t('exercises.title', locale)} - {t('app.name', locale)}</title>
</svelte:head>

<div class="flex items-center justify-between mb-6">
	<h1 class="text-2xl font-bold">{t('exercises.title', locale)}</h1>
	<a
		href="/exercises/new"
		class="rounded-lg bg-blue-600 px-4 py-3 text-white font-medium min-h-[44px] inline-flex items-center justify-center"
	>
		{t('exercises.create', locale)}
	</a>
</div>

{#if exercises.length === 0}
	<div class="rounded-lg border border-dashed border-gray-300 dark:border-gray-600 p-8 text-center">
		<p class="text-gray-500 dark:text-gray-400 mb-4">{t('exercises.empty', locale)}</p>
		<a
			href="/exercises/new"
			class="rounded-lg bg-blue-600 px-4 py-3 text-white font-medium min-h-[44px] inline-flex items-center justify-center"
		>
			{t('exercises.create', locale)}
		</a>
	</div>
{:else}
	<ul class="flex flex-col gap-2">
		{#each exercises as exercise}
			<li>
				<a
					href="/exercises/{exercise.id}"
					class="block rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:bg-gray-50 dark:hover:bg-gray-800 min-h-[44px]"
				>
					<span class="font-medium">{exercise.name}</span>
					{#if exercise.short_name}
						<span class="ml-2 text-sm text-gray-500 dark:text-gray-400">({exercise.short_name})</span>
					{/if}
				</a>
			</li>
		{/each}
	</ul>
{/if}
