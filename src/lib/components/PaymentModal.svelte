<script>
	import { createEventDispatcher } from 'svelte';
	import { fade, fly, slide } from 'svelte/transition';
	import { X, CreditCard, Smartphone, CheckCircle, Loader2, Wallet, ChevronLeft } from 'lucide-svelte';

	export let amount = 0;
	export let orderId = '';
	export let orderName = '';
	export let customerName = '';
	
	const dispatch = createEventDispatcher();

	// 단계: METHOD(수단선택) -> FORM(정보입력) -> PROCESSING(진행) -> SUCCESS(성공)
	let step = 'METHOD'; 
	let selectedMethod = 'CARD';
	let isProcessing = false;

	// 카드 입력 정보
	let cardInfo = {
		num1: '', num2: '', num3: '', num4: '',
		expiry: '', cvc: '', pwd: ''
	};

	const paymentMethods = [
		{ id: 'CARD', label: '카드', icon: CreditCard },
		{ id: 'TOSS_PAY', label: '토스페이', icon: Wallet },
		{ id: 'MOBILE_PHONE', label: '휴대폰', icon: Smartphone }
	];

	function close() {
		if (!isProcessing) dispatch('close');
	}

	function goToForm() {
		if (selectedMethod === 'CARD') {
			step = 'FORM';
		} else {
			// 카드 외 수단은 바로 결제 진행 (시뮬레이션 단순화)
			processPayment();
		}
	}

	function goBack() {
		step = 'METHOD';
	}

	// 숫자만 입력받도록 처리
	function handleNumberInput(e, field, maxLength, nextFieldId = null) {
		const value = e.target.value.replace(/[^0-9]/g, '');
		e.target.value = value;
		cardInfo[field] = value;

		// 자동 포커스 이동
		if (value.length === maxLength && nextFieldId) {
			document.getElementById(nextFieldId)?.focus();
		}
	}

	function processPayment() {
		step = 'PROCESSING';
		isProcessing = true;
		
		setTimeout(() => {
			isProcessing = false;
			step = 'SUCCESS';
			
			const paymentResult = {
				paymentKey: `test_ck_${Math.random().toString(36).substring(2, 15)}`,
				orderId: orderId,
				amount: amount,
				method: selectedMethod,
				paymentType: 'NORMAL',
				requestedAt: new Date().toISOString(),
				approvedAt: new Date().toISOString(),
				status: 'DONE',
				card: selectedMethod === 'CARD' ? {
					number: `${cardInfo.num1}-****-****-${cardInfo.num4}`, // 마스킹 처리
					company: '토스뱅크', // 가상 카드사
					type: 'CHECK'
				} : null
			};

			setTimeout(() => {
				dispatch('complete', paymentResult);
			}, 1500);
		}, 2000);
	}

	function formatPrice(price) {
		return price.toLocaleString('ko-KR');
	}
</script>

