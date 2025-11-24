<script>
	import { onMount, onDestroy } from 'svelte';
	import { user } from '$lib/stores';
	import { db } from '$lib/firebase';
	import { 
		collection, 
		query, 
		where, 
		orderBy, 
		onSnapshot, 
		addDoc, 
		serverTimestamp 
	} from 'firebase/firestore';
	import { Plus, Users, MessageCircle } from 'lucide-svelte';

	let chatRooms = [];
	let unsubscribe = null;

	// 채팅방 목록 실시간 구독
	// (실제 앱에서는 'participants' 배열에 내 ID가 있는 방만 가져오는 것이 좋음)
	function subscribeToChatRooms() {
		const q = query(
			collection(db, 'chatRooms'),
			orderBy('timestamp', 'desc') // 최신 대화가 오간 순서대로 정렬
		);

		unsubscribe = onSnapshot(q, (snapshot) => {
			chatRooms = snapshot.docs.map(doc => ({
				id: doc.id,
				...doc.data()
			}));
		});
	}

	onMount(() => {
		subscribeToChatRooms();
	});

	onDestroy(() => {
		if (unsubscribe) unsubscribe();
	});

	// 새 채팅방 만들기 (간단히 prompt로 제목 입력받기)
	async function createChatRoom() {
		if (!$user) return alert('로그인이 필요합니다!');
		
		const title = prompt('새로운 채팅방 이름을 입력하세요:', '자유 대화방');
		if (!title) return;

		try {
			await addDoc(collection(db, 'chatRooms'), {
				title: title,
				hostId: $user.uid,
				hostName: $user.displayName || '익명',
				image: '/images/cafe.png', // 기본 이미지
				lastMessage: '대화가 시작되었습니다.',
				timestamp: serverTimestamp(),
				participantCount: 1,
				participants: [$user.uid]
			});
		} catch (error) {
			console.error('채팅방 생성 실패:', error);
			alert('채팅방을 만들지 못했습니다.');
		}
	}

	// 날짜 포맷팅 (예: 방금 전, 10:30, 어제)
	function formatTime(timestamp) {
		if (!timestamp) return '';
		const date = timestamp.toDate();
		const now = new Date();
		const diff = (now - date) / 1000; // 초 단위

		if (diff < 60) return '방금 전';
		if (diff < 60 * 60) return `${Math.floor(diff / 60)}분 전`;
		if (diff < 60 * 60 * 24) return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
		return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
	}
</script>

<div class="page-container">
	<div class="header-row">
		<h2 class="page-title">대화</h2>
		<span class="room-count">개설 {chatRooms.length}</span>
	</div>

	<div class="chat-list">
		{#if chatRooms.length > 0}
			{#each chatRooms as room (room.id)}
				<a href="/chat/{room.id}" class="chat-item">
					<div class="image-wrapper">
						<img src={room.image} alt={room.title} />
					</div>
					<div class="content">
						<div class="top-row">
							<h3 class="title">{room.title}</h3>
							<span class="time">{formatTime(room.timestamp)}</span>
						</div>
						<div class="bottom-row">
							<p class="message">{room.lastMessage}</p>
							</div>
						<div class="meta-row">
							<div class="meta-item">
								<Users size={12} />
								<span>{room.participantCount}명</span>
							</div>
							{#if room.hostId === $user?.uid}
								<div class="meta-item host-badge">
									<span>HOST</span>
								</div>
							{/if}
						</div>
					</div>
				</a>
			{/each}
		{:else}
			<div class="empty-state">
				<MessageCircle size={48} color="#ddd" />
				<p>개설한 대화방이 없습니다.<br />새로운 모임을 만들어보세요!</p>
			</div>
		{/if}
	</div>

	<button class="fab" aria-label="새 대화방 개설" on:click={createChatRoom}>
		<Plus size={24} />
	</button>
</div>

<style>
	.page-container {
		padding: 20px 16px;
		position: relative;
		min-height: 100%;
		padding-bottom: 80px; /* FAB 공간 확보 */
	}

	.header-row {
		display: flex;
		align-items: baseline;
		gap: 8px;
		margin-bottom: 20px;
	}

	.page-title {
		font-size: 22px;
		font-weight: bold;
		margin: 0;
	}

	.room-count {
		font-size: 14px;
		color: #888;
		font-weight: 500;
	}

	.chat-list {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.chat-item {
		display: flex;
		gap: 12px;
		text-decoration: none;
		color: inherit;
		background-color: white;
	}

	.chat-item:active { opacity: 0.7; }

	.image-wrapper {
		width: 56px;
		height: 56px;
		border-radius: 20px;
		overflow: hidden;
		flex-shrink: 0;
		background-color: #f0f0f0;
		border: 1px solid #eee;
	}

	.image-wrapper img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.content {
		flex: 1;
		display: flex;
		flex-direction: column;
		justify-content: center;
		min-width: 0;
		padding-bottom: 12px;
		border-bottom: 1px solid #f5f5f5;
	}

	.chat-item:last-child .content { border-bottom: none; }

	.top-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 4px;
	}

	.title {
		font-size: 16px;
		font-weight: bold;
		margin: 0;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		color: #333;
	}

	.time {
		font-size: 11px;
		color: #999;
		flex-shrink: 0;
		margin-left: 8px;
	}

	.bottom-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 6px;
	}

	.message {
		font-size: 13px;
		color: #666;
		margin: 0;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		flex: 1;
		margin-right: 8px;
	}

	.meta-row {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.meta-item {
		display: flex;
		align-items: center;
		gap: 2px;
		font-size: 11px;
		color: #999;
	}

	.host-badge {
		color: #4285F4;
		font-weight: bold;
		background-color: #e8f0fe;
		padding: 2px 6px;
		border-radius: 4px;
	}

	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 60px 0;
		gap: 16px;
		color: #ccc;
		text-align: center;
	}

	.empty-state p {
		margin: 0;
		font-size: 14px;
		color: #999;
		line-height: 1.5;
	}

	.fab {
		position: fixed;
		bottom: 80px;
		right: 20px;
		width: 56px;
		height: 56px;
		border-radius: 28px;
		background-color: #333;
		color: white;
		border: none;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		z-index: 100;
		transition: transform 0.2s;
	}

	.fab:active { transform: scale(0.95); }
</style>