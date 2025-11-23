<script>
	import { onMount, onDestroy } from 'svelte';
	import emblaCarouselSvelte from 'embla-carousel-svelte';

	// 환경변수에서 네이버 클라이언트 ID 가져오기
	const NAVER_CLIENT_ID = import.meta.env.VITE_NAVER_MAPS_CLIENT_ID;

	// 슬라이더 옵션
	let emblaOptions = { loop: false, align: 'start', containScroll: 'trimSnaps' };

	// 현재 시간
	const now = new Date();

	// 임시 데이터
	let meetings = [
		{
			id: 1,
			title: '주말 독서의 장',
			category: '취미',
			date: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000 + 5 * 60 * 60 * 1000).toISOString(),
			image: '/images/book.png'
		},
		{
			id: 2,
			title: '신천 러닝 크루',
			category: '운동',
			date: new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString(),
			image: '/images/run.png'
		},
		{
			id: 3,
			title: '카페 투어',
			category: '맛집',
			date: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
			image: '/images/cafe.png'
		},
		{
			id: 4,
			title: '개발자 네트워킹',
			category: '자기계발',
			date: new Date(now.getTime() + 12 * 60 * 60 * 1000).toISOString(),
			image: 'https://placehold.co/600x400/black/white?text=Dev'
		}
	];

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

	// 지도 엘리먼트 참조
	let mapElement;
	let map;

	// 지도 렌더링 헬퍼 함수
	function renderMap(lat, lng) {
		if (!mapElement || !window.naver) return;

		const center = new window.naver.maps.LatLng(lat, lng);
		const mapOptions = {
			center: center,
			zoom: 15, // 줌 레벨 설정
			scaleControl: false,
			logoControl: false,
			mapDataControl: false,
			zoomControl: true,
			minZoom: 6
		};

		map = new window.naver.maps.Map(mapElement, mapOptions);

		// 현재 위치 마커 표시
		new window.naver.maps.Marker({
			position: center,
			map: map
		});
	}

	// 지도 초기화 및 위치 권한 확인 함수
	function initMap() {
		// 이미 지도가 생성되었다면 중복 생성 방지
		if (map) return;

		// 기본 위치 (서울 시청)
		const defaultLat = 37.5665;
		const defaultLng = 126.9780;

		if (navigator.geolocation) {
			navigator.geolocation.getCurrentPosition(
				(position) => {
					// 위치 허용 시: 사용자 현재 위치로 지도 생성
					renderMap(position.coords.latitude, position.coords.longitude);
				},
				(error) => {
					// 위치 차단/에러 시: 기본 위치로 생성
					console.warn('Geolocation failed or denied:', error);
					renderMap(defaultLat, defaultLng);
				},
				{
					enableHighAccuracy: true, // 높은 정확도 사용
					timeout: 5000,            // 5초 대기
					maximumAge: 0
				}
			);
		} else {
			// Geolocation 미지원 브라우저
			renderMap(defaultLat, defaultLng);
		}
	}

	onMount(() => {
		// 스크립트 로드 확인을 위한 폴링 (callback 파라미터를 사용하지 않으므로)
		const interval = setInterval(() => {
			if (window.naver && window.naver.maps) {
				clearInterval(interval);
				initMap();
			}
		}, 100);

		return () => clearInterval(interval);
	});
</script>

<svelte:head>
	<script 
		type="text/javascript" 
		src="https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId={NAVER_CLIENT_ID}">
	</script>
</svelte:head>

<div class="page-container">
	<section class="section">
		<h2 class="section-title">새로 개설된 모임 👋</h2>
		<p class="section-desc">관심 있는 주제의 대화에 참여해보세요.</p>

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
							</div>
						</div>
					</div>
				{/each}
			</div>
		</div>
	</section>

	<section class="section">
		<h2 class="section-title">내 주변 대화장</h2>
		<div class="map-wrapper">
			<div bind:this={mapElement} id="map" class="map-container"></div>
		</div>
	</section>
</div>

<style>
	.page-container {
		padding: 20px 0;
	}

	.section {
		margin-bottom: 32px;
	}

	.section-title {
		font-size: 20px;
		font-weight: bold;
		margin: 0 0 8px 16px;
	}

	.section-desc {
		font-size: 14px;
		color: #666;
		margin: 0 0 16px 16px;
	}

	/* 슬라이더 스타일 */
	.embla {
		overflow: hidden;
	}

	.embla__container {
		display: flex;
		gap: 16px;
		padding: 0 16px;
	}

	.embla__slide {
		flex: 0 0 80%;
		min-width: 0;
	}

	/* 카드 스타일 */
	.card {
		border-radius: 16px;
		overflow: hidden;
		background-color: white;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
		height: 240px;
		display: flex;
		flex-direction: column;
	}

	.card-image-wrapper {
		position: relative;
		width: 100%;
		height: 140px;
	}

	.card-image {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.time-badge {
		position: absolute;
		top: 10px;
		right: 10px;
		background-color: rgba(0, 0, 0, 0.6);
		color: white;
		font-size: 11px;
		font-weight: bold;
		padding: 4px 8px;
		border-radius: 12px;
		backdrop-filter: blur(4px);
		z-index: 10;
	}

	.card-content {
		padding: 16px;
		flex: 1;
		display: flex;
		flex-direction: column;
		justify-content: center;
	}

	.badge {
		display: inline-block;
		font-size: 12px;
		color: #555;
		background-color: #f0f0f0;
		padding: 4px 8px;
		border-radius: 4px;
		align-self: flex-start;
		margin-bottom: 8px;
	}

	.card-title {
		font-size: 18px;
		font-weight: bold;
		margin: 0;
	}

	/* 지도 스타일 */
	.map-wrapper {
		padding: 0 16px;
	}

	.map-container {
		width: 100%;
		height: 300px;
		border-radius: 12px;
		overflow: hidden;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
		background-color: #f0f0f0;
		touch-action: none;
	}
</style>