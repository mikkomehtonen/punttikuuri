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
	const linkClasses = `${baseClasses} focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-stone-900`;
</script>

{#if href}
	<a {href} class="block {linkClasses}">
		{@render children()}
	</a>
{:else}
	<div class={baseClasses}>
		{@render children()}
	</div>
{/if}
