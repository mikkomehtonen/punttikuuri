<script lang="ts">
	import { goto } from '$app/navigation';
	import { t } from '$lib/i18n';
	import type { Locale } from '$lib/i18n';
	import type { PageData } from './$types';
	import Button from '$lib/components/Button.svelte';
	import Input from '$lib/components/Input.svelte';
	import Textarea from '$lib/components/Textarea.svelte';
	import Card from '$lib/components/Card.svelte';
	import Alert from '$lib/components/Alert.svelte';
	import type { SetSummary } from './utils';
	import { isOldSession } from './utils';

	let { data, form }: { data: PageData; form: import('./$types').ActionData } = $props();

	const locale = $derived(data.locale as Locale);
	const exercise = $derived(data.exercise);
	const today = $derived(data.today);
	const selectedDate = $derived(data.selectedDate);
	const isToday = $derived(data.isToday);
	const selectedDateSets = $derived(data.selectedDateSets ?? []);
	const selectedDateComment = $derived(data.selectedDateComment ?? null);
	const previousSessions = $derived(data.previousSessions ?? []);
	const latestHistoryDate = $derived(previousSessions[0]?.workout_date);

	let weight = $state(data.lastSet ? String(data.lastSet.weight_kg) : '');
	let reps = $state(data.lastSet ? String(data.lastSet.repetitions) : '');
	let comment = $state(data.selectedDateComment ?? '');

	// Client-side date navigation (goto) reuses this component instance without
	// re-running <script>, so re-sync the form fields whenever data changes.
	$effect(() => {
		weight = data.lastSet ? String(data.lastSet.weight_kg) : '';
		reps = data.lastSet ? String(data.lastSet.repetitions) : '';
		comment = data.selectedDateComment ?? '';
	});

	// Collapsible history: sessions older than 7 days start collapsed, recent
	// ones start expanded. The latest session in the list (`previousSessions[0]`,
	// newest-first) is always expanded by default regardless of age, so the most
	// recent weights stay visible even after a long break. Defaults derive from
	// the `today` value provided by load (not the client clock) so SSR and
	// hydration agree; the map only stores explicit user toggles, keyed by
	// workout_date.
	let expanded = $state<Record<string, boolean>>({});

	function isExpanded(session: { workout_date: string }): boolean {
		const isLatest = session.workout_date === latestHistoryDate;
		return (
			expanded[session.workout_date] ?? (isLatest || !isOldSession(session.workout_date, today))
		);
	}

	function toggleExpanded(session: { workout_date: string }): void {
		expanded[session.workout_date] = !isExpanded(session);
	}

	function handleDateChange(event: Event) {
		const value = (event.target as HTMLInputElement).value;
		goto(`/exercises/${exercise.id}${value ? `?date=${value}` : ''}`);
	}

	let deleteTarget = $state<SetSummary | null>(null);
	let dialogEl = $state<HTMLElement | null>(null);

	$effect(() => {
		if (deleteTarget) {
			dialogEl?.focus();
		}
	});

	function openDeleteModal(set: SetSummary) {
		deleteTarget = set;
	}

	function closeDeleteModal() {
		deleteTarget = null;
	}

	let editTarget = $state<SetSummary | null>(null);
	let editWeight = $state('');
	let editReps = $state('');
	let editDialogEl = $state<HTMLElement | null>(null);

	$effect(() => {
		if (editTarget) {
			editDialogEl?.focus();
		}
	});

	function openEditModal(set: SetSummary) {
		editWeight = String(set.weight_kg);
		editReps = String(set.repetitions);
		editTarget = set;
	}

	function closeEditModal() {
		editTarget = null;
	}
</script>

<svelte:head>
	<title>{exercise.name} - {t('app.name', locale)}</title>
</svelte:head>

<div class="mb-4">
	<Button variant="ghost" href="/exercises">
		&larr; {t('exercises.back', locale)}
	</Button>
</div>

<h1 class="mb-8 text-2xl font-bold">{exercise.name}</h1>

