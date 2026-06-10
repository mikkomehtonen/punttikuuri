<script lang="ts">
	import { t } from '$lib/i18n';
	import type { Locale } from '$lib/i18n';
	import type { PageData } from './$types';
	import Button from '$lib/components/Button.svelte';
	import Card from '$lib/components/Card.svelte';
	import Badge from '$lib/components/Badge.svelte';

	let { data }: { data: PageData } = $props();

	const locale = $derived(data.locale as Locale);
	const exercises = $derived(data.exercises ?? []);
</script>

<svelte:head>
	<title>{t('exercises.title', locale)} - {t('app.name', locale)}</title>
</svelte:head>

<div class="mb-8 flex items-center justify-between">
	<h1 class="text-2xl font-bold">{t('exercises.title', locale)}</h1>
	<Button variant="primary" href="/exercises/new">
		{t('exercises.create', locale)}
	</Button>
</div>

{#if exercises.length === 0}
	<Card>
		<div class="py-8 text-center">
			<p class="mb-4 text-stone-500 dark:text-stone-400">{t('exercises.empty', locale)}</p>
			<Button variant="primary" href="/exercises/new">
				{t('exercises.create', locale)}
			</Button>
		</div>
	</Card>
{:else}
	<ul class="flex flex-col gap-2">
		{#each exercises as exercise (exercise.id)}
			<li>
				<Card href="/exercises/{exercise.id}">
					<span class="font-medium">{exercise.name}</span>
					{#if exercise.short_name}
						<span class="ml-2"><Badge>{exercise.short_name}</Badge></span>
					{/if}
				</Card>
			</li>
		{/each}
	</ul>
{/if}
