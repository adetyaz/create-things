/**
 * Motion helpers for Svelte transitions (design system 03: 240 ms ease-out for UI).
 * Transform and opacity only, so the browser animates them on the compositor (60–120 fps).
 * With reduced motion on, things fade without moving.
 */
import type { TransitionConfig } from 'svelte/transition';

/** The same curve as --ease-out: cubic-bezier(0.23, 1, 0.32, 1). */
export function easeOut(t: number) {
	// Close match to the bezier above; a cubic-out tail with a quicker start.
	return 1 - Math.pow(1 - t, 3.4);
}

export const reduced = () =>
	typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Fade plus a small move and/or scale, from where the element would be. */
export function rise(
	_node: Element,
	{
		y = 0,
		x = 0,
		scale = 1,
		duration = 240,
		delay = 0
	}: { y?: number; x?: number; scale?: number; duration?: number; delay?: number } = {}
): TransitionConfig {
	if (reduced()) return { duration: 160, css: (t) => `opacity: ${t}` };
	return {
		duration,
		delay,
		easing: easeOut,
		css: (t, u) =>
			`opacity: ${t}; transform: translate(${x * u}px, ${y * u}px) scale(${scale + (1 - scale) * t})`
	};
}
