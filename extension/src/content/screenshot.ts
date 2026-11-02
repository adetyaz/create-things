/**
 * Page script on every page: the area picker (Alt+Shift+A or the popup's Pick area) and the toast
 * shown after any save, with "Keep as reference instead" and Undo.
 * Type-only imports: content scripts can't load shared chunks.
 */
import type { Shown, ToastMessage } from '../background/service-worker';

let overlay: HTMLDivElement | null = null;
let selectionBox: HTMLDivElement | null = null;
let confirmBtn: HTMLButtonElement | null = null;
let startX = 0;
let startY = 0;
let isDrawing = false;

function cleanup() {
	overlay?.remove();
	overlay = null;
	selectionBox = null;
	confirmBtn = null;
	isDrawing = false;
	document.removeEventListener('keydown', handleKeydown);
}

function handleKeydown(e: KeyboardEvent) {
	if (e.key === 'Escape') {
		cleanup();
	}
}

function createOverlay() {
	cleanup();

	overlay = document.createElement('div');
	overlay.id = 'ct-screenshot-overlay';
	Object.assign(overlay.style, {
		position: 'fixed',
		top: '0',
		left: '0',
		width: '100vw',
		height: '100vh',
		zIndex: '2147483647',
		cursor: 'crosshair',
		background: 'transparent'
	});

	// Dark backdrop using box-shadow trick — selection area stays clear
	const backdrop = document.createElement('div');
	backdrop.id = 'ct-backdrop';
	Object.assign(backdrop.style, {
		position: 'fixed',
		top: '0',
		left: '0',
		width: '100vw',
		height: '100vh',
		background: 'rgba(0, 0, 0, 0.5)',
		pointerEvents: 'none'
	});

	selectionBox = document.createElement('div');
	selectionBox.id = 'ct-selection';
	Object.assign(selectionBox.style, {
		position: 'fixed',
		border: '2px solid #1D9E75',
		background: 'transparent',
		display: 'none',
		zIndex: '2147483647',
		pointerEvents: 'none',
		boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)'
	});

	overlay.appendChild(backdrop);
	overlay.appendChild(selectionBox);
	document.body.appendChild(overlay);
	document.addEventListener('keydown', handleKeydown);

	overlay.addEventListener('mousedown', onMouseDown);
	overlay.addEventListener('mousemove', onMouseMove);
	overlay.addEventListener('mouseup', onMouseUp);
}

function onMouseDown(e: MouseEvent) {
	isDrawing = true;
	startX = e.clientX;
	startY = e.clientY;

	if (selectionBox) {
		selectionBox.style.display = 'block';
		selectionBox.style.left = `${startX}px`;
		selectionBox.style.top = `${startY}px`;
		selectionBox.style.width = '0px';
		selectionBox.style.height = '0px';
	}

	// Remove backdrop once user starts drawing — selection box shadow handles it
	const backdrop = document.getElementById('ct-backdrop');
	if (backdrop) backdrop.style.display = 'none';

	confirmBtn?.remove();
	confirmBtn = null;
}

function onMouseMove(e: MouseEvent) {
	if (!isDrawing || !selectionBox) return;

	const x = Math.min(e.clientX, startX);
	const y = Math.min(e.clientY, startY);
	const w = Math.abs(e.clientX - startX);
	const h = Math.abs(e.clientY - startY);

	selectionBox.style.left = `${x}px`;
	selectionBox.style.top = `${y}px`;
	selectionBox.style.width = `${w}px`;
	selectionBox.style.height = `${h}px`;
}

function onMouseUp(e: MouseEvent) {
	if (!isDrawing || !selectionBox) return;
	isDrawing = false;

	const w = Math.abs(e.clientX - startX);
	const h = Math.abs(e.clientY - startY);

	// Ignore tiny selections (probably accidental clicks)
	if (w < 10 || h < 10) {
		selectionBox.style.display = 'none';
		const backdrop = document.getElementById('ct-backdrop');
		if (backdrop) backdrop.style.display = 'block';
		return;
	}

	showConfirmButton();
}

/** Button size, roughly, for keeping it on screen. */
const BUTTON_W = 90;
const BUTTON_H = 32;

/**
 * Where the Capture button goes: below the box, or above it when the box reaches the bottom of
 * the screen, or inside it when it fills the screen; never off the edges.
 */
function buttonSpot(box: HTMLDivElement): { left: number; top: number } {
	const x = parseInt(box.style.left);
	const y = parseInt(box.style.top);
	const w = parseInt(box.style.width);
	const h = parseInt(box.style.height);
	const gap = 12;
	let top = y + h + gap;
	if (top + BUTTON_H > window.innerHeight - 8) top = y - gap - BUTTON_H;
	if (top < 8) top = y + h - BUTTON_H - gap;
	const left = Math.min(Math.max(x + w / 2 - BUTTON_W / 2, 8), window.innerWidth - BUTTON_W - 8);
	return { left, top: Math.min(Math.max(top, 8), window.innerHeight - BUTTON_H - 8) };
}

