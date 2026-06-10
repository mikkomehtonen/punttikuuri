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
	const exercise = $derived(data.exercise);
	const todaySets = $derived(data.todaySets ?? []);
	const previousSessions = $derived(data.previousSessions ?? []);

	let weight = $state(data.lastSet ? String(data.lastSet.weight_kg) : '');
	let reps = $state(data.lastSet ? String(data.lastSet.repetitions) : '');
</script>

<svelte:head>
	<title>{exercise.name} - {t('app.name', locale)}</title>
</svelte:head>

<div class="mb-4">
	<Button variant="ghost" href="/exercises">
		&larr; {t('exercises.back', locale)}
	</Button>
</div>

<h1 class="mb-8 text-2xl font-bold">{exercise.name}</h1>

<section class="mb-8">
	<h2 class="mb-4 text-lg font-semibold">{t('workout.today', locale)}</h2>

	{#if form?.error}
		<div class="mb-4">
			<Alert type="error">
				{form.error}
			</Alert>
		</div>
	{/if}

	<Card>
		<form method="POST" class="flex flex-col gap-4">
			<div class="flex gap-4">
				<div class="flex-1">
					<Input
						label={t('workout.weight', locale)}
						name="weight_kg"
						type="text"
						inputmode="decimal"
						bind:value={weight}
						required
						placeholder="0.0"
					/>
				</div>
				<div class="flex-1">
					<Input
						label={t('workout.reps', locale)}
						name="repetitions"
						type="text"
						inputmode="numeric"
						bind:value={reps}
						required
						placeholder="0"
					/>
				</div>
			</div>
			<Button variant="primary" type="submit">
				{t('workout.submit', locale)}
			</Button>
		</form>
	</Card>

	{#if todaySets.length > 0}
		<ul class="mt-4 flex flex-col gap-2">
			{#each todaySets as set (set.set_number)}
				<li>
					<Card>
						<div class="flex items-center justify-between">
							<span class="text-stone-500 dark:text-stone-400"
								>{t('workout.set', locale)} {set.set_number}</span
							>
							<span class="font-medium">{set.weight_kg} kg &times; {set.repetitions}</span>
						</div>
					</Card>
				</li>
			{/each}
		</ul>
	{/if}
</section>

{#if previousSessions.length > 0}
	<section>
		<h2 class="mb-4 text-lg font-semibold">{t('workout.history', locale)}</h2>
		<div class="flex flex-col gap-6">
			{#each previousSessions as session (session.workout_date)}
				<div>
					<h3 class="mb-2 text-sm font-medium text-stone-500">{session.workout_date}</h3>
					<ul class="flex flex-col gap-1">
						{#each session.sets as set (set.set_number)}
							<li>
								<Card>
									<div class="flex items-center justify-between">
										<span class="text-stone-500 dark:text-stone-400"
											>{t('workout.set', locale)} {set.set_number}</span
										>
										<span>{set.weight_kg} kg &times; {set.repetitions}</span>
									</div>
								</Card>
							</li>
						{/each}
					</ul>
				</div>
			{/each}
		</div>
	</section>
{/if}
