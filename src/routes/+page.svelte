<script>
	import { onMount, onDestroy } from 'svelte'; // onDestroy 추가
	import emblaCarouselSvelte from 'embla-carousel-svelte';
	import { db } from '$lib/firebase';
	import { collection, getDocs, query, orderBy, where, limit } from 'firebase/firestore';
	import { appSettings } from '$lib/stores';
	import { X } from 'lucide-svelte';

	const NAVER_CLIENT_ID = import.meta.env.VITE_NAVER_MAPS_CLIENT_ID;
	
	// 모임 슬라이더 옵션
	let emblaOptions = { loop: false, align: 'start', containScroll: 'trimSnaps' };
	
	// [추가] 이벤트 슬라이더 관련 변수
	let eventEmblaApi;
	let eventEmblaOptions = { loop: true, align: 'center' };
	let activeEvents = [];
	let autoplayInterval;

	// 데이터 상태
	let meetings = [];
	let isLoading = true;

	// 배너 모달 상태
	let showBannerModal = false;
	let activeBanner = null;
	let dontShowChecked = false;

	function getLocalTodayString() {
		const now = new Date();
		const year = now.getFullYear();
		const month = String(now.getMonth() + 1).padStart(2, '0');
		const day = String(now.getDate()).padStart(2, '0');
		return `${year}-${month}-${day}`;
	}

	$: if ($appSettings.sliderLimit) {
		fetchMeetings();
	}

	async function fetchMeetings() {
		try {
			const now = new Date().toISOString();
			const q = query(
				collection(db, 'meetings'), 
				where('date', '>=', now), 
				orderBy('date', 'asc'),
				limit($appSettings.sliderLimit)
			);
			const querySnapshot = await getDocs(q);
			meetings = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
		} catch (error) { console.error(error); } 
		finally { isLoading = false; }
	}

	// [추가] 활성 이벤트 불러오기
	async function fetchActiveEvents() {
		try {
			const today = getLocalTodayString();
			// Firestore 쿼리 단순화: 전체 최신순 로드 후 필터링
			const q = query(collection(db, 'events'), orderBy('createdAt', 'desc'));
			const snapshot = await getDocs(q);
			const allEvents = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
			
			// 날짜 필터링 (시작일 <= 오늘 <= 종료일)
			activeEvents = allEvents.filter(e => e.startDate <= today && e.endDate >= today);
		} catch (error) { console.error("이벤트 로딩 실패", error); }
	}

	// [추가] 슬라이더 초기화 시 API 바인딩 및 오토플레이 시작
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

	// --- 지도 로직 (생략 없이 유지) ---
	let mapElement;
	let map;
	function addMarkerFromAddress(meeting) {
		if (!window.naver || !map) return;
		window.naver.maps.Service.geocode({ query: meeting.location }, (status, response) => {
			if (status !== window.naver.maps.Service.Status.OK) return;
			const item = response.v2.addresses[0];
			const pos = new window.naver.maps.LatLng(item.y, item.x);
			new window.naver.maps.Marker({ position: pos, map, title: meeting.title });
		});
	}
	function createMap(centerLat, centerLng, isMyLocation) {
		if (!mapElement || !window.naver) return;
		const center = new window.naver.maps.LatLng(centerLat, centerLng);
		map = new window.naver.maps.Map(mapElement, {
			center, zoom: 14, minZoom: 6, scaleControl: false, logoControl: false, mapDataControl: false,
			zoomControl: true, zoomControlOptions: { position: window.naver.maps.Position.TOP_RIGHT }
		});
		if (isMyLocation) {
			new window.naver.maps.Marker({
				position: center, map, title: '내 위치', zIndex: 100,
				icon: { content: `<div style="width:20px;height:20px;background:#4285F4;border:3px solid white;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.3);"></div>` }
			});
		}
		meetings.forEach(m => addMarkerFromAddress(m));
	}
	function startMapInitialization() {
		const defLat = 37.5665, defLng = 126.9780;
		if (navigator.geolocation) {
			navigator.geolocation.getCurrentPosition(
				p => createMap(p.coords.latitude, p.coords.longitude, true),
				() => createMap(defLat, defLng, false),
				{ enableHighAccuracy: true, timeout: 5000 }
			);
		} else createMap(defLat, defLng, false);
	}

	function getRemainingTime(targetDateStr) {
		const diff = new Date(targetDateStr) - new Date();
		if (diff <= 0) return '마감됨';
		const days = Math.floor(diff / (1000 * 60 * 60 * 24));
		const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
		return days === 0 ? `${hours}시간 남음` : `${days}일 ${hours}시간 남음`;
	}

	onMount(async () => {
		await fetchMeetings();
		fetchActiveEvents(); // [추가] 이벤트 로드
		checkAndShowBanner();

		const interval = setInterval(() => {
			if (window.naver && window.naver.maps?.Service) {
				clearInterval(interval);
				startMapInitialization();
			}
		}, 100);
		return () => clearInterval(interval);
	});

	onDestroy(() => {
		if (autoplayInterval) clearInterval(autoplayInterval);
	});
