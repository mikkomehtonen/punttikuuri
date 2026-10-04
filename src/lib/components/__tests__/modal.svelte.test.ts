import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import Modal from '../Modal.svelte';

function snippet(text: string) {
	return createRawSnippet(() => ({ render: () => `<p>${text}</p>` }));
}

function setup() {
	const onclose = vi.fn();
	const { container } = render(Modal, {
		props: { label: 'Delete item', onclose, children: snippet('Are you sure?') }
	});
	return { container, onclose };
}

describe('Modal', () => {
	afterEach(() => {
		document.body.innerHTML = '';
	});

	it('renders a labelled dialog containing the children', () => {
		const { container } = setup();
		const dialog = container.querySelector('[role="dialog"]');
		expect(dialog).not.toBeNull();
		expect(dialog?.getAttribute('aria-label')).toBe('Delete item');
		expect(container.textContent).toContain('Are you sure?');
	});

	it('calls onclose when the backdrop is clicked', async () => {
		const { container, onclose } = setup();
		const backdrop = container.querySelector('[role="presentation"]');
		expect(backdrop).not.toBeNull();
		await fireEvent.click(backdrop!);
		expect(onclose).toHaveBeenCalledTimes(1);
	});

	it('does not call onclose when the dialog panel is clicked', async () => {
		const { container, onclose } = setup();
		const dialog = container.querySelector('[role="dialog"]');
		expect(dialog).not.toBeNull();
		await fireEvent.click(dialog!);
		expect(onclose).not.toHaveBeenCalled();
	});

	it('calls onclose on Escape keydown', async () => {
		const { container, onclose } = setup();
		const backdrop = container.querySelector('[role="presentation"]');
		expect(backdrop).not.toBeNull();
		await fireEvent.keyDown(backdrop!, { key: 'Escape' });
		expect(onclose).toHaveBeenCalledTimes(1);
	});
});
