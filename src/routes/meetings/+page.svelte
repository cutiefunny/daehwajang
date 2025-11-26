<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores'; // [추가] URL 파라미터 접근
	import { db } from '$lib/firebase';
	import { collection, getDocs, query, where, orderBy, doc, getDoc, getCountFromServer } from 'firebase/firestore';
	import { user } from '$lib/stores';
	import { Search, MapPin, Calendar, Plus, Loader2, SlidersHorizontal, Users, Crown } from 'lucide-svelte';

	let meetings = [];
	let filteredMeetings = [];
	let isLoading = true;

	// 검색 및 필터 상태
	let searchTerm = '';
	let selectedCategory = '전체';

	const categories = ['전체', '소셜', '취미', '운동', '독서', '여행', '기타'];

	// [추가] URL 쿼리 파라미터 감지하여 검색어 자동 설정
	// $page.url.searchParams.get('q') 값이 바뀌면 searchTerm에 반영됨 -> 아래 필터 로직 자동 실행
	$: queryParam = $page.url.searchParams.get('q');
	$: if (queryParam !== null) {
		searchTerm = queryParam;
	}

	// 로그인 상태가 변경되면 목록을 다시 정렬
	$: if ($user && meetings.length > 0) {
		sortMeetings();
	}

	onMount(async () => {
		await fetchMeetings();
	});

	async function fetchMeetings() {
		isLoading = true;
		try {
			const now = new Date().toISOString();
			const q = query(
				collection(db, 'meetings'),
				where('date', '>=', now),
				orderBy('date', 'asc')
			);
			
			const querySnapshot = await getDocs(q);

			// 내 신청 내역 미리 가져오기 (로그인 시)
			let myApplications = {};
			if ($user) {
				try {
					const myAppsQ = query(
						collection(db, 'meeting_applications'),
						where('userId', '==', $user.uid)
					);
					const myAppsSnap = await getDocs(myAppsQ);
					myAppsSnap.forEach(doc => {
						const data = doc.data();
						myApplications[data.meetingId] = data.status; // 'pending' or 'accepted'
					});
				} catch (e) { console.error(e); }
			}
			
			const loadedMeetings = await Promise.all(querySnapshot.docs.map(async (docSnap) => {
				const data = docSnap.data();
				
				// 1. 호스트 정보
				if (data.hostId) {
					try {
						const hostSnap = await getDoc(doc(db, 'users', data.hostId));
						if (hostSnap.exists()) {
							data.hostName = hostSnap.data().nickname || data.hostName;
						}
					} catch (e) { console.error(e); }
				}

				// 2. 참여 인원
				let currentParticipants = 0;
				try {
					const countQ = query(
						collection(db, 'meeting_applications'),
						where('meetingId', '==', docSnap.id),
						where('status', '==', 'accepted')
					);
					const countSnap = await getCountFromServer(countQ);
					currentParticipants = countSnap.data().count;
				} catch (e) { console.error(e); }

				return { 
					id: docSnap.id, 
					...data,
					currentParticipants,
					maxParticipants: data.maxParticipants || 5,
					myStatus: myApplications[docSnap.id] || null
				};
			}));

			meetings = loadedMeetings;
			sortMeetings(); // 데이터 로드 후 정렬 및 필터링 실행
			
		} catch (error) {
			console.error("모임 목록 로딩 실패:", error);
		} finally {
			isLoading = false;
		}
	}

	function sortMeetings() {
		if (!$user) {
			filterMeetings();
			return;
		}

		meetings.sort((a, b) => {
			const aIsHost = a.hostId === $user.uid;
			const bIsHost = b.hostId === $user.uid;

			// 1순위: 내가 호스트인 모임
			if (aIsHost && !bIsHost) return -1;
			if (!aIsHost && bIsHost) return 1;

			// 2순위: 내가 참여/요청 중인 모임
			const aIsApplied = (a.myStatus === 'pending' || a.myStatus === 'accepted');
			const bIsApplied = (b.myStatus === 'pending' || b.myStatus === 'accepted');

			if (aIsApplied && !bIsApplied) return -1;
			if (!aIsApplied && bIsApplied) return 1;
			
			// 3순위: 날짜순
			return 0;
		});

		filterMeetings();
	}

	function filterMeetings() {
		filteredMeetings = meetings.filter(meeting => {
			const matchesSearch = (meeting.title?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
								  (meeting.location?.toLowerCase() || '').includes(searchTerm.toLowerCase());
			const matchesCategory = selectedCategory === '전체' || meeting.category === selectedCategory;
			
			return matchesSearch && matchesCategory;
		});
	}

	// 검색어 또는 카테고리가 변경될 때마다 필터링 실행
	$: if (searchTerm !== undefined || selectedCategory) {
		filterMeetings();
	}

	function getRemainingTime(targetDateStr) {
		const diff = new Date(targetDateStr) - new Date();
		if (diff <= 0) return '마감됨';
		const days = Math.floor(diff / (1000 * 60 * 60 * 24));
		const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
		return days === 0 ? `${hours}시간 남음` : `${days}일 ${hours}시간 남음`;
	}

	function goToCreate() {
		goto('/meetings/new');
	}

	function shouldShowDivider(index) {
		if (!$user || index === 0) return false;
		const prev = filteredMeetings[index - 1];
		const curr = filteredMeetings[index];
		return (prev.hostId === $user.uid) && (curr.hostId !== $user.uid);
	}
</script>

<div class="page-container">
	<div class="header-area">
		<h2 class="page-title">모임 찾기</h2>
		
		<div class="search-bar">
			<Search size={20} class="search-icon" />
			<input 
				type="text" 
				placeholder="모임명, 지역 검색" 
				bind:value={searchTerm}
			/>
		</div>

		<div class="category-scroll">
			{#each categories as category}
				<button 
					class="chip {selectedCategory === category ? 'active' : ''}"
					on:click={() => selectedCategory = category}
				>
					{category}
				</button>
			{/each}
		</div>
	</div>

	<div class="meeting-list">
		{#if isLoading}
			<div class="loading-state">
				<Loader2 size={32} class="spin" />
				<p>모임을 불러오고 있습니다...</p>
			</div>
		{:else if filteredMeetings.length > 0}
			{#each filteredMeetings as meeting, index (meeting.id)}
				{#if shouldShowDivider(index)}
					<div class="list-divider">
						<div class="divider-line"></div>
						<span class="divider-text">다른 모임 둘러보기</span>
						<div class="divider-line"></div>
					</div>
				{/if}

				<a href="/meetings/{meeting.id}" class="meeting-card">
					<div class="image-wrapper">
						<img src={meeting.image} alt={meeting.title} />
						<div class="time-badge">{getRemainingTime(meeting.date)}</div>
					</div>
					<div class="content">
						<div class="top-row">
							<div class="badge-group">
								<span class="category-label">{meeting.category}</span>
								{#if meeting.hostId !== $user?.uid}
									{#if meeting.myStatus === 'pending'}
										<span class="status-pill pending">요청 중</span>
									{:else if meeting.myStatus === 'accepted'}
										<span class="status-pill accepted">참여 예정</span>
									{/if}
								{/if}
							</div>
							
							<div class="host-wrapper">
								{#if $user && $user.uid === meeting.hostId}
									<span class="host-badge">
										<Crown size={10} /> HOST
									</span>
								{/if}
								<span class="host-name">by {meeting.hostName}</span>
							</div>
						</div>

						<h3 class="title">{meeting.title}</h3>
						
						<div class="info-row">
							<div class="info-group">
								<div class="info-item">
									<Calendar size={14} /> 
									<span>{new Date(meeting.date).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
								</div>
								<div class="info-item participants">
									<Users size={14} />
									<span>{meeting.currentParticipants}/{meeting.maxParticipants}명</span>
								</div>
							</div>
							<div class="info-item location">
								<MapPin size={14} />
								<span>{meeting.location}</span>
							</div>
						</div>
					</div>
				</a>
			{/each}
		{:else}
			<div class="empty-state">
				<p>조건에 맞는 모임이 없습니다 😢</p>
				<button class="reset-btn" on:click={() => { searchTerm = ''; selectedCategory = '전체'; goto('/meetings'); }}>
					필터 초기화
				</button>
			</div>
		{/if}
	</div>

	<button class="fab" on:click={goToCreate} aria-label="새 모임 만들기">
		<Plus size={24} />
	</button>
</div>

<style>
	.page-container {
		background-color: #fff;
		min-height: 100vh;
		padding-bottom: 80px;
	}

	.header-area {
		position: sticky;
		top: 0;
		background-color: #fff;
		z-index: 10;
		padding: 20px 16px 10px 16px;
		border-bottom: 1px solid #f0f0f0;
	}

	.page-title {
		font-size: 24px;
		font-weight: 800;
		margin: 0 0 16px 0;
		color: #1a1a1a;
	}

	.search-bar {
		display: flex;
		align-items: center;
		background-color: #f5f7fa;
		border-radius: 12px;
		padding: 12px 16px;
		margin-bottom: 16px;
	}

	.search-icon {
		color: #999;
		margin-right: 8px;
	}

	.search-bar input {
		flex: 1;
		border: none;
		background: transparent;
		font-size: 15px;
		outline: none;
	}

	.category-scroll {
		display: flex;
		gap: 8px;
		overflow-x: auto;
		padding-bottom: 8px;
		-ms-overflow-style: none;
		scrollbar-width: none;
	}
	.category-scroll::-webkit-scrollbar {
		display: none;
	}

	.chip {
		white-space: nowrap;
		padding: 8px 16px;
		border-radius: 20px;
		font-size: 14px;
		font-weight: 600;
		border: 1px solid #eee;
		background-color: #fff;
		color: #666;
		cursor: pointer;
		transition: all 0.2s;
	}

	.chip.active {
		background-color: #333;
		color: #fff;
		border-color: #333;
	}

	.meeting-list {
		padding: 16px;
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.list-divider {
		display: flex;
		align-items: center;
		gap: 12px;
		margin: 8px 0;
		color: #a0aec0;
		font-size: 13px;
		font-weight: 500;
	}
	.divider-line {
		flex: 1;
		height: 1px;
		background-color: #e2e8f0;
	}
	.divider-text {
		color: #718096;
	}

	.meeting-card {
		display: flex;
		background-color: white;
		border-radius: 16px;
		overflow: hidden;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
		border: 1px solid #f0f0f0;
		text-decoration: none;
		color: inherit;
		transition: transform 0.2s;
		height: 120px;
	}
	
	.meeting-card:active {
		transform: scale(0.98);
	}

	.image-wrapper {
		width: 120px;
		height: 100%;
		position: relative;
		flex-shrink: 0;
	}

	.image-wrapper img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.time-badge {
		position: absolute;
		top: 8px;
		left: 8px;
		background-color: rgba(0, 0, 0, 0.6);
		color: white;
		font-size: 10px;
		font-weight: bold;
		padding: 4px 6px;
		border-radius: 4px;
		backdrop-filter: blur(4px);
	}

	.content {
		flex: 1;
		padding: 12px 16px;
		display: flex;
		flex-direction: column;
		justify-content: center;
		min-width: 0;
	}

	.top-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 6px;
	}

	.badge-group {
		display: flex;
		align-items: center;
		gap: 6px;
	}

	.category-label {
		font-size: 11px;
		color: #3182ce;
		background-color: #ebf8ff;
		padding: 2px 6px;
		border-radius: 4px;
		font-weight: bold;
	}

	.status-pill {
		font-size: 10px;
		padding: 2px 6px;
		border-radius: 4px;
		font-weight: bold;
	}
	.status-pill.pending {
		background-color: #fffaf0;
		color: #dd6b20;
		border: 1px solid #fbd38d;
	}
	.status-pill.accepted {
		background-color: #f0fff4;
		color: #38a169;
		border: 1px solid #9ae6b4;
	}

	.host-wrapper {
		display: flex;
		align-items: center;
		gap: 6px;
	}

	.host-badge {
		display: inline-flex;
		align-items: center;
		gap: 2px;
		font-size: 10px;
		padding: 2px 5px;
		background-color: #FEFCBF;
		color: #B7791F;
		border-radius: 4px;
		font-weight: 800;
		border: 1px solid #F6E05E;
	}

	.host-name {
		font-size: 12px;
		color: #999;
	}

	.title {
		font-size: 16px;
		font-weight: bold;
		margin: 0 0 8px 0;
		color: #2d3748;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.info-row {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.info-group {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.info-item {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 12px;
		color: #718096;
	}
	
	.info-item.participants {
		font-weight: 600;
		color: #4a5568;
	}
	
	.info-item.location span {
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		max-width: 180px;
	}

	.loading-state, .empty-state {
		padding: 60px 0;
		text-align: center;
		color: #999;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 12px;
	}

	.spin { animation: spin 1s linear infinite; }
	@keyframes spin { 100% { transform: rotate(360deg); } }

	.reset-btn {
		margin-top: 8px;
		background-color: #edf2f7;
		border: none;
		padding: 8px 16px;
		border-radius: 8px;
		color: #4a5568;
		font-weight: 600;
		cursor: pointer;
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