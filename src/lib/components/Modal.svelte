<script lang="ts">
	import { onMount } from 'svelte';
	import Card from '$lib/components/Card.svelte';

	let {
		label,
		onclose,
		children
	}: {
		label: string;
		onclose: () => void;
		children: import('svelte').Snippet;
	} = $props();

	let dialogEl = $state<HTMLElement | null>(null);

	onMount(() => {
		dialogEl?.focus();
	});
</script>

<div
	class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
	role="presentation"
	onclick={(event) => {
		if (event.target === event.currentTarget) onclose();
	}}
	onkeydown={(event) => {
		if (event.key === 'Escape') onclose();
	}}
>
	<div
		class="w-full max-w-sm"
		role="dialog"
		aria-modal="true"
		aria-label={label}
		tabindex="-1"
		bind:this={dialogEl}
	>
		<Card>
			{@render children()}
		</Card>
	</div>
</div>
