<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		href = undefined,
		children
	}: {
		href?: string;
		children: Snippet;
	} = $props();

	const baseClasses =
		'rounded-xl border border-stone-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md dark:border-stone-700 dark:bg-stone-800';
</script>

{#if href}
	<a {href} class="block {baseClasses}">
		{@render children()}
	</a>
{:else}
	<div class={baseClasses}>
		{@render children()}
	</div>
{/if}
