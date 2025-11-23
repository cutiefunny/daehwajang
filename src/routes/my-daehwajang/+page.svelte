<script>
	import { Calendar, MapPin, Clock } from 'lucide-svelte';

	// 탭 상태 관리 ('applied' | 'participating')
	let activeTab = 'participating';

	// 임시 데이터: 참여 중인 모임
	let participatingMeetings = [
		{
			id: 1,
			title: '주말 독서의 장',
			date: '2025. 11. 28 (토) 14:00',
			location: '강남구 테헤란로',
			image: '/images/book.png',
			status: '참여확정',
			dday: 'D-3'
		},
		{
			id: 2,
			title: '신천 러닝 크루',
			date: '2025. 11. 26 (목) 19:30',
			location: '송파구 올림픽로',
			image: '/images/run.png',
			status: '참여확정',
			dday: 'D-1'
		}
	];

	// 임시 데이터: 신청한 모임 (대기중)
	let appliedMeetings = [
		{
			id: 3,
			title: '개발자 네트워킹',
			date: '2025. 12. 05 (금) 19:00',
			location: '분당구 불정로',
			image: 'https://placehold.co/600x400/black/white?text=Dev',
			status: '승인대기'
		}
	];
</script>

<div class="page-container">
	<h2 class="page-title">내 대화장</h2>

	<div class="tabs">
		<button
			class="tab-btn"
			class:active={activeTab === 'participating'}
			on:click={() => (activeTab = 'participating')}
		>
			참여 중 {participatingMeetings.length}
		</button>
		<button
			class="tab-btn"
			class:active={activeTab === 'applied'}
			on:click={() => (activeTab = 'applied')}
		>
			신청 내역 {appliedMeetings.length}
		</button>
	</div>

	<div class="list-container">
		{#if activeTab === 'participating'}
			{#if participatingMeetings.length > 0}
				{#each participatingMeetings as meeting}
					<div class="meeting-card">
						<div class="image-wrapper">
							<img src={meeting.image} alt={meeting.title} />
							<span class="d-day-badge">{meeting.dday}</span>
						</div>
						<div class="content">
							<div class="status-row">
								<span class="status-badge confirmed">{meeting.status}</span>
							</div>
							<h3 class="title">{meeting.title}</h3>
							<div class="info-row">
								<Calendar size={14} /> <span>{meeting.date}</span>
							</div>
							<div class="info-row">
								<MapPin size={14} /> <span>{meeting.location}</span>
							</div>
						</div>
					</div>
				{/each}
			{:else}
				<div class="empty-state">
					<p>참여 중인 모임이 없습니다.</p>
				</div>
			{/if}
		{:else}
			{#if appliedMeetings.length > 0}
				{#each appliedMeetings as meeting}
					<div class="meeting-card">
						<div class="image-wrapper grayscale">
							<img src={meeting.image} alt={meeting.title} />
						</div>
						<div class="content">
							<div class="status-row">
								<span class="status-badge waiting">{meeting.status}</span>
							</div>
							<h3 class="title">{meeting.title}</h3>
							<div class="info-row">
								<Calendar size={14} /> <span>{meeting.date}</span>
							</div>
							<div class="info-row">
								<MapPin size={14} /> <span>{meeting.location}</span>
							</div>
						</div>
					</div>
				{/each}
			{:else}
				<div class="empty-state">
					<p>신청한 모임이 없습니다.</p>
				</div>
			{/if}
		{/if}
	</div>
</div>

<style>
	.page-container {
		padding: 20px 16px;
	}

	.page-title {
		font-size: 22px;
		font-weight: bold;
		margin: 0 0 20px 0;
	}

	/* 탭 스타일 */
	.tabs {
		display: flex;
		gap: 8px;
		margin-bottom: 24px;
		border-bottom: 1px solid #eee;
	}

	.tab-btn {
		background: none;
		border: none;
		padding: 12px 4px;
		font-size: 16px;
		font-weight: 500;
		color: #999;
		cursor: pointer;
		position: relative;
	}

	.tab-btn.active {
		color: #333;
		font-weight: bold;
	}

	.tab-btn.active::after {
		content: '';
		position: absolute;
		bottom: -1px;
		left: 0;
		width: 100%;
		height: 2px;
		background-color: #333;
	}

	/* 카드 리스트 스타일 */
	.list-container {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.meeting-card {
		display: flex;
		background-color: white;
		border-radius: 12px;
		overflow: hidden;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
		border: 1px solid #f0f0f0;
		height: 120px;
	}

	.image-wrapper {
		width: 120px;
		flex-shrink: 0;
		position: relative;
	}

	.image-wrapper img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
	
	.image-wrapper.grayscale img {
		filter: grayscale(100%);
		opacity: 0.8;
	}

	.d-day-badge {
		position: absolute;
		top: 8px;
		left: 8px;
		background-color: rgba(0, 0, 0, 0.7);
		color: white;
		font-size: 11px;
		padding: 2px 6px;
		border-radius: 4px;
		font-weight: bold;
	}

	.content {
		flex: 1;
		padding: 12px 16px;
		display: flex;
		flex-direction: column;
		justify-content: center;
	}

	.status-row {
		margin-bottom: 6px;
	}

	.status-badge {
		font-size: 11px;
		padding: 4px 8px;
		border-radius: 4px;
		font-weight: bold;
	}

	.status-badge.confirmed {
		background-color: #e3f2fd;
		color: #1976d2;
	}

	.status-badge.waiting {
		background-color: #f5f5f5;
		color: #666;
	}

	.title {
		font-size: 16px;
		font-weight: bold;
		margin: 0 0 8px 0;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.info-row {
		display: flex;
		align-items: center;
		gap: 4px;
		font-size: 12px;
		color: #888;
		margin-bottom: 2px;
	}

	.empty-state {
		padding: 40px 0;
		text-align: center;
		color: #999;
		font-size: 14px;
	}
</style>