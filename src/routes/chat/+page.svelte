<script>
	import { Plus, Users, MessageCircle } from 'lucide-svelte';

	// 임시 데이터: 내가 개설한 채팅방 목록
	let myChatRooms = [
		{
			id: 1,
			title: '주말 독서의 장 📚',
			lastMessage: '이번 주 모임 장소 예약 완료했습니다! 공지 확인해주세요.',
			timestamp: '방금 전',
			unreadCount: 2,
			participantCount: 8,
			image: '/images/book.png'
		},
		{
			id: 2,
			title: '신천 러닝 크루 🏃',
			lastMessage: '오늘 비 오는데 러닝 진행하나요?',
			timestamp: '오전 10:30',
			unreadCount: 0,
			participantCount: 15,
			image: '/images/run.png'
		},
		{
			id: 3,
			title: '사이드 프로젝트 팀 (디자인/개발)',
			lastMessage: '개발자님, 피그마 시안 확인 부탁드려요~',
			timestamp: '어제',
			unreadCount: 5,
			participantCount: 4,
			image: 'https://placehold.co/100x100/333/fff?text=P'
		}
	];
</script>

<div class="page-container">
	<div class="header-row">
		<h2 class="page-title">대화</h2>
		<span class="room-count">개설 {myChatRooms.length}</span>
	</div>

	<div class="chat-list">
		{#if myChatRooms.length > 0}
			{#each myChatRooms as room}
				<a href="/chat/{room.id}" class="chat-item">
					<div class="image-wrapper">
						<img src={room.image} alt={room.title} />
					</div>
					<div class="content">
						<div class="top-row">
							<h3 class="title">{room.title}</h3>
							<span class="time">{room.timestamp}</span>
						</div>
						<div class="bottom-row">
							<p class="message">{room.lastMessage}</p>
							{#if room.unreadCount > 0}
								<span class="unread-badge">{room.unreadCount}</span>
							{/if}
						</div>
						<div class="meta-row">
							<div class="meta-item">
								<Users size={12} />
								<span>{room.participantCount}명</span>
							</div>
							<div class="meta-item host-badge">
								<span>HOST</span>
							</div>
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

	<button class="fab" aria-label="새 대화방 개설">
		<Plus size={24} />
	</button>
</div>

<style>
	.page-container {
		padding: 20px 16px;
		position: relative;
		min-height: 100%; /* FAB 위치 잡기 위해 */
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

	/* 채팅 리스트 스타일 */
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
		background-color: white; /* 터치 시 하이라이트 효과 등을 위해 배경 지정 권장 */
	}

	.chat-item:active {
		opacity: 0.7;
	}

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
		min-width: 0; /* 텍스트 말줄임 처리를 위해 필수 */
		padding-bottom: 12px;
		border-bottom: 1px solid #f5f5f5;
	}

	/* 마지막 아이템은 선 없애기 */
	.chat-item:last-child .content {
		border-bottom: none;
	}

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

	.unread-badge {
		background-color: #ff3b30;
		color: white;
		font-size: 10px;
		font-weight: bold;
		min-width: 18px;
		height: 18px;
		border-radius: 9px;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0 4px;
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

	/* 플로팅 버튼 (FAB) */
	.fab {
		position: fixed;
		bottom: 80px; /* 탭바 높이 고려 */
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

	.fab:active {
		transform: scale(0.95);
	}
</style>