<script lang="ts">
	import './layout.css';

	import { t } from '$lib/i18n';
	import type { Locale } from '$lib/i18n';
	import type { LayoutData } from './$types';
	import Button from '$lib/components/Button.svelte';

	let { children, data }: { children: import('svelte').Snippet; data: LayoutData } = $props();

	const locale = $derived((data.locale ?? 'en') as Locale);

	$effect(() => {
		const theme = data.theme ?? 'system';
		const root = document.documentElement;

		if (theme === 'dark') {
			root.classList.add('dark');
			return;
		}

		if (theme === 'light') {
			root.classList.remove('dark');
			return;
		}

		const mq = window.matchMedia('(prefers-color-scheme: dark)');
		const apply = () => root.classList.toggle('dark', mq.matches);
		apply();
		mq.addEventListener('change', apply);
		return () => mq.removeEventListener('change', apply);
	});
</script>

<svelte:head>
	<link rel="icon" href="/favicon.svg" />
</svelte:head>

<div
	class="min-h-screen bg-stone-50 font-sans text-stone-800 dark:bg-stone-900 dark:text-stone-100"
>
	<header class="bg-white shadow-sm dark:bg-stone-800">
		<div
			class="mx-auto flex max-w-2xl flex-col items-center gap-2 px-4 py-3 sm:flex-row sm:justify-between sm:gap-0"
		>
			<div class="inline-flex items-center gap-2">
				{#if data.logoLinkUrl}
					<a href={data.logoLinkUrl} class="inline-flex items-center">
						<img src="/favicon.svg" alt="" class="h-7 w-7" />
					</a>
				{:else}
					<img src="/favicon.svg" alt="" class="h-7 w-7" />
				{/if}
				<a href="/exercises" class="text-xl font-bold text-primary-600 dark:text-primary-400">
					{t('app.name', locale)}
				</a>
			</div>
			<nav class="flex gap-4">
				{#if data.user}
					<a
						href="/exercises"
						class="inline-flex min-h-[44px] min-w-[44px] items-center justify-center text-stone-600 hover:text-primary-600 dark:text-stone-300 dark:hover:text-primary-400"
					>
						{t('nav.exercises', locale)}
					</a>
					<a
						href="/settings"
						class="inline-flex min-h-[44px] min-w-[44px] items-center justify-center text-stone-600 hover:text-primary-600 dark:text-stone-300 dark:hover:text-primary-400"
					>
						{t('nav.settings', locale)}
					</a>
					<form method="POST" action="/logout">
						<Button variant="ghost" type="submit">
							{t('nav.logout', locale)}
						</Button>
					</form>
				{:else}
					<a
						href="/login"
						class="inline-flex min-h-[44px] min-w-[44px] items-center justify-center text-stone-600 hover:text-primary-600 dark:text-stone-300 dark:hover:text-primary-400"
					>
						{t('nav.login', locale)}
					</a>
					<a
						href="/register"
						class="inline-flex min-h-[44px] min-w-[44px] items-center justify-center text-stone-600 hover:text-primary-600 dark:text-stone-300 dark:hover:text-primary-400"
					>
						{t('nav.register', locale)}
					</a>
				{/if}
			</nav>
		</div>
	</header>

	<main class="mx-auto max-w-2xl px-4 py-8">
		{@render children()}
	</main>
</div>
