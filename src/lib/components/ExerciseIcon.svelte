<script lang="ts">
	import { EXERCISE_ICONS, type ExerciseIconId } from '$lib/icons/exercise-icons';

	// `id` must always come from `resolveExerciseIcon()` (or another registry-allowlisted
	// source) — never a raw DB value. The markup is a compile-time constant keyed by id.
	let {
		id,
		class: klass = 'h-5 w-5'
	}: {
		id: ExerciseIconId;
		class?: string;
	} = $props();
</script>

<!-- eslint-disable svelte/no-at-html-tags -->
<!-- Safe: markup is a developer-authored compile-time constant from the registry,
     keyed by an allowlisted id (validated by `isExerciseIconId` / `resolveExerciseIcon`). -->
<svg
	xmlns="http://www.w3.org/2000/svg"
	viewBox="0 0 24 24"
	fill="none"
	stroke="currentColor"
	stroke-width="2"
	stroke-linecap="round"
	stroke-linejoin="round"
	aria-hidden="true"
	data-icon={id}
	class={klass}
>
	{@html EXERCISE_ICONS[id]}
</svg>
<!-- eslint-enable svelte/no-at-html-tags -->
