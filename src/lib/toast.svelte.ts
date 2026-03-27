export type ToastType = 'success' | 'error' | 'info';
export type Toast = { id: number; message: string; type: ToastType };

const toasts = $state<Toast[]>([]);
let counter = 0;

export function addToast(message: string, type: ToastType = 'info', duration = 4000) {
	const id = ++counter;
	toasts.push({ id, message, type });
	setTimeout(() => removeToast(id), duration);
}

export function removeToast(id: number) {
	const i = toasts.findIndex((t) => t.id === id);
	if (i !== -1) toasts.splice(i, 1);
}

export { toasts };
