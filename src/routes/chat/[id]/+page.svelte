<script>
	import { onMount, onDestroy, tick } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { user, modal } from '$lib/stores';
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
		getDoc,
		arrayUnion, 
		arrayRemove,
		increment 
	} from 'firebase/firestore';
	import { Send, MoreVertical, Phone, ArrowLeft, LogOut } from 'lucide-svelte';

	const roomId = $page.params.id;
	let roomTitle = '로딩 중...';
	let messages = [];
	let newMessage = '';
	let scrollContainer;
	let inputElement;
	let unsubscribe = null;
	let isMenuOpen = false;

	// 1. 채팅방 정보 가져오기 & 입장 처리
	async function fetchRoomInfoAndJoin() {
		try {
			const docRef = doc(db, 'chatRooms', roomId);
			const docSnap = await getDoc(docRef);

			if (docSnap.exists()) {
				const data = docSnap.data();
				roomTitle = data.title;

				// [수정] 신규 참여자인 경우: 입장 처리 + 시스템 메시지 전송
				if ($user && (!data.participants || !data.participants.includes($user.uid))) {
					// 1. 참여자 목록 업데이트
					await updateDoc(docRef, {
						participants: arrayUnion($user.uid),
						participantCount: increment(1)
					});

					// 2. 입장 시스템 메시지 전송
					await addDoc(collection(db, 'chatRooms', roomId, 'messages'), {
						text: `${$user.displayName || '알 수 없는 사용자'}님이 입장했습니다.`,
						createdAt: serverTimestamp(),
						type: 'system' // 시스템 메시지 타입 지정
					});
					
					console.log('채팅방 참여 및 입장 메시지 전송 완료');
				}
			} else {
				roomTitle = '존재하지 않는 방';
				await modal.alert('존재하지 않는 채팅방입니다.');
				history.back();
			}
		} catch (error) {
			console.error("방 정보 로딩 실패:", error);
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
			tick().then(() => scrollToBottom());
		});
	}

	// 3. 메시지 전송 (일반 메시지)
	async function sendMessage() {
		if (!newMessage.trim() || !$user) return;

		const text = newMessage;
		newMessage = '';

		try {
			await addDoc(collection(db, 'chatRooms', roomId, 'messages'), {
				text: text,
				senderId: $user.uid,
				senderName: $user.displayName || '익명',
				senderImage: $user.photoURL,
				createdAt: serverTimestamp(),
				type: 'user' // 일반 메시지 명시 (없어도 무방하지만 구분 위해 권장)
			});

			// 마지막 메시지 업데이트
			const roomRef = doc(db, 'chatRooms', roomId);
			await updateDoc(roomRef, {
				lastMessage: text,
				timestamp: serverTimestamp()
			});

			scrollToBottom();
			inputElement.focus();
		} catch (error) {
			console.error('메시지 전송 실패:', error);
			await modal.alert('전송에 실패했습니다.');
		}
	}

	// 4. 대화방 나가기
	async function leaveRoom() {
		if (!await modal.confirm('정말 대화방을 나가시겠습니까?')) return;

		try {
			// [수정] 퇴장 시스템 메시지 먼저 전송 (권한 문제 방지 및 순서 보장)
			await addDoc(collection(db, 'chatRooms', roomId, 'messages'), {
				text: `${$user.displayName || '알 수 없는 사용자'}님이 방을 나갔습니다.`,
				createdAt: serverTimestamp(),
				type: 'system'
			});

			const roomRef = doc(db, 'chatRooms', roomId);
			// 참여자 목록에서 제거
			await updateDoc(roomRef, {
				participants: arrayRemove($user.uid),
				participantCount: increment(-1)
			});

			goto('/chat'); 
		} catch (error) {
			console.error('대화방 나가기 실패:', error);
			await modal.alert('대화방을 나가는 중 오류가 발생했습니다.');
		}
	}

	function toggleMenu() {
		isMenuOpen = !isMenuOpen;
	}

	function closeMenu() {
		if (isMenuOpen) isMenuOpen = false;
	}

	function scrollToBottom() {
		if (scrollContainer) {
			scrollContainer.scrollTop = scrollContainer.scrollHeight;
		}
	}

	function formatTime(timestamp) {
		if (!timestamp) return '';
		return timestamp.toDate().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
	}

	onMount(() => {
		fetchRoomInfoAndJoin();
		subscribeToMessages();
		document.addEventListener('click', closeMenu);
	});

	onDestroy(() => {
		if (unsubscribe) unsubscribe();
		document.removeEventListener('click', closeMenu);
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
			
			<div class="menu-container" on:click|stopPropagation>
				<button class="icon-btn" on:click={toggleMenu}>
					<MoreVertical size={18} />
				</button>
				{#if isMenuOpen}
					<div class="dropdown-menu">
						<button class="menu-item delete" on:click={leaveRoom}>
							<LogOut size={16} />
							<span>나가기</span>
						</button>
					</div>
				{/if}
			</div>
		</div>
	</div>

	<div class="message-list" bind:this={scrollContainer} on:click={closeMenu}>
		<div class="date-divider">오늘</div>
		
		{#each messages as msg (msg.id)}
			{#if msg.type === 'system'}
				<div class="system-msg-row">
					<span class="system-msg-badge">{msg.text}</span>
				</div>
			{:else}
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
			{/if}
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
	.chat-room-container {
		display: flex;
		flex-direction: column;
		height: 100%; 
		background-color: #b2c7d9;
		position: relative;
	}

	.chat-info-bar {
		height: 48px;
		background-color: rgba(255, 255, 255, 0.9);
		display: flex;
		align-items: center;
		padding: 0 8px;
		border-bottom: 1px solid rgba(0,0,0,0.05);
		flex-shrink: 0;
		z-index: 10;
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

	.actions { display: flex; align-items: center; }

	.menu-container { position: relative; }

	.dropdown-menu {
		position: absolute;
		top: 100%;
		right: 0;
		margin-top: 8px;
		background: white;
		border-radius: 8px;
		box-shadow: 0 4px 12px rgba(0,0,0,0.15);
		min-width: 120px;
		overflow: hidden;
		padding: 4px 0;
		z-index: 20;
	}

	.menu-item {
		display: flex;
		align-items: center;
		gap: 8px;
		width: 100%;
		padding: 10px 16px;
		font-size: 13px;
		background: none;
		border: none;
		cursor: pointer;
		color: #333;
		text-align: left;
	}

	.menu-item:hover { background-color: #f5f5f5; }
	.menu-item.delete { color: #e53e3e; }

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

	/* [추가] 시스템 메시지 스타일 */
	.system-msg-row {
		display: flex;
		justify-content: center;
		margin: 8px 0;
	}
	
	.system-msg-badge {
		background-color: rgba(0, 0, 0, 0.15); /* 반투명 검정 배경 */
		color: white;
		font-size: 11px;
		padding: 4px 12px;
		border-radius: 12px;
	}

	.message-row {
		display: flex;
		align-items: flex-start;
		max-width: 80%;
	}

	.my-msg { align-self: flex-end; flex-direction: row-reverse; }
	.my-msg .bubble-wrapper { flex-direction: row-reverse; }
	.my-msg .bubble { background-color: #feec34; color: #000; border-top-right-radius: 0; }
	.my-msg .time { text-align: right; }

	.other-msg { align-self: flex-start; }
	.other-msg .bubble { background-color: #fff; color: #000; border-top-left-radius: 0; }

	.profile-pic {
		width: 32px;
		height: 32px;
		border-radius: 12px;
		overflow: hidden;
		margin-right: 8px;
		background-color: #eee;
	}

	.profile-pic img { width: 100%; height: 100%; object-fit: cover; }

	.message-content { display: flex; flex-direction: column; }

	.sender-name { font-size: 11px; color: #555; margin-bottom: 2px; margin-left: 2px; }

	.bubble-wrapper { display: flex; align-items: flex-end; gap: 6px; }

	.bubble {
		padding: 8px 12px;
		border-radius: 12px;
		font-size: 13px;
		line-height: 1.4;
		box-shadow: 0 1px 1px rgba(0,0,0,0.1);
		word-break: break-word;
	}

	.time { font-size: 10px; color: #555; white-space: nowrap; margin-bottom: 0; }

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

	.send-btn:disabled { background-color: #f0f0f0; color: #ccc; }
</style>