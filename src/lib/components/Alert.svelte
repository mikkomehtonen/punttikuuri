<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		type,
		children
	}: {
		type: 'error' | 'success';
		children: Snippet;
	} = $props();

	const typeClasses: Record<string, string> = {
		error:
			'rounded-xl border-l-4 border-red-400 bg-red-50 p-4 text-red-700 dark:border-red-500 dark:bg-red-950/50 dark:text-red-300',
		success:
			'rounded-xl border-l-4 border-green-400 bg-green-50 p-4 text-green-700 dark:border-green-500 dark:bg-green-950/50 dark:text-green-300'
	};
</script>

<div class={typeClasses[type]}>
	{@render children()}
</div>
