<script>
	import { onMount, onDestroy, tick, afterUpdate } from 'svelte';
	import { page } from '$app/stores';
	import { user } from '$lib/stores';
	import { db } from '$lib/firebase';
	import { 
		collection, 
		query, 
		orderBy, 
		onSnapshot, 
		addDoc, 
		serverTimestamp, 
		doc, 
		updateDoc,
		getDoc 
	} from 'firebase/firestore';
	import { Send, MoreVertical, Phone, ArrowLeft } from 'lucide-svelte';

	const roomId = $page.params.id;
	let roomTitle = '로딩 중...';
	let messages = [];
	let newMessage = '';
	let scrollContainer;
	let inputElement;
	let unsubscribe = null;

	// 1. 채팅방 정보 가져오기 (타이틀용)
	async function fetchRoomInfo() {
		const docRef = doc(db, 'chatRooms', roomId);
		const docSnap = await getDoc(docRef);
		if (docSnap.exists()) {
			roomTitle = docSnap.data().title;
		} else {
			roomTitle = '존재하지 않는 방';
		}
	}

	// 2. 메시지 실시간 구독
	function subscribeToMessages() {
		const q = query(
			collection(db, 'chatRooms', roomId, 'messages'),
			orderBy('createdAt', 'asc')
		);

		unsubscribe = onSnapshot(q, (snapshot) => {
			messages = snapshot.docs.map(doc => ({
				id: doc.id,
				...doc.data()
			}));
			// 메시지가 오면 스크롤을 아래로
			tick().then(() => scrollToBottom());
		});
	}

	// 3. 메시지 전송
	async function sendMessage() {
		if (!newMessage.trim() || !$user) return;

		const text = newMessage;
		newMessage = ''; // 입력창 즉시 비우기

		try {
			// 서브 컬렉션에 메시지 추가
			await addDoc(collection(db, 'chatRooms', roomId, 'messages'), {
				text: text,
				senderId: $user.uid,
				senderName: $user.displayName || '익명',
				senderImage: $user.photoURL,
				createdAt: serverTimestamp()
			});

			// 채팅방 목록에 표시될 '마지막 메시지' 업데이트
			const roomRef = doc(db, 'chatRooms', roomId);
			await updateDoc(roomRef, {
				lastMessage: text,
				timestamp: serverTimestamp()
			});

			scrollToBottom();
			inputElement.focus();
		} catch (error) {
			console.error('메시지 전송 실패:', error);
			alert('전송에 실패했습니다.');
		}
	}

	function scrollToBottom() {
		if (scrollContainer) {
			scrollContainer.scrollTop = scrollContainer.scrollHeight;
		}
	}

	function formatTime(timestamp) {
		if (!timestamp) return '';
		// Firestore Timestamp는 toDate() 메서드를 가짐
		return timestamp.toDate().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
	}

	onMount(() => {
		fetchRoomInfo();
		subscribeToMessages();
	});

	onDestroy(() => {
		if (unsubscribe) unsubscribe();
	});

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
		<div class="date-divider">오늘</div>
		
		{#each messages as msg (msg.id)}
			<div class="message-row {msg.senderId === $user?.uid ? 'my-msg' : 'other-msg'}">
				{#if msg.senderId !== $user?.uid}
					<div class="profile-pic">
						<img src={msg.senderImage || "https://placehold.co/100x100/orange/white?text=U"} alt="User" />
					</div>
				{/if}
				
				<div class="message-content">
					{#if msg.senderId !== $user?.uid}
						<span class="sender-name">{msg.senderName}</span>
					{/if}
					<div class="bubble-wrapper">
						<div class="bubble">{msg.text}</div>
						<span class="time">{formatTime(msg.createdAt)}</span>
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

	.back-btn { margin-right: 8px; }

	.room-name {
		font-size: 14px;
		font-weight: bold;
		flex: 1;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.actions { display: flex; }

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

	/* 메시지 리스트 */
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

	.my-msg .bubble-wrapper { flex-direction: row-reverse; }

	.my-msg .bubble {
		background-color: #feec34;
		color: #000;
		border-top-right-radius: 0;
	}

	.my-msg .time { text-align: right; }

	.other-msg { align-self: flex-start; }

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
		flex-shrink: 0;
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