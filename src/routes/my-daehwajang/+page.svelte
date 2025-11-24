<script>
	import { onMount } from 'svelte';
	import { user } from '$lib/stores';
	import { db } from '$lib/firebase';
	import { collection, query, where, getDocs, doc, getDoc, orderBy } from 'firebase/firestore';
	import { Calendar, MapPin, Loader2, Plus } from 'lucide-svelte';
	import { goto } from '$app/navigation';

	// 탭 상태 관리
	let activeTab = 'participating';
	let participatingMeetings = [];
	let appliedMeetings = [];
	let isLoading = true;

	// [수정] 중복 실행 방지를 위한 변수 추가
	let loadedUserId = null;

	// [수정] 유저 ID가 변경되었을 때만 데이터 가져오기 (무한 루프 방지)
	$: if ($user) {
		if ($user.uid !== loadedUserId) {
			loadedUserId = $user.uid;
			fetchMyMeetings();
		}
	} else if (!$user && !isLoading) {
		// 로그아웃 상태 처리
		participatingMeetings = [];
		appliedMeetings = [];
		loadedUserId = null;
		isLoading = false; // 로딩 상태 해제
	}

	async function fetchMyMeetings() {
		isLoading = true;
		try {
			// 1. 내 신청 내역 가져오기 (최신순)
			const q = query(
				collection(db, 'meeting_applications'),
				where('userId', '==', $user.uid),
				orderBy('appliedAt', 'desc')
			);
			const snapshot = await getDocs(q);
			const applications = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

			// 2. 각 신청 건에 대해 모임 상세 정보 가져오기
			const promises = applications.map(async (app) => {
				if (!app.meetingId) return null;

				try {
					const meetingRef = doc(db, 'meetings', app.meetingId);
					const meetingSnap = await getDoc(meetingRef);
					
					if (meetingSnap.exists()) {
						const meetingData = meetingSnap.data();
						return {
							...app,
							title: meetingData.title,
							date: meetingData.date,
							location: meetingData.location,
							image: meetingData.image,
							dday: calculateDday(meetingData.date)
						};
					}
					return null;
				} catch (e) {
					console.error(e);
					return null;
				}
			});

			const results = await Promise.all(promises);
			const validResults = results.filter(r => r !== null);

			// 3. 상태별로 분류
			participatingMeetings = validResults.filter(r => r.status === 'accepted');
			appliedMeetings = validResults.filter(r => r.status === 'pending');

		} catch (error) {
			console.error("내 모임 로딩 실패:", error);
		} finally {
			isLoading = false;
		}
	}

	function calculateDday(dateStr) {
		if (!dateStr) return '-';
		const target = new Date(dateStr);
		const now = new Date();
		const diffTime = target.getTime() - now.getTime();
		const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
		
		if (diffDays < 0) return '종료';
		if (diffDays === 0) return 'D-Day';
		return `D-${diffDays}`;
	}

	function formatMeetingDate(isoString) {
		if (!isoString) return '';
		const date = new Date(isoString);
		return date.toLocaleString('ko-KR', {
			month: 'numeric', day: 'numeric',
			weekday: 'short', hour: '2-digit', minute: '2-digit'
		});
	}

	function goToCreate() {
		goto('/meetings/new');
	}
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
		{#if isLoading}
			<div class="loading-state">
				<Loader2 size={24} class="spin" />
				<span>정보를 불러오는 중입니다...</span>
			</div>
		{:else if !$user}
			<div class="empty-state">
				<p>로그인이 필요한 서비스입니다.</p>
				<a href="/login" class="login-link">로그인하기</a>
			</div>
		{:else if activeTab === 'participating'}
			{#if participatingMeetings.length > 0}
				{#each participatingMeetings as meeting}
					<div class="meeting-card">
						<div class="image-wrapper">
							<img src={meeting.image} alt={meeting.title} />
							<span class="d-day-badge">{meeting.dday}</span>
						</div>
						<div class="content">
							<div class="status-row">
								<span class="status-badge confirmed">참여확정</span>
							</div>
							<h3 class="title">{meeting.title}</h3>
							<div class="info-row">
								<Calendar size={14} /> <span>{formatMeetingDate(meeting.date)}</span>
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
								<span class="status-badge waiting">승인대기</span>
							</div>
							<h3 class="title">{meeting.title}</h3>
							<div class="info-row">
								<Calendar size={14} /> <span>{formatMeetingDate(meeting.date)}</span>
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

	<button class="fab" on:click={goToCreate} aria-label="모임 개설하기">
		<Plus size={24} />
	</button>
</div>

<style>
	/* 스타일은 기존과 동일 */
	.page-container {
		padding: 20px 16px;
		padding-bottom: 80px;
		position: relative;
		min-height: 100vh;
	}

	.page-title {
		font-size: 22px;
		font-weight: bold;
		margin: 0 0 20px 0;
	}

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

	.empty-state, .loading-state {
		padding: 60px 0;
		text-align: center;
		color: #999;
		font-size: 14px;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 10px;
	}

	.spin { animation: spin 1s linear infinite; }
	@keyframes spin { 100% { transform: rotate(360deg); } }

	.login-link {
		color: #1976d2;
		text-decoration: underline;
		font-weight: bold;
	}

	.fab {
		position: fixed;
		bottom: 80px;
		right: 20px;
		width: 56px;
		height: 56px;
		border-radius: 50%;
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