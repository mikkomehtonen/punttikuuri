import { describe, it, expect } from 'vitest';
import { render } from 'svelte/server';
import { createRawSnippet } from 'svelte';
import Button from '../Button.svelte';
import Input from '../Input.svelte';
import Card from '../Card.svelte';
import Alert from '../Alert.svelte';
import Badge from '../Badge.svelte';

function snippet(text: string) {
	return createRawSnippet(() => ({ render: () => text }));
}

describe('Button', () => {
	it('renders <a> when href is provided', () => {
		const { body } = render(Button, {
			props: { href: '/login', children: snippet('Click me') }
		});
		expect(body).toContain('href="/login"');
		expect(body).toContain('Click me');
		expect(body).toContain('bg-primary-600');
	});

	it('renders <button> when href is omitted', () => {
		const { body } = render(Button, {
			props: { children: snippet('Submit') }
		});
		expect(body).toContain('<button');
		expect(body).toContain('bg-primary-600');
		expect(body).toContain('type="button"');
		expect(body).toContain('Submit');
	});

	it('renders secondary variant', () => {
		const { body } = render(Button, {
			props: { variant: 'secondary', children: snippet('Secondary') }
		});
		expect(body).toContain('border-primary-600');
	});

	it('renders ghost variant', () => {
		const { body } = render(Button, {
			props: { variant: 'ghost', children: snippet('Ghost') }
		});
		expect(body).toContain('text-stone-600');
	});
});

describe('Input', () => {
	it('renders label and input with name', () => {
		const { body } = render(Input, {
			props: { label: 'Weight', name: 'weight_kg' }
		});
		expect(body).toContain('Weight');
		expect(body).toContain('name="weight_kg"');
	});

	it('renders error message when error prop is set', () => {
		const { body } = render(Input, {
			props: { label: 'Name', name: 'name', error: 'Required field' }
		});
		expect(body).toContain('Required field');
		expect(body).toContain('text-red-600');
	});
});

describe('Card', () => {
	it('renders <div> by default with children', () => {
		const { body } = render(Card, {
			props: { children: snippet('Card content') }
		});
		expect(body).toContain('rounded-xl');
		expect(body).toContain('Card content');
	});

	it('renders <a> when href is provided', () => {
		const { body } = render(Card, {
			props: { href: '/exercises/1', children: snippet('Link card') }
		});
		expect(body).toContain('href="/exercises/1"');
		expect(body).toContain('Link card');
	});
});

describe('Alert', () => {
	it('renders error alert', () => {
		const { body } = render(Alert, {
			props: { type: 'error', children: snippet('Something went wrong') }
		});
		expect(body).toContain('border-red-400');
		expect(body).toContain('Something went wrong');
	});

	it('renders success alert', () => {
		const { body } = render(Alert, {
			props: { type: 'success', children: snippet('All good') }
		});
		expect(body).toContain('border-green-400');
		expect(body).toContain('All good');
	});
});

describe('Badge', () => {
	it('renders children text with badge classes', () => {
		const { body } = render(Badge, {
			props: { children: snippet('BP') }
		});
		expect(body).toContain('rounded-md');
		expect(body).toContain('bg-primary-50');
		expect(body).toContain('BP');
	});
});
