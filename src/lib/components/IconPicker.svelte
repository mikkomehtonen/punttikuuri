<script lang="ts">
	import { t, type Locale } from '$lib/i18n';
	import { EXERCISE_ICONS, type ExerciseIconId } from '$lib/icons/exercise-icons';
	import ExerciseIcon from '$lib/components/ExerciseIcon.svelte';

	// Route-agnostic by design: the future edit-exercise story reuses this with
	// the same `name="icon"` field; the caller supplies the kind default preview.
	let {
		name = 'icon',
		value = $bindable(''),
		locale,
		defaultIconId
	}: {
		name?: string;
		value?: string;
		locale: Locale;
		defaultIconId: ExerciseIconId;
	} = $props();

	const iconIds = Object.keys(EXERCISE_ICONS) as ExerciseIconId[];

	const tileClasses =
		'flex h-11 w-11 items-center justify-center rounded-lg border border-stone-200 bg-white text-stone-600 transition-colors hover:border-primary-400 peer-checked:border-primary-500 peer-checked:bg-primary-50 peer-checked:text-primary-600 peer-focus-visible:ring-2 peer-focus-visible:ring-primary-500 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300 dark:peer-checked:border-primary-500 dark:peer-checked:bg-primary-950 dark:peer-checked:text-primary-400';
</script>

<fieldset>
	<legend class="mb-2 font-medium">{t('exercises.icon', locale)}</legend>
	<div class="grid grid-cols-6 items-end gap-2">
		<label class="flex min-h-[44px] cursor-pointer flex-col items-center justify-center gap-1">
			<span class="text-xs text-stone-500 dark:text-stone-400"
				>{t('exercises.iconDefault', locale)}</span
			>
			<input
				type="radio"
				{name}
				value=""
				bind:group={value}
				class="peer sr-only"
				aria-label={t('exercises.iconDefault', locale)}
			/>
			<span class={tileClasses}><ExerciseIcon id={defaultIconId} /></span>
		</label>
		{#each iconIds as id (id)}
			<label class="flex min-h-[44px] cursor-pointer items-center justify-center">
				<input
					type="radio"
					{name}
					value={id}
					bind:group={value}
					class="peer sr-only"
					aria-label={t('icons.' + id, locale)}
				/>
				<span class={tileClasses}><ExerciseIcon {id} /></span>
			</label>
		{/each}
	</div>
</fieldset>