function showConfirmButton() {
	if (!selectionBox || !overlay) return;

	confirmBtn = document.createElement('button');
	confirmBtn.textContent = 'Capture';
	const { left, top } = buttonSpot(selectionBox);
	Object.assign(confirmBtn.style, {
		position: 'fixed',
		left: `${left}px`,
		top: `${top}px`,
		boxShadow: '0 2px 10px rgba(0,0,0,0.3)',
		zIndex: '2147483647',
		background: '#1D9E75',
		color: 'white',
		border: 'none',
		borderRadius: '6px',
		padding: '6px 16px',
		fontSize: '13px',
		fontWeight: '500',
		cursor: 'pointer',
		fontFamily: 'system-ui, -apple-system, sans-serif'
	});

	confirmBtn.addEventListener('click', captureSelection);
	confirmBtn.addEventListener('mousedown', (e) => e.stopPropagation());
	confirmBtn.addEventListener('mouseup', (e) => e.stopPropagation());
	overlay.appendChild(confirmBtn);
}

async function captureSelection() {
	if (!selectionBox) return;

	const rect = {
		x: parseInt(selectionBox.style.left),
		y: parseInt(selectionBox.style.top),
		width: parseInt(selectionBox.style.width),
		height: parseInt(selectionBox.style.height)
	};

	cleanup();

	// Ask background to capture the visible tab, then crop client-side
	const response = await chrome.runtime.sendMessage({ type: 'CAPTURE_VISIBLE_TAB' });

	if (!response.success) return;

	const croppedDataUrl = await cropImage(response.dataUrl, rect);

	// The worker saves it and shows the toast.
	void chrome.runtime.sendMessage({ type: 'SAVE_AREA_SCREENSHOT', dataUrl: croppedDataUrl });
}

/** How long the toast stays, unless the pointer is on it. */
const TOAST_MS = 6000;

function styled<K extends keyof HTMLElementTagNameMap>(
	tag: K,
	style: Partial<CSSStyleDeclaration>,
	text?: string
): HTMLElementTagNameMap[K] {
	const el = document.createElement(tag);
	Object.assign(el.style, style);
	if (text) el.textContent = text;
	return el;
}

const linkButton: Partial<CSSStyleDeclaration> = {
	background: 'none',
	border: 'none',
	padding: '0',
	color: '#6d28d9',
	font: 'inherit',
	fontWeight: '600',
	cursor: 'pointer',
	textDecoration: 'underline'
};

/** The saved image, small; click to see it bigger and check it's what you meant. */
function thumbnail(src: string): HTMLImageElement {
	const img = styled('img', {
		width: '56px',
		height: '56px',
		objectFit: 'cover',
		borderRadius: '8px',
		border: '1px solid #e5e7eb',
		cursor: 'zoom-in',
		flexShrink: '0'
	});
	img.src = src;
	img.alt = 'What was saved';
	img.title = 'Click to see it bigger';
	let big = false;
	img.addEventListener('click', () => {
		big = !big;
		Object.assign(img.style, {
			width: big ? '100%' : '56px',
			height: big ? 'auto' : '56px',
			maxHeight: big ? '60vh' : '56px',
			objectFit: big ? 'contain' : 'cover',
			cursor: big ? 'zoom-out' : 'zoom-in'
		});
		img.title = big ? 'Click to make it small' : 'Click to see it bigger';
	});
	return img;
}

const KIND_LABEL: Record<Shown['kind'], string> = { link: 'Link', text: 'Text', image: 'Image' };

/** A square saying what kind of thing it is, when there's no image to show. */
function kindBadge(kind: Shown['kind']): HTMLSpanElement {
	return styled(
		'span',
		{
			width: '56px',
			height: '56px',
			borderRadius: '8px',
			background: '#f5f3ff',
			color: '#6d28d9',
			fontSize: '11px',
			fontWeight: '600',
			display: 'flex',
			alignItems: 'center',
			justifyContent: 'center',
			flexShrink: '0'
		},
		KIND_LABEL[kind]
	);
}

/** What was saved: its image (or kind), title and where it's from. */
function savedCard(shown: Shown): HTMLDivElement {
	const card = styled('div', {
		display: 'flex',
		flexWrap: 'wrap',
		gap: '10px',
		alignItems: 'center'
	});
	if (shown.image) {
		const img = thumbnail(shown.image);
		// Some sites block their images from loading elsewhere: show the kind instead.
		img.addEventListener('error', () => img.replaceWith(kindBadge(shown.kind)));
		card.append(img);
	} else {
		card.append(kindBadge(shown.kind));
	}
	const words = styled('div', { flex: '1', minWidth: '0' });
	const title = styled(
		'div',
		{
			fontWeight: '600',
			display: '-webkit-box',
			webkitLineClamp: '2',
			webkitBoxOrient: 'vertical',
			overflow: 'hidden'
		},
		shown.title
	);
	words.append(title);
	if (shown.detail) {
		words.append(
			styled(
				'div',
				{
					color: '#6b7280',
					fontSize: '12px',
					whiteSpace: 'nowrap',
					overflow: 'hidden',
					textOverflow: 'ellipsis'
				},
				shown.detail
			)
		);
	}
	card.append(words);
	return card;
}