</script>

<svelte:head>
	<script type="text/javascript" src="https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId={NAVER_CLIENT_ID}&submodules=geocoder"></script>
</svelte:head>

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
		<h2 class="section-title">새로 개설된 모임 👋</h2>
		<p class="section-desc">관심 있는 주제의 대화에 참여해보세요.</p>

		{#if isLoading}
			<div class="loading-box">데이터를 불러오는 중...</div>
		{:else if meetings.length > 0}
			<div class="embla" use:emblaCarouselSvelte={{ options: emblaOptions }}>
				<div class="embla__container">
					{#each meetings as meeting}
						<div class="embla__slide">
							<div class="card">
								<div class="card-image-wrapper">
									<img src={meeting.image} alt={meeting.title} class="card-image" />
									<div class="time-badge">{getRemainingTime(meeting.date)}</div>
								</div>
								<div class="card-content">
									<span class="badge">{meeting.category}</span>
									<h3 class="card-title">{meeting.title}</h3>
									<p class="card-location">📍 {meeting.location}</p>
								</div>
							</div>
						</div>
					{/each}
				</div>
			</div>
		{:else}
			<div class="empty-box">
				<p>예정된 모임이 없습니다.</p>
				<span style="font-size: 12px; color: #aaa;">(관리자 페이지에서 데이터를 추가해보세요)</span>
			</div>
		{/if}
	</section>

	<section class="section">
		<h2 class="section-title">내 주변 대화장</h2>
		<div class="map-wrapper">
			<div bind:this={mapElement} id="map" class="map-container"></div>
		</div>
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

<style>
	.page-container { padding: 20px 0; }
	.section { margin-bottom: 32px; }
	.section-title { font-size: 20px; font-weight: bold; margin: 0 0 8px 16px; }
	.section-desc { font-size: 14px; color: #666; margin: 0 0 16px 16px; }
	.loading-box, .empty-box { text-align: center; padding: 40px; color: #999; font-size: 14px; }

	/* [추가] 이벤트 슬라이더 스타일 */
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

	/* 모임 슬라이더 & 카드 (기존) */
	.embla { overflow: hidden; }
	.embla__container { display: flex; gap: 16px; padding: 0 16px; }
	.embla__slide { flex: 0 0 80%; min-width: 0; }
	.card { border-radius: 16px; overflow: hidden; background-color: white; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08); height: 260px; display: flex; flex-direction: column; }
	.card-image-wrapper { position: relative; width: 100%; height: 140px; }
	.card-image { width: 100%; height: 100%; object-fit: cover; }
	.time-badge { position: absolute; top: 10px; right: 10px; background-color: rgba(0, 0, 0, 0.6); color: white; font-size: 11px; font-weight: bold; padding: 4px 8px; border-radius: 12px; backdrop-filter: blur(4px); z-index: 10; }
	.card-content { padding: 16px; flex: 1; display: flex; flex-direction: column; justify-content: center; }
	.badge { display: inline-block; font-size: 12px; color: #555; background-color: #f0f0f0; padding: 4px 8px; border-radius: 4px; align-self: flex-start; margin-bottom: 6px; }
	.card-title { font-size: 18px; font-weight: bold; margin: 0 0 4px 0; }
	.card-location { font-size: 12px; color: #888; margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

	/* 지도 */
	.map-wrapper { padding: 0 16px; }
	.map-container { width: 100%; height: 300px; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08); background-color: #f0f0f0; touch-action: none; }

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