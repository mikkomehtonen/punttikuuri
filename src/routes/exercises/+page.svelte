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

<div class="mb-6 flex items-center justify-between">
	<h1 class="text-2xl font-bold">{t('exercises.title', locale)}</h1>
	<a
		href="/exercises/new"
		class="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-blue-600 px-4 py-3 font-medium text-white"
	>
		{t('exercises.create', locale)}
	</a>
</div>

{#if exercises.length === 0}
	<div class="rounded-lg border border-dashed border-gray-300 p-8 text-center dark:border-gray-600">
		<p class="mb-4 text-gray-500 dark:text-gray-400">{t('exercises.empty', locale)}</p>
		<a
			href="/exercises/new"
			class="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-blue-600 px-4 py-3 font-medium text-white"
		>
			{t('exercises.create', locale)}
		</a>
	</div>
{:else}
	<ul class="flex flex-col gap-2">
		{#each exercises as exercise (exercise.id)}
			<li>
				<a
					href="/exercises/{exercise.id}"
					class="block min-h-[44px] rounded-lg border border-gray-200 p-4 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
				>
					<span class="font-medium">{exercise.name}</span>
					{#if exercise.short_name}
						<span class="ml-2 text-sm text-gray-500 dark:text-gray-400"
							>({exercise.short_name})</span
						>
					{/if}
				</a>
			</li>
		{/each}
	</ul>
{/if}
