<script>
	import { toast } from '$lib/stores';
	import { fly } from 'svelte/transition';
	import { X, CheckCircle, AlertCircle, Info } from 'lucide-svelte';

	// 아이콘 매핑
	const icons = {
		success: CheckCircle,
		error: AlertCircle,
		info: Info
	};
</script>

<div class="toast-container">
	{#each $toast as t (t.id)}
		<div 
			class="toast-item {t.type}" 
			transition:fly={{ y: 20, duration: 300 }}
			role="alert"
		>
			<div class="icon">
				<svelte:component this={icons[t.type] || icons.info} size={20} />
			</div>
			<span class="message">{t.message}</span>
			<button class="close-btn" on:click={() => toast.remove(t.id)}>
				<X size={16} />
			</button>
		</div>
	{/each}
</div>

<style>
	.toast-container {
		position: fixed;
		bottom: 24px;
		left: 50%;
		transform: translateX(-50%);
		z-index: 9999;
		display: flex;
		flex-direction: column;
		gap: 10px;
		width: 90%;
		max-width: 400px;
		pointer-events: none; /* 컨테이너는 클릭 통과 */
	}

	.toast-item {
		background: rgba(30, 30, 30, 0.9);
		color: white;
		padding: 14px 16px;
		border-radius: 12px;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
		display: flex;
		align-items: center;
		gap: 12px;
		font-size: 14px;
		pointer-events: auto; /* 아이템은 클릭 가능 */
		backdrop-filter: blur(4px);
		border: 1px solid rgba(255,255,255,0.1);
	}

	/* 타입별 스타일 미세 조정 (필요시) */
	.toast-item.success .icon { color: #48bb78; }
	.toast-item.error .icon { color: #f56565; }
	.toast-item.info .icon { color: #4299e1; }

	.message {
		flex: 1;
		line-height: 1.4;
	}

	.close-btn {
		background: none;
		border: none;
		color: #a0aec0;
		cursor: pointer;
		padding: 4px;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: color 0.2s;
	}
	.close-btn:hover {
		color: white;
	}
</style>