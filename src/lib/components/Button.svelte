<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		variant = 'primary',
		href = undefined,
		type = 'button',
		children
	}: {
		variant?: 'primary' | 'secondary' | 'ghost';
		href?: string;
		type?: 'button' | 'submit' | 'reset';
		children: Snippet;
	} = $props();

	const variantClasses = {
		primary:
			'inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl bg-primary-600 px-6 py-3 font-medium text-white shadow-sm transition-colors hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-stone-900',
		secondary:
			'inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border-2 border-primary-600 px-6 py-3 font-medium text-primary-600 transition-colors hover:bg-primary-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:border-primary-500 dark:text-primary-400 dark:hover:bg-primary-950 dark:focus:ring-offset-stone-900',
		ghost:
			'inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl px-4 py-3 font-medium text-stone-600 transition-colors hover:bg-stone-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:text-stone-300 dark:hover:bg-stone-800 dark:focus:ring-offset-stone-900'
	} as const;
</script>

{#if href}
	<a {href} class={variantClasses[variant]}>
		{@render children()}
	</a>
{:else}
	<button {type} class={variantClasses[variant]}>
		{@render children()}
	</button>
{/if}
