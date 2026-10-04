<script lang="ts">
	import type { CardioEntrySummary } from './utils';
	import { formatDuration, formatDistanceKm } from './utils';

	let { entry, compact = false }: { entry: CardioEntrySummary; compact?: boolean } = $props();
</script>

{#snippet fields()}
	{#if entry.distance_m !== null}
		<span class="text-sm text-stone-500 dark:text-stone-400"
			>{formatDistanceKm(entry.distance_m)}</span
		>
	{/if}
	{#if entry.description}
		<span class="text-sm text-stone-600 dark:text-stone-300">{entry.description}</span>
	{/if}
{/snippet}

<div class={compact ? 'flex flex-wrap items-center justify-between gap-2' : 'flex flex-col gap-1'}>
	<span class="font-medium">{formatDuration(entry.duration_seconds)}</span>
	{#if compact}
		<div class="flex flex-col items-end gap-1">{@render fields()}</div>
	{:else}
		{@render fields()}
	{/if}
</div>
