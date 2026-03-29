<script lang="ts">
	interface Props {
		/** Background color for the "things" badge */
		bg?: string;
		/** Text color for the "things" badge */
		color?: string;
		size?: 'sm' | 'md' | 'lg';
	}

	let { bg = '#fbbf24', color = '#0d0d0d', size = 'md' }: Props = $props();
</script>

<span class="wordmark wordmark-{size}">
	<span class="create">create</span><span class="things" style="background: {bg}; color: {color};"
		>things</span
	>
</span>

<style>
	.wordmark {
		display: inline-flex;
		align-items: baseline;
		line-height: 1;
		letter-spacing: -0.02em;
		user-select: none;
	}

	.wordmark-sm {
		font-size: 1rem;
	}
	.wordmark-md {
		font-size: 1.25rem;
	}
	.wordmark-lg {
		font-size: 2.25rem;
	}

	.create {
		font-family: 'DM Sans', sans-serif;
		font-weight: 400;
		color: #ffe600;
	}

	.things {
		font-family: 'Playwrite DK Uloopet', cursive;
		font-weight: 400;
		padding: 0.05em 0.28em 0.18em;
		border-radius: 0.22em;
		position: relative;
		top: -0.04em;
	}
</style>
