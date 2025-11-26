<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { db } from '$lib/firebase';
	import { collection, getDocs, query, where, orderBy, doc, getDoc } from 'firebase/firestore';
	import { Search, MapPin, Calendar, Plus, Loader2, SlidersHorizontal } from 'lucide-svelte';

	let meetings = [];
	let filteredMeetings = [];
	let isLoading = true;

	// 검색 및 필터 상태
	let searchTerm = '';
	let selectedCategory = '전체';
	let isFilterOpen = false;

	const categories = ['전체', '소셜', '취미', '운동', '독서', '여행', '기타'];

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
			
			// [수정] 호스트 닉네임 최신화
			meetings = await Promise.all(querySnapshot.docs.map(async (docSnap) => {
				const data = docSnap.data();
				
				if (data.hostId) {
					try {
						const hostSnap = await getDoc(doc(db, 'users', data.hostId));
						if (hostSnap.exists()) {
							data.hostName = hostSnap.data().nickname || data.hostName;
						}
					} catch (e) { console.error(e); }
				}

				return { id: docSnap.id, ...data };
			}));
			
			filterMeetings();
		} catch (error) {
			console.error("모임 목록 로딩 실패:", error);
		} finally {
			isLoading = false;
		}
	}

	// ... (filterMeetings, 반응형 필터, getRemainingTime, goToCreate 함수 유지) ...
	function filterMeetings() {
		filteredMeetings = meetings.filter(meeting => {
			const matchesSearch = (meeting.title?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
								  (meeting.location?.toLowerCase() || '').includes(searchTerm.toLowerCase());
			const matchesCategory = selectedCategory === '전체' || meeting.category === selectedCategory;
			
			return matchesSearch && matchesCategory;
		});
	}

	$: if (searchTerm || selectedCategory) {
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
			{#each filteredMeetings as meeting (meeting.id)}
				<a href="/meetings/{meeting.id}" class="meeting-card">
					<div class="image-wrapper">
						<img src={meeting.image} alt={meeting.title} />
						<div class="time-badge">{getRemainingTime(meeting.date)}</div>
					</div>
					<div class="content">
						<div class="top-row">
							<span class="category-label">{meeting.category}</span>
							<span class="host-name">by {meeting.hostName}</span>
						</div>
						<h3 class="title">{meeting.title}</h3>
						<div class="info-row">
							<div class="info-item">
								<Calendar size={14} /> 
								<span>{new Date(meeting.date).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
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
				<button class="reset-btn" on:click={() => { searchTerm = ''; selectedCategory = '전체'; }}>
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
		/* 스크롤바 숨기기 */
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

	/* 리스트 영역 */
	.meeting-list {
		padding: 16px;
		display: flex;
		flex-direction: column;
		gap: 16px;
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
		min-width: 0; /* 텍스트 말줄임용 */
	}

	.top-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 6px;
	}

	.category-label {
		font-size: 11px;
		color: #3182ce;
		background-color: #ebf8ff;
		padding: 2px 6px;
		border-radius: 4px;
		font-weight: bold;
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

	.info-item {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 12px;
		color: #718096;
	}
	
	.info-item.location span {
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		max-width: 180px;
	}

	/* 상태 메시지 */
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

	/* FAB */
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