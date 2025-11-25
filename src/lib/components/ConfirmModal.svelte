<script>
	import { modal } from '$lib/stores';
	import { fly, fade } from 'svelte/transition'; // 부드러운 애니메이션

	function handleClose(result) {
		modal.close(result);
	}
</script>

{#if $modal.isOpen}
	<div class="modal-overlay" transition:fade={{ duration: 200 }}>
		<div 
			class="modal-backdrop" 
			on:click={() => handleClose($modal.type === 'alert')}
			role="presentation"
		></div>
		
		<div class="modal-content" transition:fly={{ y: 20, duration: 300 }}>
			<div class="modal-body">
				<p class="message">{$modal.message}</p>
			</div>
			
			<div class="modal-footer">
				{#if $modal.type === 'confirm'}
					<button class="btn cancel" on:click={() => handleClose(false)}>
						취소
					</button>
					<button class="btn confirm" on:click={() => handleClose(true)}>
						확인
					</button>
				{:else}
					<button class="btn confirm full" on:click={() => handleClose(true)}>
						확인
					</button>
				{/if}
			</div>
		</div>
	</div>
{/if}

<style>
	.modal-overlay {
		position: fixed;
		top: 0; left: 0; width: 100%; height: 100%;
		z-index: 99999; /* 최상위 레벨 */
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.modal-backdrop {
		position: absolute;
		top: 0; left: 0; width: 100%; height: 100%;
		background-color: rgba(0, 0, 0, 0.5);
		backdrop-filter: blur(2px);
	}

	.modal-content {
		position: relative;
		background: white;
		width: 300px;
		max-width: 85%;
		border-radius: 16px;
		box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
		overflow: hidden;
		z-index: 1;
	}

	.modal-body {
		padding: 32px 24px;
		text-align: center;
	}

	.message {
		margin: 0;
		font-size: 16px;
		color: #2d3748;
		line-height: 1.5;
		white-space: pre-line; /* 줄바꿈 지원 */
		font-weight: 500;
	}

	.modal-footer {
		display: flex;
		border-top: 1px solid #f0f0f0;
	}

	.btn {
		flex: 1;
		padding: 16px;
		border: none;
		background: white;
		font-size: 15px;
		font-weight: 600;
		cursor: pointer;
		transition: background-color 0.2s;
	}

	.btn:active {
		background-color: #f7fafc;
	}

	.btn.cancel {
		color: #a0aec0;
		border-right: 1px solid #f0f0f0;
	}

	.btn.confirm {
		color: #3182ce; /* 앱의 메인 컬러 사용 */
	}

	.btn.full {
		width: 100%;
	}
</style>