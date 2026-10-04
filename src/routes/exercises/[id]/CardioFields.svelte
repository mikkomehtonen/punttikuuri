<script lang="ts">
	import { t } from '$lib/i18n';
	import type { Locale } from '$lib/i18n';
	import Input from '$lib/components/Input.svelte';
	import Textarea from '$lib/components/Textarea.svelte';

	let {
		locale,
		hours = $bindable(),
		minutes = $bindable(),
		seconds = $bindable(),
		distanceKm = $bindable(),
		description = $bindable()
	}: {
		locale: Locale;
		hours: string;
		minutes: string;
		seconds: string;
		distanceKm: string;
		description: string;
	} = $props();
</script>

<fieldset>
	<legend class="mb-1 text-sm font-medium text-stone-700 dark:text-stone-300">
		{t('workout.duration', locale)}
	</legend>
	<div class="flex gap-4">
		<div class="flex-1">
			<Input
				label={t('workout.hours', locale)}
				name="hours"
				type="text"
				inputmode="numeric"
				bind:value={hours}
				placeholder="0"
			/>
		</div>
		<div class="flex-1">
			<Input
				label={t('workout.minutes', locale)}
				name="minutes"
				type="text"
				inputmode="numeric"
				bind:value={minutes}
				placeholder="0"
			/>
		</div>
		<div class="flex-1">
			<Input
				label={t('workout.seconds', locale)}
				name="seconds"
				type="text"
				inputmode="numeric"
				bind:value={seconds}
				placeholder="0"
			/>
		</div>
	</div>
</fieldset>

<Input
	label={t('workout.distance', locale)}
	name="distance_km"
	type="text"
	inputmode="decimal"
	bind:value={distanceKm}
	placeholder="0.0"
/>

<Textarea
	label={t('workout.description', locale)}
	name="description"
	bind:value={description}
	maxlength={500}
/>
