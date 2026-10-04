<script lang="ts">
	import { t } from '$lib/i18n';
	import type { Locale } from '$lib/i18n';
	import type { PageData } from './$types';
	import Button from '$lib/components/Button.svelte';
	import Input from '$lib/components/Input.svelte';
	import Card from '$lib/components/Card.svelte';
	import Alert from '$lib/components/Alert.svelte';

	let { data, form }: { data: PageData; form: import('./$types').ActionData } = $props();

	const locale = $derived(data.locale as Locale);
	let name = $state('');
	let shortName = $state('');
	let displayOrder = $state('');
	let kind = $state('strength');
</script>

<svelte:head>
	<title>{t('exercises.new', locale)} - {t('app.name', locale)}</title>
</svelte:head>

<h1 class="mb-8 text-2xl font-bold">{t('exercises.new', locale)}</h1>

<div class="max-w-md">
	<Card>
		<form method="POST" class="flex flex-col gap-4">
			{#if form?.error}
				<Alert type="error">
					{form.error}
				</Alert>
			{/if}

			<Input
				label={t('exercises.name', locale)}
				name="name"
				type="text"
				bind:value={name}
				required
				maxlength={100}
			/>

			<Input
				label={t('exercises.shortName', locale)}
				name="short_name"
				type="text"
				bind:value={shortName}
				maxlength={30}
			/>

			<Input
				label={t('exercises.displayOrder', locale)}
				name="display_order"
				type="number"
				bind:value={displayOrder}
			/>

			<fieldset>
				<legend class="mb-2 font-medium">{t('exercises.kind', locale)}</legend>
				<div class="flex gap-4">
					<label class="flex min-h-[44px] items-center gap-2">
						<input
							type="radio"
							name="kind"
							value="strength"
							bind:group={kind}
							class="accent-primary-600"
						/>
						<span>{t('exercises.kindStrength', locale)}</span>
					</label>
					<label class="flex min-h-[44px] items-center gap-2">
						<input
							type="radio"
							name="kind"
							value="cardio"
							bind:group={kind}
							class="accent-primary-600"
						/>
						<span>{t('exercises.kindCardio', locale)}</span>
					</label>
				</div>
			</fieldset>

			<Button variant="primary" type="submit">
				{t('exercises.submit', locale)}
			</Button>
		</form>
	</Card>
</div>

<div class="mt-4">
	<Button variant="ghost" href="/exercises">
		{t('exercises.back', locale)}
	</Button>
</div>
