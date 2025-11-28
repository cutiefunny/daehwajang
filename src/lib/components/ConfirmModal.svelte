<script>
	import { modal } from '$lib/stores';
	import { fly, fade } from 'svelte/transition';
	
	// [수정] 반응형($:) 구문과 tick, inputElement 변수를 제거하고
	// Action 함수로 대체하여 초기화 로직을 분리합니다.

	function handleClose(result) {
		if ($modal.type === 'prompt') {
			modal.close(result ? $modal.value : null);
		} else {
			modal.close(result);
		}
	}

	function handleKeydown(e) {
		if (e.key === 'Enter' && !e.isComposing) {
			handleClose(true);
		}
	}
	
	function handleInput(e) {
		modal.updateValue(e.target.value);
	}

	// [추가] 요소가 마운트될 때 한 번만 실행되는 Action 함수
	function autoFocus(node) {
		// 약간의 지연을 주어 트랜지션 등이 안정화된 후 포커스
		setTimeout(() => {
			node.focus();
			if ($modal.value) {
				node.select(); // 값이 있으면 전체 선택 (처음 한 번만)
			}
		}, 50);
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
				
				{#if $modal.type === 'prompt'}
					<div class="input-wrapper">
						<input 
							type="text" 
							value={$modal.value}
							placeholder={$modal.placeholder}
							on:input={handleInput}
							on:keydown={handleKeydown}
							use:autoFocus
							class="prompt-input"
						/>
					</div>
				{/if}
			</div>
			
			<div class="modal-footer">
				{#if $modal.type === 'alert'}
					<button class="btn confirm full" on:click={() => handleClose(true)}>
						확인
					</button>
				{:else}
					<button class="btn cancel" on:click={() => handleClose(false)}>
						취소
					</button>
					<button class="btn confirm" on:click={() => handleClose(true)}>
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
		z-index: 99999; display: flex; align-items: center; justify-content: center;
	}
	.modal-backdrop {
		position: absolute;
		top: 0; left: 0; width: 100%; height: 100%;
		background-color: rgba(0, 0, 0, 0.5); backdrop-filter: blur(2px);
	}
	.modal-content {
		position: relative; background: white;
		width: 300px; max-width: 85%;
		border-radius: 16px; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
		overflow: hidden; z-index: 1;
	}
	.modal-body { padding: 24px; text-align: center; }
	.message {
		margin: 0; font-size: 16px; color: #2d3748; line-height: 1.5;
		white-space: pre-line; font-weight: 500;
		word-break: keep-all; text-wrap: balance;
	}
	
	.input-wrapper { margin-top: 20px; }
	.prompt-input {
		width: 100%;
		padding: 10px 12px; border: 1px solid #e2e8f0;
		border-radius: 8px; font-size: 15px; box-sizing: border-box;
		outline: none; transition: border-color 0.2s;
	}
	.prompt-input:focus { border-color: #3182ce; }

	.modal-footer { display: flex; border-top: 1px solid #f0f0f0; }
	.btn {
		flex: 1; padding: 16px; border: none;
		background: white;
		font-size: 15px; font-weight: 600; cursor: pointer;
		transition: background-color 0.2s;
	}
	.btn:active { background-color: #f7fafc; }
	.btn.cancel { color: #a0aec0;
		border-right: 1px solid #f0f0f0; }
	.btn.confirm { color: #3182ce; }
	.btn.full { width: 100%; }
</style>