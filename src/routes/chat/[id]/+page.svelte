<script>
	import { onMount, tick, afterUpdate } from 'svelte';
	import { page } from '$app/stores';
	import { Send, MoreVertical, Phone, ArrowLeft } from 'lucide-svelte';

	// URL에서 채팅방 ID 가져오기
	let roomId = $page.params.id;

	// 채팅방 이름
	let roomTitle = roomId === '1' ? '주말 독서의 장 📚' : '새로운 대화방';

	let scrollContainer;
	let inputElement;
	let newMessage = '';

	// 임시 메시지 데이터
	let messages = [
		{ id: 1, sender: 'other', text: '안녕하세요! 이번 주 모임 장소 정해졌나요?', time: '오후 2:01' },
		{ id: 2, sender: 'me', text: '네, 강남역 근처 카페로 예약했습니다.', time: '오후 2:03' },
		{ id: 3, sender: 'me', text: '지도 링크 보내드릴게요.', time: '오후 2:03' },
		{ id: 4, sender: 'other', text: '오 좋습니다! 시간은 그대로 2시인가요?', time: '오후 2:05' },
		{ id: 5, sender: 'me', text: '네 맞습니다. 늦지 않게 오세요~', time: '오후 2:06' },
		{ id: 6, sender: 'other', text: '알겠습니다. 그때 뵙겠습니다! ㅎㅎ', time: '오후 2:10' }
	];

	async function sendMessage() {
		if (!newMessage.trim()) return;

		const msg = {
			id: Date.now(),
			sender: 'me',
			text: newMessage,
			time: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
		};

		messages = [...messages, msg];
		newMessage = '';

		await tick();
		scrollToBottom();
		inputElement.focus();
	}

	function scrollToBottom() {
		if (scrollContainer) {
			scrollContainer.scrollTop = scrollContainer.scrollHeight;
		}
	}

	onMount(() => {
		scrollToBottom();
	});

	afterUpdate(() => {
		scrollToBottom();
	});

	// 뒤로가기
	function goBack() {
		history.back();
	}
</script>

<div class="chat-room-container">
	<div class="chat-info-bar">
		<button class="icon-btn back-btn" on:click={goBack}>
			<ArrowLeft size={20} />
		</button>
		<span class="room-name">{roomTitle}</span>
		<div class="actions">
			<button class="icon-btn"><Phone size={18} /></button>
			<button class="icon-btn"><MoreVertical size={18} /></button>
		</div>
	</div>

	<div class="message-list" bind:this={scrollContainer}>
		<div class="date-divider">2025년 11월 24일 월요일</div>
		
		{#each messages as msg (msg.id)}
			<div class="message-row {msg.sender === 'me' ? 'my-msg' : 'other-msg'}">
				{#if msg.sender === 'other'}
					<div class="profile-pic">
						<img src="https://placehold.co/100x100/orange/white?text=U" alt="User" />
					</div>
				{/if}
				
				<div class="message-content">
					{#if msg.sender === 'other'}
						<span class="sender-name">상대방</span>
					{/if}
					<div class="bubble-wrapper">
						<div class="bubble">{msg.text}</div>
						<span class="time">{msg.time}</span>
					</div>
				</div>
			</div>
		{/each}
	</div>

	<div class="input-area">
		<input 
			type="text" 
			placeholder="메시지 입력" 
			bind:value={newMessage} 
			bind:this={inputElement}
			on:keydown={(e) => e.key === 'Enter' && !e.isComposing && sendMessage()}
		/>
		<button class="send-btn" on:click={sendMessage} disabled={!newMessage.trim()}>
			<Send size={18} />
		</button>
	</div>
</div>

<style>
	/* 컨테이너가 부모 요소(app-content)의 높이를 가득 채우도록 설정 */
	.chat-room-container {
		display: flex;
		flex-direction: column;
		height: 100%; 
		background-color: #b2c7d9;
		position: relative;
	}

	/* 채팅방 상단 정보 바 */
	.chat-info-bar {
		height: 48px;
		background-color: rgba(255, 255, 255, 0.9);
		display: flex;
		align-items: center;
		padding: 0 8px;
		border-bottom: 1px solid rgba(0,0,0,0.05);
		flex-shrink: 0;
	}

	.back-btn {
		margin-right: 8px;
	}

	.room-name {
		font-size: 14px;
		font-weight: bold;
		flex: 1;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.actions {
		display: flex;
	}

	.icon-btn {
		background: none;
		border: none;
		padding: 8px;
		cursor: pointer;
		color: #333;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	/* 메시지 리스트: 남은 공간을 모두 차지하며 스크롤 생성 */
	.message-list {
		flex: 1;
		overflow-y: auto;
		padding: 16px;
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.date-divider {
		text-align: center;
		font-size: 11px;
		color: #fff;
		background-color: rgba(0,0,0,0.1);
		align-self: center;
		padding: 4px 12px;
		border-radius: 10px;
		margin: 8px 0;
	}

	.message-row {
		display: flex;
		align-items: flex-start;
		max-width: 80%;
	}

	.my-msg {
		align-self: flex-end;
		flex-direction: row-reverse;
	}

	.my-msg .bubble-wrapper {
		flex-direction: row-reverse;
	}

	.my-msg .bubble {
		background-color: #feec34;
		color: #000;
		border-top-right-radius: 0;
	}

	.my-msg .time {
		text-align: right;
	}

	.other-msg {
		align-self: flex-start;
	}

	.other-msg .bubble {
		background-color: #fff;
		color: #000;
		border-top-left-radius: 0;
	}

	.profile-pic {
		width: 32px;
		height: 32px;
		border-radius: 12px;
		overflow: hidden;
		margin-right: 8px;
		background-color: #eee;
	}

	.profile-pic img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.message-content {
		display: flex;
		flex-direction: column;
	}

	.sender-name {
		font-size: 11px;
		color: #555;
		margin-bottom: 2px;
		margin-left: 2px;
	}

	.bubble-wrapper {
		display: flex;
		align-items: flex-end;
		gap: 6px;
	}

	.bubble {
		padding: 8px 12px;
		border-radius: 12px;
		font-size: 13px;
		line-height: 1.4;
		box-shadow: 0 1px 1px rgba(0,0,0,0.1);
		word-break: break-word;
	}

	.time {
		font-size: 10px;
		color: #555;
		white-space: nowrap;
		margin-bottom: 0;
	}

	/* 입력창: 하단 고정 */
	.input-area {
		background-color: white;
		padding: 8px;
		display: flex;
		align-items: center;
		gap: 8px;
		border-top: 1px solid #eee;
		flex-shrink: 0; /* 찌그러짐 방지 */
	}

	.input-area input {
		flex: 1;
		border: none;
		background-color: #f2f2f2;
		padding: 10px 14px;
		border-radius: 18px;
		font-size: 14px;
		outline: none;
	}

	.send-btn {
		background-color: #feec34;
		border: none;
		width: 36px;
		height: 36px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		color: #333;
		flex-shrink: 0;
	}

	.send-btn:disabled {
		background-color: #f0f0f0;
		color: #ccc;
	}
</style>