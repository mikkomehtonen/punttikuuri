<script lang="ts">
	let {
		label,
		name,
		value = $bindable(''),
		required = false,
		maxlength = undefined,
		placeholder = undefined,
		error = undefined
	}: {
		label: string;
		name: string;
		value?: string;
		required?: boolean;
		maxlength?: number;
		placeholder?: string;
		error?: string;
	} = $props();
</script>

<label class="flex flex-col gap-1">
	<span class="mb-1.5 block text-sm font-medium text-stone-700 dark:text-stone-300">{label}</span>
	<textarea
		{name}
		bind:value
		{required}
		{maxlength}
		{placeholder}
		class="min-h-[88px] w-full resize-y rounded-xl border border-stone-300 bg-white px-4 py-3 text-stone-900 shadow-sm transition-colors placeholder:text-stone-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100 dark:placeholder:text-stone-500 dark:focus:border-primary-500 dark:focus:ring-primary-500/20"
	></textarea>
	{#if error}
		<span class="mt-1 text-sm text-red-600 dark:text-red-400">{error}</span>
	{/if}
</label>