/** What was saved, then "Saved. Keep as reference instead · Undo" (or the error), for 6 seconds. */
function showToast(message: ToastMessage) {
	document.getElementById('ct-saved-toast')?.remove();
	const toast = styled('div', {
		position: 'fixed',
		bottom: '24px',
		right: '24px',
		zIndex: '2147483647',
		maxWidth: 'calc(100vw - 48px)',
		background: '#ffffff',
		border: '1px solid #e5e7eb',
		borderRadius: '12px',
		boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
		width: '340px',
		padding: '12px 14px',
		display: 'flex',
		flexDirection: 'column',
		gap: '10px',
		fontFamily: 'system-ui, -apple-system, sans-serif',
		fontSize: '13px',
		lineHeight: '1.4',
		color: '#111827',
		transition: 'opacity 0.3s ease'
	});
	toast.id = 'ct-saved-toast';
	toast.setAttribute('role', 'status');

	const row = styled('div', { display: 'flex', alignItems: 'center', gap: '10px' });
	const body = styled('span', { flex: '1' });
	const close = styled(
		'button',
		{ ...linkButton, color: '#9ca3af', textDecoration: 'none', fontSize: '16px' },
		'×'
	);
	close.setAttribute('aria-label', 'Close');
	close.addEventListener('click', () => toast.remove());
	row.append(body, close);
	if (message.ok) toast.append(savedCard(message.shown));
	toast.append(row);

	let timer = 0;
	const dismissLater = () => {
		clearTimeout(timer);
		timer = window.setTimeout(() => {
			toast.style.opacity = '0';
			setTimeout(() => toast.remove(), 300);
		}, TOAST_MS);
	};
	toast.addEventListener('mouseenter', () => clearTimeout(timer));
	toast.addEventListener('mouseleave', dismissLater);

	const say = (text: string) => body.replaceChildren(text);

	if (!message.ok) {
		say(`Couldn't save: ${message.error}`);
	} else {
		const { item } = message;
		let reference = message.reference;
		const render = () => {
			const switchButton = styled(
				'button',
				linkButton,
				reference ? 'Make it a to-do instead' : 'Keep as reference instead'
			);
			const undo = styled('button', linkButton, 'Undo');
			switchButton.addEventListener('click', async () => {
				say('Switching…');
				const res = await chrome.runtime.sendMessage({
					type: 'SET_REFERENCE',
					itemId: item.id,
					reference: !reference
				});
				if (!res?.success) return say(`Couldn't switch: ${res?.error ?? 'unknown error'}`);
				reference = !reference;
				render();
				dismissLater();
			});
			undo.addEventListener('click', async () => {
				say('Undoing…');
				const res = await chrome.runtime.sendMessage({ type: 'UNDO_SAVE', itemId: item.id });
				say(res?.success ? 'Removed' : `Couldn't undo: ${res?.error ?? 'unknown error'}`);
				dismissLater();
			});
			body.replaceChildren(
				reference ? 'Kept as a reference. ' : 'Saved. ',
				switchButton,
				' · ',
				undo
			);
		};
		render();
	}

	document.body.appendChild(toast);
	dismissLater();
}

function cropImage(
	dataUrl: string,
	rect: { x: number; y: number; width: number; height: number }
): Promise<string> {
	return new Promise((resolve) => {
		const img = new Image();
		img.onload = () => {
			const dpr = window.devicePixelRatio || 1;
			const canvas = document.createElement('canvas');
			canvas.width = rect.width * dpr;
			canvas.height = rect.height * dpr;
			const ctx = canvas.getContext('2d')!;
			ctx.drawImage(
				img,
				rect.x * dpr,
				rect.y * dpr,
				rect.width * dpr,
				rect.height * dpr,
				0,
				0,
				rect.width * dpr,
				rect.height * dpr
			);
			resolve(canvas.toDataURL('image/png'));
		};
		img.src = dataUrl;
	});
}

// Added again on pages opened before install; listen only once.
const page = window as Window & { __createthingsPage?: boolean };
if (!page.__createthingsPage) {
	page.__createthingsPage = true;
	chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
		if (message.type === 'START_AREA_SELECT') {
			createOverlay();
			sendResponse({ started: true });
		}
		if (message.type === 'SHOW_SAVED') {
			showToast(message as ToastMessage);
			sendResponse({ shown: true });
		}
		return false;
	});
}
