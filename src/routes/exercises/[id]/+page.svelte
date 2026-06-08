<script lang="ts">
	import { t } from '$lib/i18n';
	import type { Locale } from '$lib/i18n';
	import type { PageData } from './$types';

	let { data, form }: { data: PageData; form: import('./$types').ActionData } = $props();

	const locale = $derived(data.locale as Locale);
	const exercise = $derived(data.exercise);
	const todaySets = $derived(data.todaySets ?? []);
	const previousSessions = $derived(data.previousSessions ?? []);

	let weight = $state('');
	let reps = $state('');
</script>

<svelte:head>
	<title>{exercise.name} - {t('app.name', locale)}</title>
</svelte:head>

<a href="/exercises" class="mb-4 inline-block text-blue-600 dark:text-blue-400 underline min-h-[44px] min-w-[44px] flex items-center">
	&larr; {t('exercises.back', locale)}
</a>

<h1 class="mb-6 text-2xl font-bold">{exercise.name}</h1>

<!-- Today's workout section -->
<section class="mb-8">
	<h2 class="mb-4 text-lg font-semibold">{t('workout.today', locale)}</h2>

	{#if form?.error}
		<div class="rounded-lg bg-red-100 dark:bg-red-900/30 p-3 mb-4 text-red-700 dark:text-red-300">{form.error}</div>
	{/if}

	<form method="POST" class="mb-6 flex flex-col gap-4 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
		<div class="flex gap-4">
			<label class="flex flex-1 flex-col gap-1">
				<span>{t('workout.weight', locale)}</span>
				<input
					name="weight_kg"
					type="text"
					inputmode="decimal"
					bind:value={weight}
					required
					placeholder="0.0"
					class="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-3 min-h-[44px]"
				/>
			</label>
			<label class="flex flex-1 flex-col gap-1">
				<span>{t('workout.reps', locale)}</span>
				<input
					name="repetitions"
					type="text"
					inputmode="numeric"
					bind:value={reps}
					required
					placeholder="0"
					class="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-3 min-h-[44px]"
				/>
			</label>
		</div>
		<button class="rounded-lg bg-blue-600 px-6 py-3 text-white font-medium min-h-[44px]">
			{t('workout.submit', locale)}
		</button>
	</form>

	<!-- Today's sets list -->
	{#if todaySets.length > 0}
		<ul class="flex flex-col gap-2">
			{#each todaySets as set}
				<li class="rounded-lg border border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between min-h-[44px]">
					<span class="text-gray-500 dark:text-gray-400">{t('workout.set', locale)} {set.set_number}</span>
					<span class="font-medium">{set.weight_kg} kg &times; {set.repetitions}</span>
				</li>
			{/each}
		</ul>
	{/if}
</section>

<!-- History section -->
{#if previousSessions.length > 0}
	<section>
		<h2 class="mb-4 text-lg font-semibold">{t('workout.history', locale)}</h2>
		<div class="flex flex-col gap-6">
			{#each previousSessions as session}
				<div>
					<h3 class="mb-2 text-sm text-gray-500 dark:text-gray-400">{session.workout_date}</h3>
					<ul class="flex flex-col gap-1">
						{#each session.sets as set}
							<li class="rounded-lg border border-gray-200 dark:border-gray-700 p-3 flex items-center justify-between min-h-[44px]">
								<span class="text-gray-500 dark:text-gray-400">{t('workout.set', locale)} {set.set_number}</span>
								<span>{set.weight_kg} kg &times; {set.repetitions}</span>
							</li>
						{/each}
					</ul>
				</div>
			{/each}
		</div>
	</section>
{/if}