<div class="modal-overlay" transition:fade={{ duration: 200 }} on:click={close}>
	<div class="modal-content" transition:fly={{ y: 20, duration: 300 }} on:click|stopPropagation>
		
		<div class="modal-header">
			{#if step === 'FORM'}
				<button class="back-btn" on:click={goBack} disabled={isProcessing}>
					<ChevronLeft size={24} />
				</button>
			{:else}
				<div class="spacer"></div> {/if}
			
			<h3>
				{#if step === 'SUCCESS'} 결제 완료
				{:else if step === 'PROCESSING'} 결제 요청 중
				{:else if step === 'FORM'} 카드 정보 입력
				{:else} 결제하기
				{/if}
			</h3>
			
			<button class="close-btn" on:click={close} disabled={isProcessing}>
				<X size={24} />
			</button>
		</div>

		<div class="modal-body">
			{#if step === 'METHOD'}
				<div class="order-info" in:slide>
					<p class="label">상품명</p>
					<p class="value-lg">{orderName}</p>
					<div class="price-box">
						<span>총 결제 금액</span>
						<span class="price">{formatPrice(amount)}원</span>
					</div>
				</div>

				<div class="divider"></div>

				<h4 class="section-title">결제 수단 선택</h4>
				<div class="payment-methods">
					{#each paymentMethods as method}
						<button 
							class="method-btn {selectedMethod === method.id ? 'selected' : ''}"
							on:click={() => selectedMethod = method.id}
						>
							<div class="icon-wrapper">
								<svelte:component this={method.icon} size={20} />
							</div>
							<span>{method.label}</span>
							{#if selectedMethod === method.id}
								<div class="check-mark"><CheckCircle size={16} /></div>
							{/if}
						</button>
					{/each}
				</div>

			{:else if step === 'FORM'}
				<div class="card-form" in:slide>
					<div class="form-group">
						<label for="c1">카드 번호</label>
						<div class="card-num-inputs">
							<input id="c1" type="text" maxlength="4" placeholder="0000" 
								on:input={(e) => handleNumberInput(e, 'num1', 4, 'c2')} />
							<input id="c2" type="text" maxlength="4" placeholder="0000" 
								on:input={(e) => handleNumberInput(e, 'num2', 4, 'c3')} />
							<input id="c3" type="password" maxlength="4" placeholder="••••" 
								on:input={(e) => handleNumberInput(e, 'num3', 4, 'c4')} />
							<input id="c4" type="text" maxlength="4" placeholder="0000" 
								on:input={(e) => handleNumberInput(e, 'num4', 4, 'exp')} />
						</div>
					</div>

					<div class="form-row">
						<div class="form-group half">
							<label for="exp">유효기간 (MMYY)</label>
							<input id="exp" type="text" maxlength="4" placeholder="MMYY" 
								on:input={(e) => handleNumberInput(e, 'expiry', 4, 'cvc')} />
						</div>
						<div class="form-group half">
							<label for="cvc">CVC (3자리)</label>
							<input id="cvc" type="password" maxlength="3" placeholder="•••" 
								on:input={(e) => handleNumberInput(e, 'cvc', 3, 'pwd')} />
						</div>
					</div>

					<div class="form-group">
						<label for="pwd">카드 비밀번호 (앞 2자리)</label>
						<input id="pwd" type="password" maxlength="2" placeholder="••" class="short-input"
							on:input={(e) => handleNumberInput(e, 'pwd', 2, null)} />
					</div>
				</div>

			{:else if step === 'PROCESSING'}
				<div class="processing-view">
					<Loader2 size={48} class="spin" color="#3182ce" />
					<p>결제 요청 중입니다...</p>
					<p class="sub-text">잠시만 기다려주세요.</p>
				</div>

			{:else if step === 'SUCCESS'}
				<div class="success-view">
					<div class="success-icon">
						<CheckCircle size={48} color="#ffffff" />
					</div>
					<h3>결제 성공!</h3>
					<p>{formatPrice(amount)}원이 결제되었습니다.</p>
				</div>
			{/if}
		</div>

		{#if step === 'METHOD' || step === 'FORM'}
			<div class="modal-footer">
				<button class="pay-btn" on:click={step === 'METHOD' ? goToForm : processPayment}>
					{#if step === 'METHOD'}
						<span>다음</span>
					{:else}
						<span>{formatPrice(amount)}원 결제하기</span>
					{/if}
				</button>
			</div>
		{/if}
	</div>
</div>

<style>
	.modal-overlay {
		position: fixed; top: 0; left: 0; width: 100%; height: 100%;
		background-color: rgba(0, 0, 0, 0.5); z-index: 9999;
		display: flex; align-items: center; justify-content: center;
	}
	.modal-content {
		background: white; width: 90%; max-width: 400px;
		border-radius: 20px; overflow: hidden;
		box-shadow: 0 10px 25px rgba(0,0,0,0.2);
		display: flex; flex-direction: column;
		max-height: 90vh;
	}

	.modal-header {
		padding: 16px 20px; display: flex; align-items: center; justify-content: space-between;
		border-bottom: 1px solid #f0f0f0; background-color: #fff; height: 56px;
	}
	.modal-header h3 { font-size: 16px; font-weight: bold; color: #333; margin: 0; }
	.close-btn, .back-btn { background: none; border: none; cursor: pointer; color: #555; padding: 4px; display: flex; }
	.spacer { width: 32px; }

	.modal-body { padding: 24px 20px; flex: 1; overflow-y: auto; }

	/* Method Step Styles */
	.order-info { text-align: center; margin-bottom: 20px; }
	.order-info .label { font-size: 12px; color: #888; margin-bottom: 4px; }
	.order-info .value-lg { font-size: 18px; font-weight: bold; color: #333; margin-bottom: 12px; }
	.price-box { 
		background-color: #f7fafc; padding: 12px; border-radius: 8px;
		display: flex; justify-content: space-between; align-items: center;
	}
	.price-box span { font-size: 14px; color: #555; }
	.price-box .price { font-size: 18px; font-weight: 800; color: #3182ce; }

	.divider { height: 1px; background-color: #f0f0f0; margin: 20px 0; }
	.section-title { font-size: 13px; color: #888; margin: 0 0 12px 0; font-weight: 600; }

	.payment-methods { display: flex; flex-direction: column; gap: 10px; }
	.method-btn {
		display: flex; align-items: center; gap: 12px; padding: 14px 16px;
		border: 1px solid #e2e8f0; border-radius: 12px; background: white;
		cursor: pointer; transition: all 0.2s; position: relative;
		font-size: 15px; color: #333;
	}
	.method-btn:hover { background-color: #f9fafb; }
	.method-btn.selected { border-color: #3182ce; background-color: #ebf8ff; color: #2c5282; font-weight: 600; }
	.check-mark { position: absolute; right: 16px; color: #3182ce; }

	/* Form Step Styles */
	.card-form { display: flex; flex-direction: column; gap: 20px; }
	.form-group { display: flex; flex-direction: column; gap: 6px; }
	.form-group label { font-size: 12px; font-weight: 600; color: #555; margin-left: 2px; }
	
	.card-num-inputs { display: flex; gap: 8px; }
	.card-num-inputs input {
		width: 100%; padding: 12px; text-align: center;
		border: 1px solid #e2e8f0; border-radius: 8px; font-size: 16px; outline: none;
		transition: border-color 0.2s;
	}
	
	.form-row { display: flex; gap: 12px; }
	.form-group.half { flex: 1; }
	
	input {
		padding: 12px; border: 1px solid #e2e8f0; border-radius: 8px;
		font-size: 16px; outline: none; width: 100%; box-sizing: border-box;
	}
	input:focus { border-color: #3182ce; }
	.short-input { width: 50%; }

	/* Processing & Success Styles */
	.processing-view, .success-view {
		padding: 40px 20px; text-align: center;
		display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%;
	}
	.processing-view p { margin-top: 16px; font-weight: bold; color: #333; }
	.processing-view .sub-text { font-weight: normal; font-size: 13px; color: #888; margin-top: 4px; }

	.success-icon {
		width: 72px; height: 72px; border-radius: 50%;
		background-color: #3182ce; display: flex; align-items: center; justify-content: center;
		margin-bottom: 24px; animation: popIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
	}
	.success-view h3 { margin: 0 0 8px 0; font-size: 22px; font-weight: bold; color: #1a1a1a; }
	.success-view p { color: #666; }

	.modal-footer { padding: 0 20px 24px 20px; }
	.pay-btn {
		width: 100%; padding: 16px; border: none; border-radius: 12px;
		background-color: #3182ce; color: white; font-size: 16px; font-weight: bold;
		cursor: pointer; transition: background-color 0.2s;
	}
	.pay-btn:hover { background-color: #2b6cb0; }

	.spin { animation: spin 1s linear infinite; }
	@keyframes spin { 100% { transform: rotate(360deg); } }
	@keyframes popIn { from { transform: scale(0); opacity: 0; } to { transform: scale(1); opacity: 1; } }
</style>