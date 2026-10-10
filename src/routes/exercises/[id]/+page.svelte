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
	import Modal from '$lib/components/Modal.svelte';
	import EditIcon from '$lib/components/icons/EditIcon.svelte';
	import DeleteIcon from '$lib/components/icons/DeleteIcon.svelte';
	import ExerciseIcon from '$lib/components/ExerciseIcon.svelte';
	import { resolveExerciseIcon } from '$lib/icons/exercise-icons';
	import CardioFields from './CardioFields.svelte';
	import CardioEntryView from './CardioEntryView.svelte';
	import type { SetSummary, CardioEntrySummary } from './utils';
	import { isOldSession, formatDuration, formatDistanceKm } from './utils';

	let { data, form }: { data: PageData; form: import('./$types').ActionData } = $props();

	const locale = $derived(data.locale as Locale);
	const exercise = $derived(data.exercise);
	const isCardio = $derived(exercise.kind === 'cardio');
	const today = $derived(data.today);
	const selectedDate = $derived(data.selectedDate);
	const isToday = $derived(data.isToday);
	const selectedDateSets = $derived(data.selectedDateSets ?? []);
	const selectedDateCardioEntries = $derived(data.selectedDateCardioEntries ?? []);
	const selectedDateComment = $derived(data.selectedDateComment ?? null);
	const previousSessions = $derived(data.previousSessions ?? []);
	const latestHistoryDate = $derived(previousSessions[0]?.workout_date);
	const hasSelectedDateEntries = $derived(
		isCardio ? selectedDateCardioEntries.length > 0 : selectedDateSets.length > 0
	);

	let weight = $state(data.lastSet ? String(data.lastSet.weight_kg) : '');
	let reps = $state(data.lastSet ? String(data.lastSet.repetitions) : '');
	let comment = $state(data.selectedDateComment ?? '');

	// Cardio log form fields: never prefilled from previous entries (product
	// owner decision), so they stay empty across date navigation.
	let hours = $state('');
	let minutes = $state('');
	let seconds = $state('');
	let distanceKm = $state('');
	let description = $state('');

	// Client-side date navigation (goto) reuses this component instance without
	// re-running <script>, so re-sync the form fields whenever data changes.
	// The cardio log fields are cleared on every data change *except* a failed
	// action: `form` is non-null only when an action returned `fail(...)`, and
	// wiping the fields then would discard the user's just-typed input while
	// the error alert is shown. On success the page reloads (or `form` is null
	// after an enhanced submit), so submitted cardio values never linger to be
	// logged twice (cardio fields are never prefilled by design).
	$effect(() => {
		weight = data.lastSet ? String(data.lastSet.weight_kg) : '';
		reps = data.lastSet ? String(data.lastSet.repetitions) : '';
		comment = data.selectedDateComment ?? '';
		if (!form) {
			hours = '';
			minutes = '';
			seconds = '';
			distanceKm = '';
			description = '';
		}
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

	function openDeleteModal(set: SetSummary) {
		deleteTarget = set;
	}

	function closeDeleteModal() {
		deleteTarget = null;
	}

	let editTarget = $state<SetSummary | null>(null);
	let editWeight = $state('');
	let editReps = $state('');

	function openEditModal(set: SetSummary) {
		editWeight = String(set.weight_kg);
		editReps = String(set.repetitions);
		editTarget = set;
	}

	function closeEditModal() {
		editTarget = null;
	}

	let cardioDeleteTarget = $state<CardioEntrySummary | null>(null);

	function openCardioDeleteModal(entry: CardioEntrySummary) {
		cardioDeleteTarget = entry;
	}

	function closeCardioDeleteModal() {
		cardioDeleteTarget = null;
	}

	let cardioEditTarget = $state<CardioEntrySummary | null>(null);
	let cardioEditHours = $state('');
	let cardioEditMinutes = $state('');
	let cardioEditSeconds = $state('');
	let cardioEditDistance = $state('');
	let cardioEditDescription = $state('');

	function openCardioEditModal(entry: CardioEntrySummary) {
		cardioEditHours = String(Math.floor(entry.duration_seconds / 3600));
		cardioEditMinutes = String(Math.floor((entry.duration_seconds % 3600) / 60));
		cardioEditSeconds = String(entry.duration_seconds % 60);
		cardioEditDistance = entry.distance_m !== null ? String(entry.distance_m / 1000) : '';
		cardioEditDescription = entry.description ?? '';
		cardioEditTarget = entry;
	}

	function closeCardioEditModal() {
		cardioEditTarget = null;
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

<div class="mb-8 flex items-center gap-3">
	<span class="text-stone-500 dark:text-stone-400"
		><ExerciseIcon id={resolveExerciseIcon(exercise.kind, exercise.icon)} class="h-7 w-7" /></span
	>
	<h1 class="text-2xl font-bold">{exercise.name}</h1>
</div>

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
		{#if isCardio}
			<form method="POST" action="?/logCardio" class="flex flex-col gap-4">
				<input type="hidden" name="workout_date" value={selectedDate} />
				<CardioFields
					{locale}
					bind:hours
					bind:minutes
					bind:seconds
					bind:distanceKm
					bind:description
				/>
				<Button variant="primary" type="submit">
					{t('workout.submitCardio', locale)}
				</Button>
			</form>
		{:else}
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
		{/if}
	</Card>

	{#if hasSelectedDateEntries}
		{#if isCardio}
			<ul class="mt-4 flex flex-col gap-2">
				{#each selectedDateCardioEntries as entry (entry.id)}
					<li>
						<Card>
							<div class="flex flex-wrap items-center justify-between gap-2">
								<CardioEntryView {entry} />
								<div class="flex items-center gap-1">
									<Button
										variant="ghost"
										ariaLabel={t('workout.edit', locale)}
										onclick={() => openCardioEditModal(entry)}
									>
										<EditIcon />
									</Button>
									<Button
										variant="ghost"
										ariaLabel={t('workout.delete', locale)}
										onclick={() => openCardioDeleteModal(entry)}
									>
										<DeleteIcon />
									</Button>
								</div>
							</div>
						</Card>
					</li>
				{/each}
			</ul>
		{:else}
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
										<EditIcon />
									</Button>
									<Button
										variant="ghost"
										ariaLabel={t('workout.delete', locale)}
										onclick={() => openDeleteModal(set)}
									>
										<DeleteIcon />
									</Button>
								</div>
							</div>
						</Card>
					</li>
				{/each}
			</ul>
		{/if}

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
						{#if session.entries && session.entries.length > 0}
							<ul class="flex flex-col gap-1">
								{#each session.entries as entry (entry.id)}
									<li>
										<Card>
											<CardioEntryView {entry} compact />
										</Card>
									</li>
								{/each}
							</ul>
						{:else if session.sets && session.sets.length > 0}
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
	<Modal label={t('workout.deleteConfirm', locale)} onclose={closeDeleteModal}>
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
	</Modal>
{/if}

{#if editTarget}
	<Modal label={t('workout.edit', locale)} onclose={closeEditModal}>
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
	</Modal>
{/if}

{#if cardioDeleteTarget}
	<Modal label={t('workout.deleteCardioConfirm', locale)} onclose={closeCardioDeleteModal}>
		<h2 class="mb-2 text-lg font-semibold">{t('workout.deleteCardioConfirm', locale)}</h2>
		<p class="mb-4 text-sm text-stone-600 dark:text-stone-300">
			{formatDuration(cardioDeleteTarget.duration_seconds)}
			{#if cardioDeleteTarget.distance_m !== null}
				&middot; {formatDistanceKm(cardioDeleteTarget.distance_m)}
			{/if}
		</p>
		<form method="POST" action="?/deleteCardio" class="flex justify-end gap-2">
			<input type="hidden" name="workout_date" value={selectedDate} />
			<input type="hidden" name="cardio_entry_id" value={cardioDeleteTarget.id} />
			<Button variant="secondary" type="button" onclick={closeCardioDeleteModal}>
				{t('workout.cancel', locale)}
			</Button>
			<Button variant="primary" type="submit">
				{t('workout.confirm', locale)}
			</Button>
		</form>
	</Modal>
{/if}

{#if cardioEditTarget}
	<Modal label={t('workout.edit', locale)} onclose={closeCardioEditModal}>
		<h2 class="mb-2 text-lg font-semibold">{t('workout.edit', locale)}</h2>
		<form method="POST" action="?/editCardio" class="flex flex-col gap-4">
			<input type="hidden" name="workout_date" value={selectedDate} />
			<input type="hidden" name="cardio_entry_id" value={cardioEditTarget.id} />
			<CardioFields
				{locale}
				bind:hours={cardioEditHours}
				bind:minutes={cardioEditMinutes}
				bind:seconds={cardioEditSeconds}
				bind:distanceKm={cardioEditDistance}
				bind:description={cardioEditDescription}
			/>
			<div class="flex justify-end gap-2">
				<Button variant="secondary" type="button" onclick={closeCardioEditModal}>
					{t('workout.cancel', locale)}
				</Button>
				<Button variant="primary" type="submit">
					{t('workout.confirm', locale)}
				</Button>
			</div>
		</form>
	</Modal>
{/if}
