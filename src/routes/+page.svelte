<script>
	import { onMount, onDestroy } from 'svelte';
	import { goto } from '$app/navigation';
	import emblaCarouselSvelte from 'embla-carousel-svelte';
	import { db } from '$lib/firebase';
	import { collection, getDocs, query, orderBy, where, limit, doc, getDoc } from 'firebase/firestore';
	import { appSettings, user } from '$lib/stores';
	import { X, Briefcase, ChevronRight } from 'lucide-svelte';
	import UserProfileModal from '$lib/components/UserProfileModal.svelte';

	// 모임 슬라이더 옵션
	let emblaOptions = { loop: false, align: 'start', containScroll: 'trimSnaps' };
	// 이벤트 슬라이더 관련 변수
	let eventEmblaApi;
	let eventEmblaOptions = { loop: true, align: 'center' };
	let activeEvents = [];
	let autoplayInterval;

	// 데이터 상태
	let meetings = [];
	let randomUsers = [];
	let isLoading = true;
	// 배너 모달 상태
	let showBannerModal = false;
	let activeBanner = null;
	let dontShowChecked = false;
	// 프로필 모달 상태
	let selectedUser = null;

	function getLocalTodayString() {
		const now = new Date();
		const year = now.getFullYear();
		const month = String(now.getMonth() + 1).padStart(2, '0');
		const day = String(now.getDate()).padStart(2, '0');
		return `${year}-${month}-${day}`;
	}

	// user 상태가 변경되거나 설정이 로드되면 모임 목록 다시 불러오기
	$: if ($appSettings.sliderLimit || $user) {
		fetchMeetings();
	}

	async function fetchMeetings() {
		try {
			const now = new Date().toISOString();
			const fetchLimit = ($appSettings.sliderLimit || 5) + 10;
			
			const q = query(
				collection(db, 'meetings'), 
				where('date', '>=', now), 
				orderBy('date', 'asc'),
				limit(fetchLimit)
			);
			const querySnapshot = await getDocs(q);
			
			// [수정] 호스트 닉네임 최신화 로직 추가
			const allMeetings = await Promise.all(querySnapshot.docs.map(async (docSnap) => {
				const data = docSnap.data();
				
				// 호스트 정보 실시간 조회
				if (data.hostId) {
					try {
						const hostSnap = await getDoc(doc(db, 'users', data.hostId));
						if (hostSnap.exists()) {
							const hostData = hostSnap.data();
							data.hostName = hostData.nickname || data.hostName; // 닉네임 덮어쓰기
						}
					} catch (e) {
						console.error("호스트 정보 로딩 실패", e);
					}
				}

				return { id: docSnap.id, ...data };
			}));

			let filteredMeetings = allMeetings;

			// 내가 호스트인 모임 필터링
			if ($user) {
				filteredMeetings = filteredMeetings.filter(m => m.hostId !== $user.uid);
			}

			// 설정된 개수만큼 자르기
			meetings = filteredMeetings.slice(0, $appSettings.sliderLimit || 5);

		} catch (error) { console.error(error);
		} 
		finally { isLoading = false; }
	}

	// ... (나머지 함수 fetchActiveEvents, fetchRandomUsers, onEventInit, startAutoplay, checkAndShowBanner, closeBanner, getRemainingTime, openProfileModal 유지) ...
	async function fetchActiveEvents() {
		try {
			const today = getLocalTodayString();
			const q = query(collection(db, 'events'), orderBy('createdAt', 'desc'));
			const snapshot = await getDocs(q);
			const allEvents = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
			activeEvents = allEvents.filter(e => e.startDate <= today && e.endDate >= today);
		} catch (error) { console.error("이벤트 로딩 실패", error); }
	}

	async function fetchRandomUsers() {
		try {
			const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'), limit(20));
			const snapshot = await getDocs(q);
			let allUsers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
			
			if ($user) {
				allUsers = allUsers.filter(u => u.id !== $user.uid);
			}

			for (let i = allUsers.length - 1; i > 0; i--) {
				const j = Math.floor(Math.random() * (i + 1));
				[allUsers[i], allUsers[j]] = [allUsers[j], allUsers[i]];
			}
			randomUsers = allUsers.slice(0, 5);
		} catch (error) { console.error("회원 추천 로딩 실패", error); }
	}

	function onEventInit(event) {
		eventEmblaApi = event.detail;
		startAutoplay();
	}

	function startAutoplay() {
		if (activeEvents.length > 1) {
			autoplayInterval = setInterval(() => {
				if (eventEmblaApi) eventEmblaApi.scrollNext();
			}, 5000);
		}
	}

	async function checkAndShowBanner() {
		const todayDate = getLocalTodayString();
		const hideDate = localStorage.getItem('hideBanner_date');
		if (hideDate === todayDate) return;
		try {
			const q = query(collection(db, 'banners'), orderBy('createdAt', 'desc'));
			const snapshot = await getDocs(q);
			const banners = snapshot.docs.map(doc => doc.data());
			const validBanner = banners.find(b => b.startDate <= todayDate && b.endDate >= todayDate);
			if (validBanner) {
				activeBanner = validBanner;
				showBannerModal = true;
			}
		} catch (error) { console.error(error); }
	}

	function closeBanner() {
		if (dontShowChecked) {
			const todayDate = getLocalTodayString();
			localStorage.setItem('hideBanner_date', todayDate);
		}
		showBannerModal = false;
	}

	function getRemainingTime(targetDateStr) {
		const diff = new Date(targetDateStr) - new Date();
		if (diff <= 0) return '마감됨';
		const days = Math.floor(diff / (1000 * 60 * 60 * 24));
		const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
		return days === 0 ? `${hours}시간 남음` : `${days}일 ${hours}시간 남음`;
	}

	function openProfileModal(user) {
		selectedUser = user;
	}

	onMount(async () => {
		await fetchMeetings();
		fetchActiveEvents();
		fetchRandomUsers();
		checkAndShowBanner();
	});

	onDestroy(() => {
		if (autoplayInterval) clearInterval(autoplayInterval);
	});
