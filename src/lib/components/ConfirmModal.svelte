<script>
	import { modal } from '$lib/stores';
	import { fly, fade } from 'svelte/transition';
	import { tick } from 'svelte'; // 포커싱을 위해 필요

	let inputElement;

	// 모달이 열리고 타입이 prompt일 때 자동 포커스
	$: if ($modal.isOpen && $modal.type === 'prompt') {
		focusInput();
	}

	async function focusInput() {
		await tick();
		if (inputElement) {
			inputElement.focus();
			if ($modal.value) inputElement.select(); // 값이 있으면 전체 선택
		}
	}

	function handleClose(result) {
		// prompt일 때 취소면 null, 확인이면 입력값 반환
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
	
	// 스토어 값 양방향 바인딩 처리
	function handleInput(e) {
		modal.updateValue(e.target.value);
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
							bind:this={inputElement}
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
	/* ... 기존 스타일 유지 ... */
	.modal-overlay {
		position: fixed; top: 0; left: 0; width: 100%; height: 100%;
		z-index: 99999; display: flex; align-items: center; justify-content: center;
	}
	.modal-backdrop {
		position: absolute; top: 0; left: 0; width: 100%; height: 100%;
		background-color: rgba(0, 0, 0, 0.5); backdrop-filter: blur(2px);
	}
	.modal-content {
		position: relative; background: white; width: 300px; max-width: 85%;
		border-radius: 16px; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
		overflow: hidden; z-index: 1;
	}
	.modal-body { padding: 24px; text-align: center; } /* padding 조정 */
	.message {
		margin: 0; font-size: 16px; color: #2d3748; line-height: 1.5;
		white-space: pre-line; font-weight: 500;
		word-break: keep-all; text-wrap: balance;
	}
	
	/* [추가] 입력창 스타일 */
	.input-wrapper { margin-top: 20px; }
	.prompt-input {
		width: 100%; padding: 10px 12px; border: 1px solid #e2e8f0;
		border-radius: 8px; font-size: 15px; box-sizing: border-box;
		outline: none; transition: border-color 0.2s;
	}
	.prompt-input:focus { border-color: #3182ce; }

	.modal-footer { display: flex; border-top: 1px solid #f0f0f0; }
	.btn {
		flex: 1; padding: 16px; border: none; background: white;
		font-size: 15px; font-weight: 600; cursor: pointer;
		transition: background-color 0.2s;
	}
	.btn:active { background-color: #f7fafc; }
	.btn.cancel { color: #a0aec0; border-right: 1px solid #f0f0f0; }
	.btn.confirm { color: #3182ce; }
	.btn.full { width: 100%; }
</style>