<section class="mb-8">
	<h2 class="mb-4 text-lg font-semibold">{isToday ? t('workout.today', locale) : selectedDate}</h2>

	{#if form?.error}
		<div class="mb-4">
			<Alert type="error">
				{form.error}
			</Alert>
		</div>
	{/if}

	<div class="mb-4">
		<Input
			label={t('workout.date', locale)}
			name="date"
			type="date"
			max={today}
			value={selectedDate}
			onchange={handleDateChange}
		/>
	</div>

	<Card>
		<form method="POST" action="?/logSet" class="flex flex-col gap-4">
			<input type="hidden" name="workout_date" value={selectedDate} />
			<div class="flex gap-4">
				<div class="flex-1">
					<Input
						label={t('workout.weight', locale)}
						name="weight_kg"
						type="text"
						inputmode="decimal"
						bind:value={weight}
						required
						placeholder="0.0"
					/>
				</div>
				<div class="flex-1">
					<Input
						label={t('workout.reps', locale)}
						name="repetitions"
						type="text"
						inputmode="numeric"
						bind:value={reps}
						required
						placeholder="0"
					/>
				</div>
			</div>
			<Button variant="primary" type="submit">
				{t('workout.submit', locale)}
			</Button>
		</form>
	</Card>

	{#if selectedDateSets.length > 0}
		<ul class="mt-4 flex flex-col gap-2">
			{#each selectedDateSets as set (set.set_number)}
				<li>
					<Card>
						<div class="flex flex-wrap items-center justify-between gap-2">
							<span class="text-stone-500 dark:text-stone-400"
								>{t('workout.set', locale)} {set.set_number}</span
							>
							<div class="flex items-center gap-1">
								<span class="font-medium">{set.weight_kg} kg &times; {set.repetitions}</span>
								<Button
									variant="ghost"
									ariaLabel={t('workout.edit', locale)}
									onclick={() => openEditModal(set)}
								>
									<svg
										xmlns="http://www.w3.org/2000/svg"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="2"
										stroke-linecap="round"
										stroke-linejoin="round"
										class="h-5 w-5"
										aria-hidden="true"
									>
										<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
									</svg>
								</Button>
								<Button
									variant="ghost"
									ariaLabel={t('workout.delete', locale)}
									onclick={() => openDeleteModal(set)}
								>
									<svg
										xmlns="http://www.w3.org/2000/svg"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="2"
										stroke-linecap="round"
										stroke-linejoin="round"
										class="h-5 w-5"
										aria-hidden="true"
									>
										<path d="M3 6h18" />
										<path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
										<path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
										<line x1="10" y1="11" x2="10" y2="17" />
										<line x1="14" y1="11" x2="14" y2="17" />
									</svg>
								</Button>
							</div>
						</div>
					</Card>
				</li>
			{/each}
		</ul>

		{#if selectedDateComment}
			<Card>
				<p class="text-sm text-stone-700 dark:text-stone-300">{selectedDateComment}</p>
			</Card>
		{/if}

		<Card>
			<form method="POST" action="?/saveComment" class="flex flex-col gap-4">
				<input type="hidden" name="workout_date" value={selectedDate} />
				<Textarea
					label={t('workout.comment', locale)}
					name="comment"
					bind:value={comment}
					maxlength={500}
					placeholder={t('workout.commentPlaceholder', locale)}
				/>
				<Button variant="secondary" type="submit">
					{t('workout.saveComment', locale)}
				</Button>
			</form>
		</Card>
	{/if}
</section>

{#if previousSessions.length > 0}
	<section>
		<h2 class="mb-4 text-lg font-semibold">{t('workout.history', locale)}</h2>
		<div class="flex flex-col gap-6">
			{#each previousSessions as session (session.workout_date)}
				<div>
					<button
						type="button"
						class="mb-2 cursor-pointer rounded text-sm font-medium text-stone-500 transition-colors hover:text-stone-700 focus:ring-2 focus:ring-primary-500 focus:outline-none dark:text-stone-400 dark:hover:text-stone-300"
						aria-expanded={isExpanded(session) ? 'true' : 'false'}
						onclick={() => toggleExpanded(session)}
					>
						{session.workout_date}
					</button>
					{#if isExpanded(session)}
						{#if session.comment}
							<p class="mb-2 text-sm text-stone-700 dark:text-stone-300">{session.comment}</p>
						{/if}
						{#if session.sets.length > 0}
							<ul class="flex flex-col gap-1">
								{#each session.sets as set (set.set_number)}
									<li>
										<Card>
											<div class="flex items-center justify-between">
												<span class="text-stone-500 dark:text-stone-400"
													>{t('workout.set', locale)} {set.set_number}</span
												>
												<span>{set.weight_kg} kg &times; {set.repetitions}</span>
											</div>
										</Card>
									</li>
								{/each}
							</ul>
						{/if}
					{/if}
				</div>
			{/each}
		</div>
	</section>
{/if}

{#if deleteTarget}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
		role="presentation"
		onclick={(event) => {
			if (event.target === event.currentTarget) closeDeleteModal();
		}}
		onkeydown={(event) => {
			if (event.key === 'Escape') closeDeleteModal();
		}}
	>
		<div
			class="w-full max-w-sm"
			role="dialog"
			aria-modal="true"
			aria-label={t('workout.deleteConfirm', locale)}
			tabindex="-1"
			bind:this={dialogEl}
		>
			<Card>
				<h2 class="mb-2 text-lg font-semibold">{t('workout.deleteConfirm', locale)}</h2>
				<p class="mb-4 text-sm text-stone-600 dark:text-stone-300">
					{t('workout.set', locale)}
					{deleteTarget.set_number}: {deleteTarget.weight_kg} kg &times; {deleteTarget.repetitions}
				</p>
				<form method="POST" action="?/deleteSet" class="flex justify-end gap-2">
					<input type="hidden" name="workout_date" value={selectedDate} />
					<input type="hidden" name="set_number" value={deleteTarget.set_number} />
					<Button variant="secondary" type="button" onclick={closeDeleteModal}>
						{t('workout.cancel', locale)}
					</Button>
					<Button variant="primary" type="submit">
						{t('workout.confirm', locale)}
					</Button>
				</form>
			</Card>
		</div>
	</div>
{/if}

{#if editTarget}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
		role="presentation"
		onclick={(event) => {
			if (event.target === event.currentTarget) closeEditModal();
		}}
		onkeydown={(event) => {
			if (event.key === 'Escape') closeEditModal();
		}}
	>
		<div
			class="w-full max-w-sm"
			role="dialog"
			aria-modal="true"
			aria-label={t('workout.edit', locale)}
			tabindex="-1"
			bind:this={editDialogEl}
		>
			<Card>
				<h2 class="mb-2 text-lg font-semibold">{t('workout.edit', locale)}</h2>
				<p class="mb-4 text-sm text-stone-600 dark:text-stone-300">
					{t('workout.set', locale)}
					{editTarget.set_number}
				</p>
				<form method="POST" action="?/editSet" class="flex flex-col gap-4">
					<input type="hidden" name="workout_date" value={selectedDate} />
					<input type="hidden" name="set_number" value={editTarget.set_number} />
					<div class="flex gap-4">
						<div class="flex-1">
							<Input
								label={t('workout.weight', locale)}
								name="weight_kg"
								type="text"
								inputmode="decimal"
								bind:value={editWeight}
								required
								placeholder="0.0"
							/>
						</div>
						<div class="flex-1">
							<Input
								label={t('workout.reps', locale)}
								name="repetitions"
								type="text"
								inputmode="numeric"
								bind:value={editReps}
								required
								placeholder="0"
							/>
						</div>
					</div>
					<div class="flex justify-end gap-2">
						<Button variant="secondary" type="button" onclick={closeEditModal}>
							{t('workout.cancel', locale)}
						</Button>
						<Button variant="primary" type="submit">
							{t('workout.confirm', locale)}
						</Button>
					</div>
				</form>
			</Card>
		</div>
	</div>
{/if}