</script>

<div class="page-container">
	{#if activeEvents.length > 0}
		<div class="event-section">
			<div class="embla event-slider" 
				use:emblaCarouselSvelte={{ options: eventEmblaOptions, plugins: [] }}
				on:emblaInit={onEventInit}
			>
				<div class="embla__container">
					{#each activeEvents as event}
						<div class="embla__slide event-slide">
							<a href="/events/{event.id}" class="event-card">
								<img src={event.image} alt={event.title} />
								<div class="event-overlay">
									<span class="event-badge">진행중</span>
									<h3 class="event-title">{event.title}</h3>
								</div>
							</a>
						</div>
					{/each}
				</div>
			</div>
		</div>
	{/if}

	<section class="section">
		<div class="section-header">
			<h2 class="section-title">새로 개설된 모임 👋</h2>
			<a href="/meetings" class="view-all-btn">
				전체보기 <ChevronRight size={16} />
			</a>
		</div>
		<p class="section-desc">관심 있는 주제의 대화에 참여해보세요.</p>

		{#if isLoading}
			<div class="loading-box">데이터를 불러오는 중...</div>
		{:else if meetings.length > 0}
			<div class="embla" use:emblaCarouselSvelte={{ options: emblaOptions }}>
				<div class="embla__container">
					{#each meetings as meeting}
						<div class="embla__slide">
							<a href="/meetings/{meeting.id}" class="card">
								<div class="card-image-wrapper">
									<img src={meeting.image} alt={meeting.title} class="card-image" />
									<div class="time-badge">{getRemainingTime(meeting.date)}</div>
								</div>
								<div class="card-content">
									<span class="badge">{meeting.category}</span>
									<h3 class="card-title">{meeting.title}</h3>
									<p class="card-host">by {meeting.hostName}</p> 
									<p class="card-location">📍 {meeting.location}</p>
								</div>
							</a>
						</div>
					{/each}
				</div>
			</div>
		{:else}
			<div class="empty-box">
				<p>참여 가능한 모임이 없습니다.</p>
				{#if !$user}
					<span style="font-size: 12px; color: #aaa;">(로그인하고 직접 모임을 만들어보세요!)</span>
				{:else}
					<span style="font-size: 12px; color: #aaa;">(직접 모임을 만들어보세요!)</span>
				{/if}
			</div>
		{/if}
	</section>

	<section class="section">
		<h2 class="section-title">새로운 멤버를 만나보세요 ✨</h2>
		<p class="section-desc">비슷한 관심사를 가진 멤버들이에요.</p>
		
		{#if randomUsers.length > 0}
			<div class="user-list-container">
				<div class="user-list">
					{#each randomUsers as user}
						<button class="user-card" on:click={() => openProfileModal(user)}>
							<div class="user-avatar">
								{#if user.image}
									<img src={user.image} alt={user.nickname} />
								{:else}
									<span>{user.nickname?.[0] || 'U'}</span>
								{/if}
							</div>
							<div class="user-info">
								<span class="user-name">{user.nickname}</span>
								{#if user.job}
									<span class="user-job">{user.job}</span>
								{:else}
									<span class="user-job text-muted">소개 없음</span>
								{/if}
							</div>
						</button>
					{/each}
				</div>
			</div>
		{:else}
			<div class="empty-box">
				추천할 회원이 아직 없습니다.
			</div>
		{/if}
	</section>
</div>

{#if showBannerModal && activeBanner}
	<div class="banner-overlay">
		<div class="banner-modal">
			<div class="banner-body">
				<a href={activeBanner.link || '#'} target="_blank" rel="noopener noreferrer" class="banner-link">
					<img src={activeBanner.image} alt="Event Banner" />
				</a>
			</div>
			<div class="banner-footer">
				<label class="checkbox-label">
					<input type="checkbox" bind:checked={dontShowChecked} />
					<span>오늘 하루 보지 않기</span>
				</label>
				<button class="close-btn" on:click={closeBanner}>닫기 <X size={16} /></button>
			</div>
		</div>
	</div>
{/if}

{#if selectedUser}
	<UserProfileModal 
		user={selectedUser} 
		on:close={() => selectedUser = null} 
	/>
{/if}

<style>
	.page-container { padding: 20px 0; }
	.section { margin-bottom: 32px; }
	
	/* 섹션 헤더 스타일 */
	.section-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding-right: 16px;
		margin-bottom: 4px;
	}
	.section-title { 
		font-size: 20px; 
		font-weight: bold; 
		margin: 0 0 0 16px; 
	}
	.view-all-btn {
		font-size: 13px;
		color: #718096;
		text-decoration: none;
		display: flex;
		align-items: center;
		gap: 2px;
		font-weight: 500;
		transition: color 0.2s;
	}
	.view-all-btn:hover {
		color: #2d3748;
	}

	.section-desc { font-size: 14px; color: #666; margin: 0 0 16px 16px; }
	
	.loading-box, .empty-box { text-align: center; padding: 40px; color: #999; font-size: 14px; }

	/* 이벤트 슬라이더 */
	.event-section { margin-bottom: 32px; }
	.event-slider { overflow: hidden; }
	.event-slide { flex: 0 0 100%; padding: 0 16px; box-sizing: border-box; }
	.event-card {
		display: block; position: relative; width: 100%; height: 200px;
		border-radius: 16px; overflow: hidden; text-decoration: none;
		box-shadow: 0 4px 12px rgba(0,0,0,0.1);
	}
	.event-card img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.3s; }
	.event-card:active img { transform: scale(1.02); }
	.event-overlay {
		position: absolute; bottom: 0; left: 0; right: 0;
		background: linear-gradient(to top, rgba(0,0,0,0.8), transparent);
		padding: 20px; color: white;
	}
	.event-badge { background: #e53e3e; font-size: 11px; padding: 2px 6px; border-radius: 4px; font-weight: bold; margin-bottom: 4px; display: inline-block; }
	.event-title { margin: 0; font-size: 18px; font-weight: bold; text-shadow: 0 1px 2px rgba(0,0,0,0.5); }

	/* 모임 카드 */
	.embla { overflow: hidden; }
	.embla__container { display: flex; gap: 16px; padding: 0 16px; }
	.embla__slide { flex: 0 0 80%; min-width: 0; }
	
	.card { 
		border-radius: 16px; overflow: hidden; background-color: white;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08); height: 260px; display: flex; flex-direction: column;
		text-decoration: none; color: inherit;
		transition: transform 0.2s;
	}
	.card:active { transform: scale(0.98); }

	.card-image-wrapper { position: relative; width: 100%; height: 140px; }
	.card-image { width: 100%; height: 100%; object-fit: cover; }
	.time-badge { position: absolute; top: 10px; right: 10px; background-color: rgba(0, 0, 0, 0.6); color: white; font-size: 11px; font-weight: bold; padding: 4px 8px; border-radius: 12px; backdrop-filter: blur(4px); z-index: 10; }
	.card-content { padding: 16px; flex: 1; display: flex; flex-direction: column; justify-content: center; }
	.badge { display: inline-block; font-size: 12px; color: #555; background-color: #f0f0f0; padding: 4px 8px; border-radius: 4px; align-self: flex-start; margin-bottom: 6px; }
	.card-title { font-size: 18px; font-weight: bold; margin: 0 0 4px 0; }
	/* [추가] 호스트 이름 스타일 */
	.card-host { font-size: 12px; color: #718096; margin: 0 0 4px 0; }
	.card-location { font-size: 12px; color: #888; margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

	/* 랜덤 회원 리스트 */
	.user-list-container {
		overflow-x: auto;
		padding: 0 16px;
		-ms-overflow-style: none; 
		scrollbar-width: none;
	}
	.user-list-container::-webkit-scrollbar { display: none; }

	.user-list {
		display: flex;
		gap: 16px;
		padding-bottom: 10px;
	}

	.user-card {
		flex: 0 0 100px;
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		gap: 8px;
		background: none; border: none; padding: 0; cursor: pointer;
	}
	.user-card:active { opacity: 0.7; transform: scale(0.98); transition: transform 0.1s; }

	.user-avatar {
		width: 64px;
		height: 64px;
		border-radius: 50%;
		background-color: #edf2f7;
		overflow: hidden;
		display: flex;
		align-items: center;
		justify-content: center;
		border: 2px solid #fff;
		box-shadow: 0 2px 6px rgba(0,0,0,0.1);
	}

	.user-avatar img { width: 100%; height: 100%; object-fit: cover; }
	.user-avatar span { font-size: 20px; font-weight: bold; color: #718096; }

	.user-info { display: flex; flex-direction: column; gap: 2px; width: 100%; }
	.user-name { font-size: 13px; font-weight: 600; color: #2d3748; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; width: 100%; }
	.user-job { font-size: 11px; color: #718096; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; width: 100%; }
	.text-muted { color: #cbd5e0; }

	/* 배너 모달 */
	.banner-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0, 0, 0, 0.6); z-index: 2000; display: flex; align-items: center; justify-content: center; padding: 20px; }
	.banner-modal { width: 100%; max-width: 360px; background-color: white; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3); display: flex; flex-direction: column; }
	.banner-body { width: 100%; background-color: #fff; }
	.banner-link { display: block; font-size: 0; }
	.banner-body img { width: 100%; height: auto; object-fit: contain; display: block; }
	.banner-footer { height: 50px; background-color: #1a1a1a; color: white; display: flex; justify-content: space-between; align-items: center; padding: 0 16px; font-size: 13px; }
	.checkbox-label { display: flex; align-items: center; gap: 8px; cursor: pointer; color: #ccc; }
	.checkbox-label input { accent-color: #fff; cursor: pointer; }
	.close-btn { background: none; border: none; color: white; font-weight: bold; cursor: pointer; display: flex; align-items: center; gap: 4px; font-size: 14px; }
</style>