<script>
	import { onMount } from 'svelte';
	import emblaCarouselSvelte from 'embla-carousel-svelte';
	import { db } from '$lib/firebase';
	import { collection, getDocs, query, orderBy, where } from 'firebase/firestore'; // where 추가

	const NAVER_CLIENT_ID = import.meta.env.VITE_NAVER_MAPS_CLIENT_ID;
	let emblaOptions = { loop: false, align: 'start', containScroll: 'trimSnaps' };

	// 모임 데이터 상태
	let meetings = [];
	let isLoading = true;

	// 남은 시간 계산 함수
	function getRemainingTime(targetDateStr) {
		const target = new Date(targetDateStr);
		const current = new Date();
		const diff = target - current;

		if (diff <= 0) return '마감됨';
		const days = Math.floor(diff / (1000 * 60 * 60 * 24));
		const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
		if (days === 0) return `${hours}시간 남음`;
		return `${days}일 ${hours}시간 남음`;
	}

	// Firestore에서 데이터 불러오기 (쿼리 수정됨)
	async function fetchMeetings() {
		try {
			// 현재 시간을 ISO 문자열로 가져옴 (DB 저장 형식과 일치시킴)
			const now = new Date().toISOString();

			// 조건 1: 날짜가 현재 시간보다 크거나 같은 것 (미래의 모임)
			// 조건 2: 날짜 기준 오름차순 정렬 (가까운 날짜부터)
			const q = query(
				collection(db, 'meetings'), 
				where('date', '>=', now), 
				orderBy('date', 'asc')
			);
			
			const querySnapshot = await getDocs(q);
			
			meetings = querySnapshot.docs.map(doc => ({
				id: doc.id,
				...doc.data()
			}));
		} catch (error) {
			console.error("데이터 불러오기 실패:", error);
		} finally {
			isLoading = false;
		}
	}

	// 지도 관련 로직
	let mapElement;
	let map;

	function addMarkerFromAddress(meeting) {
		if (!window.naver || !map) return;
		
		window.naver.maps.Service.geocode(
			{ query: meeting.location },
			function (status, response) {
				if (status !== window.naver.maps.Service.Status.OK) return;

				const result = response.v2;
				const items = result.addresses;

				if (items.length > 0) {
					const x = parseFloat(items[0].x);
					const y = parseFloat(items[0].y);
					const position = new window.naver.maps.LatLng(y, x);

					new window.naver.maps.Marker({
						position: position,
						map: map,
						title: meeting.title
					});
				}
			}
		);
	}

	function createMap(centerLat, centerLng, isMyLocation) {
		if (!mapElement || !window.naver) return;

		const center = new window.naver.maps.LatLng(centerLat, centerLng);
		const mapOptions = {
			center: center,
			zoom: 14,
			minZoom: 6,
			scaleControl: false,
			logoControl: false,
			mapDataControl: false,
			zoomControl: true,
			zoomControlOptions: { position: window.naver.maps.Position.TOP_RIGHT }
		};

		map = new window.naver.maps.Map(mapElement, mapOptions);

		if (isMyLocation) {
			new window.naver.maps.Marker({
				position: center,
				map: map,
				title: '내 위치',
				zIndex: 100,
				icon: {
					content: `
						<div style="
							width: 20px; height: 20px; background: #4285F4; 
							border: 3px solid white; border-radius: 50%; 
							box-shadow: 0 2px 6px rgba(0,0,0,0.3);
						"></div>
					`,
					anchor: new window.naver.maps.Point(10, 10)
				}
			});
		}

		// 데이터가 로드된 상태에서 마커 찍기
		meetings.forEach(meeting => addMarkerFromAddress(meeting));
	}

	function startMapInitialization() {
		const defaultLat = 37.5665;
		const defaultLng = 126.9780;

		if (navigator.geolocation) {
			navigator.geolocation.getCurrentPosition(
				(position) => {
					createMap(position.coords.latitude, position.coords.longitude, true);
				},
				(error) => {
					console.warn(error);
					createMap(defaultLat, defaultLng, false);
				},
				{ enableHighAccuracy: true, timeout: 5000 }
			);
		} else {
			createMap(defaultLat, defaultLng, false);
		}
	}

	onMount(async () => {
		// 1. 데이터 먼저 불러오기
		await fetchMeetings();

		// 2. 데이터 로드 후 지도 초기화 (네이버 스크립트 로딩 대기)
		const interval = setInterval(() => {
			if (window.naver && window.naver.maps && window.naver.maps.Service) {
				clearInterval(interval);
				startMapInitialization();
			}
		}, 100);

		return () => clearInterval(interval);
	});
</script>

<svelte:head>
	<script 
		type="text/javascript" 
		src="https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId={NAVER_CLIENT_ID}&submodules=geocoder">
	</script>
</svelte:head>

<div class="page-container">
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
									<div class="time-badge">
										{getRemainingTime(meeting.date)}
									</div>
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

<style>
	.page-container { padding: 20px 0; }
	.section { margin-bottom: 32px; }
	.section-title { font-size: 20px; font-weight: bold; margin: 0 0 8px 16px; }
	.section-desc { font-size: 14px; color: #666; margin: 0 0 16px 16px; }
	
	.loading-box, .empty-box {
		text-align: center;
		padding: 40px;
		color: #999;
		font-size: 14px;
	}

	/* 슬라이더 스타일 */
	.embla { overflow: hidden; }
	.embla__container { display: flex; gap: 16px; padding: 0 16px; }
	.embla__slide { flex: 0 0 80%; min-width: 0; }

	/* 카드 스타일 */
	.card {
		border-radius: 16px;
		overflow: hidden;
		background-color: white;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
		height: 260px;
		display: flex;
		flex-direction: column;
	}
	.card-image-wrapper { position: relative; width: 100%; height: 140px; }
	.card-image { width: 100%; height: 100%; object-fit: cover; }
	.time-badge {
		position: absolute; top: 10px; right: 10px;
		background-color: rgba(0, 0, 0, 0.6); color: white;
		font-size: 11px; font-weight: bold; padding: 4px 8px;
		border-radius: 12px; backdrop-filter: blur(4px); z-index: 10;
	}
	.card-content { padding: 16px; flex: 1; display: flex; flex-direction: column; justify-content: center; }
	.badge {
		display: inline-block; font-size: 12px; color: #555;
		background-color: #f0f0f0; padding: 4px 8px;
		border-radius: 4px; align-self: flex-start; margin-bottom: 6px;
	}
	.card-title { font-size: 18px; font-weight: bold; margin: 0 0 4px 0; }
	.card-location {
		font-size: 12px; color: #888; margin: 0;
		white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
	}

	/* 지도 스타일 */
	.map-wrapper { padding: 0 16px; }
	.map-container {
		width: 100%; height: 300px; border-radius: 12px;
		overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
		background-color: #f0f0f0; touch-action: none;
	}
</style>