/**
 * What the constant (the sky and the pet) shows on every app screen: the pet, its mood and why,
 * and credits. One copy, so the strip, Today and the menu agree; refresh() after anything that
 * feeds the pet or spends credits.
 */
import { api } from '$lib/api';

export type PetView = {
	pet: { name: string; species: string; food: string };
	mood: string;
	why: string;
	next: string | null;
	today: { eaten: number; limit: number; full: boolean };
	history: { label: string; size: 'snack' | 'meal' | 'feast'; at: string }[];
};
export type Credits = { balance: number; freeDaily: number; freeLeftToday: number };

export const shell = $state<{
	pet: PetView | null;
	credits: Credits | null;
	loaded: boolean;
	/** The pet's 3D action, e.g. 'eat' for a moment after it's fed. */
	action: string;
	/** The storyboard menu is open. */
	menu: boolean;
}>({ pet: null, credits: null, loaded: false, action: 'auto', menu: false });

export async function refreshShell() {
	const [p, c] = await Promise.all([
		api<{ pet: PetView | null }>('/api/pet').catch(() => null),
		api<Credits>('/api/credits').catch(() => null)
	]);
	if (p) shell.pet = p.pet;
	if (c) shell.credits = c;
	shell.loaded = true;
}

/** The pet eats on screen for a moment, then carries on. */
export function feedMoment() {
	shell.action = 'eat';
	setTimeout(() => (shell.action = 'auto'), 2600);
	void refreshShell();
}

/** Server mood → the 3D pet's state (design 07). */
export const PET_STATE: Record<string, string> = {
	happy: 'happy',
	resting: 'happy',
	peckish: 'peckish',
	hungry: 'hungry',
	starving: 'starving',
	ran_away: 'ran',
	dead: 'died'
};

/** Design 11/13: what the room looks like for each mood. */
export const ROOM: Record<
	string,
	{
		dust: number;
		webs: string;
		dot: string;
		short: (n: string) => string;
		title: (n: string) => string;
	}
> = {
	happy: {
		dust: 0,
		webs: '',
		dot: 'oklch(0.6 0.15 145)',
		short: (n) => `${n} is happy`,
		title: (n) => `${n} is happy`
	},
	peckish: {
		dust: 0.55,
		webs: '',
		dot: 'oklch(0.75 0.12 80)',
		short: (n) => `${n} is peckish`,
		title: (n) => `${n} is peckish`
	},
	hungry: {
		dust: 0.8,
		webs: 'tr',
		dot: 'oklch(0.6 0.15 35)',
		short: (n) => `${n} is hungry`,
		title: (n) => `${n} is hungry`
	},
	starving: {
		dust: 1,
		webs: 'tr,tl',
		dot: 'oklch(0.6 0.15 35)',
		short: (n) => `${n} is starving`,
		title: (n) => `${n} is weak`
	},
	ran: {
		dust: 1,
		webs: 'tr,tl',
		dot: '#78736A',
		short: (n) => `${n} ran away`,
		title: () => 'The bed is empty'
	},
	died: {
		dust: 0.6,
		webs: 'tr,tl',
		dot: '#78736A',
		short: (n) => `In memory of ${n}`,
		title: (n) => `In memory of ${n}`
	},
	egg: {
		dust: 0,
		webs: '',
		dot: '#78736A',
		short: () => 'No pet yet',
		title: () => 'Meet your pet'
	}
};

/** Design 12: time of day from the visitor's clock. */
export function timeOfDay(h: number) {
	return h >= 5 && h < 8.5
		? 'dawn'
		: h >= 8.5 && h < 17.5
			? 'day'
			: h >= 17.5 && h < 20.5
				? 'sunset'
				: 'night';
}
export type TimeOfDay = ReturnType<typeof timeOfDay>;
export const FLOOR: Record<TimeOfDay, string> = {
	dawn: '#E7DCD2',
	day: '#ECE6DA',
	sunset: '#E3D2C3',
	night: '#2B2D3D'
};
/** Design 12: glass over the sky (light by day, night glass otherwise). */
export function glassFor(tod: TimeOfDay) {
	return tod === 'day'
		? {
				bg: 'rgba(255,255,255,.5)',
				ink: '#1B1A17',
				meta: '#57534B',
				ring: 'inset 0 0 0 1px rgba(255,255,255,.65)'
			}
		: {
				bg: 'rgba(22,24,38,.42)',
				ink: '#F6F4EF',
				meta: '#D9D4CA',
				ring: 'inset 0 0 0 1px rgba(255,255,255,.14)'
			};
}
