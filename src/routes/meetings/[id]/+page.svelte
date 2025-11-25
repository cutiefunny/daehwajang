<script>
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { user, modal } from '$lib/stores';
	import { db } from '$lib/firebase';
	import { doc, getDoc, addDoc, collection, query, where, getDocs, serverTimestamp } from 'firebase/firestore';
	import { ArrowLeft, Calendar, MapPin, User, CheckCircle, AlertCircle } from 'lucide-svelte';

	const NAVER_CLIENT_ID = import.meta.env.VITE_NAVER_MAPS_CLIENT_ID;
	const meetingId = $page.params.id;

	let meeting = null;
	let isLoading = true;
	let isApplying = false;
	let applicationStatus = null; // null (미신청), 'pending' (대기), 'accepted' (확정)

	let mapElement;

	onMount(async () => {
		await fetchMeeting();
		if ($user) {
			await checkApplicationStatus();
		}
	});

	// 1. 모임 상세 정보 가져오기
	async function fetchMeeting() {
		try {
			const docRef = doc(db, 'meetings', meetingId);
			const docSnap = await getDoc(docRef);

			if (docSnap.exists()) {
				meeting = { id: docSnap.id, ...docSnap.data() };
				// 데이터 로드 후 지도 초기화 (약간의 지연 필요)
				setTimeout(() => initMap(meeting.location), 100);
			} else {
				await modal.alert('존재하지 않는 모임입니다.');
				history.back();
			}
		} catch (error) {
			console.error('모임 로딩 실패:', error);
		} finally {
			isLoading = false;
		}
	}

	// 2. 내 신청 상태 확인
	async function checkApplicationStatus() {
		try {
			const q = query(
				collection(db, 'meeting_applications'),
				where('meetingId', '==', meetingId),
				where('userId', '==', $user.uid)
			);
			const snapshot = await getDocs(q);
			if (!snapshot.empty) {
				applicationStatus = snapshot.docs[0].data().status || 'pending';
			}
		} catch (error) {
			console.error('신청 상태 확인 실패:', error);
		}
	}

	// 3. 모임 신청하기
	async function applyForMeeting() {
		if (!$user) return await modal.alert('로그인이 필요한 서비스입니다.');
		if (isApplying) return;

		if (!confirm('이 모임에 참여 신청하시겠습니까?')) return;

		isApplying = true;
		try {
			await addDoc(collection(db, 'meeting_applications'), {
				meetingId: meetingId,
				meetingTitle: meeting.title, // 나중에 목록 표시용
				meetingDate: meeting.date,   // 정렬용
				userId: $user.uid,
				userName: $user.displayName || '익명',
				userEmail: $user.email,
				userImage: $user.photoURL,
				status: 'pending', // 초기 상태는 승인 대기
				appliedAt: serverTimestamp()
			});

			applicationStatus = 'pending';
			await modal.alert('신청이 완료되었습니다! 호스트의 승인을 기다려주세요.');
		} catch (error) {
			console.error('신청 실패:', error);
			await modal.alert('신청 중 오류가 발생했습니다.');
		} finally {
			isApplying = false;
		}
	}

	// 네이버 지도 초기화
	function initMap(address) {
		if (!window.naver || !mapElement) return;

		window.naver.maps.Service.geocode({ query: address }, async (status, response) => {
            if (status !== window.naver.maps.Service.Status.OK) {
                return await modal.alert('주소 검색 중 오류가 발생했습니다.');
            }

            // [수정] 검색 결과가 있는지 확인하는 로직 추가
            const result = response.v2.addresses[0];
            
            if (!result) {
                // 검색 결과가 없을 경우 처리 (예: 알림 표시 또는 기본 좌표 사용)
                console.warn('해당 주소의 좌표를 찾을 수 없습니다:', address);
                return; 
            }

            // 결과가 있을 때만 item 사용
            const item = result; 
            const point = new window.naver.maps.LatLng(item.y, item.x);

            // ... 지도 생성 및 마커 코드 ...
            const map = new window.naver.maps.Map(mapElement, {
                center: point,
                zoom: 15
                // ...
            });
            
            new window.naver.maps.Marker({
                position: point,
                map: map
            });
        });
	}

	function goBack() {
		history.back();
	}

	function formatDate(isoString) {
		if (!isoString) return '';
		const date = new Date(isoString);
		return date.toLocaleString('ko-KR', {
			year: 'numeric', month: 'long', day: 'numeric',
			weekday: 'short', hour: '2-digit', minute: '2-digit'
		});
	}
</script>

<svelte:head>
	<script type="text/javascript" src="https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId={NAVER_CLIENT_ID}&submodules=geocoder"></script>
</svelte:head>

<div class="page-container">
	{#if isLoading}
		<div class="loading-screen">로딩 중...</div>
	{:else if meeting}
		<div class="hero-header">
			<button class="back-btn" on:click={goBack}>
				<ArrowLeft size={24} color="white" />
			</button>
			<img src={meeting.image} alt={meeting.title} class="hero-image" />
			<div class="hero-overlay"></div>
		</div>

		<div class="content-body">
			<div class="section info-header">
				<span class="category-badge">{meeting.category}</span>
				<h1 class="title">{meeting.title}</h1>
				<div class="host-info">
					<div class="host-avatar">
						<User size={16} />
					</div>
					<span class="host-name">호스트: {meeting.hostName}</span>
				</div>
			</div>

			<div class="divider"></div>

			<div class="section details">
				<div class="detail-row">
					<div class="icon-box"><Calendar size={20} /></div>
					<div class="detail-text">
						<span class="label">일시</span>
						<span class="value">{formatDate(meeting.date)}</span>
					</div>
				</div>
				<div class="detail-row">
					<div class="icon-box"><MapPin size={20} /></div>
					<div class="detail-text">
						<span class="label">장소</span>
						<span class="value">{meeting.location}</span>
					</div>
				</div>
				<div class="map-wrapper">
					<div bind:this={mapElement} id="map" class="map-view"></div>
				</div>
			</div>

			<div class="divider"></div>

			<div class="section description">
				<h3>모임 소개</h3>
				<p>{meeting.description || '상세 설명이 없습니다.'}</p>
			</div>
		</div>

		<div class="bottom-bar">
			{#if applicationStatus === 'pending'}
				<button class="action-btn disabled" disabled>
					<AlertCircle size={18} /> 승인 대기중
				</button>
			{:else if applicationStatus === 'accepted'}
				<button class="action-btn disabled success" disabled>
					<CheckCircle size={18} /> 참여 확정됨
				</button>
			{:else}
				<button class="action-btn primary" on:click={applyForMeeting} disabled={isApplying}>
					{isApplying ? '처리 중...' : '참여 신청하기'}
				</button>
			{/if}
		</div>
	{/if}
</div>

<style>
	.page-container {
		background-color: #fff;
		min-height: 100vh;
		padding-bottom: 80px; /* 하단 바 공간 확보 */
	}

	/* 히어로 이미지 헤더 */
	.hero-header {
		position: relative;
		height: 240px;
		width: 100%;
		background-color: #eee;
	}
	.hero-image {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
	.hero-overlay {
		position: absolute;
		top: 0; left: 0; right: 0; bottom: 0;
		background: linear-gradient(to bottom, rgba(0,0,0,0.3), transparent 40%);
	}
	.back-btn {
		position: absolute;
		top: 16px;
		left: 16px;
		background: rgba(0, 0, 0, 0.2);
		border: none;
		border-radius: 50%;
		width: 40px;
		height: 40px;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		z-index: 10;
		backdrop-filter: blur(4px);
	}

	.content-body {
		border-top-left-radius: 24px;
		border-top-right-radius: 24px;
		background-color: white;
		margin-top: -24px; /* 이미지 위로 살짝 올리기 */
		position: relative;
		z-index: 5;
		padding-top: 24px;
	}

	.section {
		padding: 0 20px 20px 20px;
	}

	/* 타이틀 섹션 */
	.category-badge {
		display: inline-block;
		font-size: 12px;
		color: #666;
		background-color: #f0f0f0;
		padding: 4px 8px;
		border-radius: 4px;
		margin-bottom: 8px;
	}
	.title {
		font-size: 22px;
		font-weight: 800;
		margin: 0 0 12px 0;
		color: #1a1a1a;
		line-height: 1.3;
	}
	.host-info {
		display: flex;
		align-items: center;
		gap: 8px;
		color: #666;
		font-size: 13px;
	}
	.host-avatar {
		width: 24px;
		height: 24px;
		border-radius: 50%;
		background-color: #eee;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.divider {
		height: 8px;
		background-color: #f5f7fa;
		margin-bottom: 24px;
	}

	/* 상세 정보 섹션 */
	.detail-row {
		display: flex;
		gap: 16px;
		margin-bottom: 20px;
	}
	.icon-box {
		width: 40px;
		height: 40px;
		border-radius: 12px;
		background-color: #f0f4ff;
		color: #3182ce;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}
	.detail-text {
		display: flex;
		flex-direction: column;
		justify-content: center;
	}
	.detail-text .label {
		font-size: 12px;
		color: #888;
		margin-bottom: 2px;
	}
	.detail-text .value {
		font-size: 15px;
		color: #333;
		font-weight: 500;
	}

	.map-wrapper {
		margin-top: 16px;
		border-radius: 12px;
		overflow: hidden;
		border: 1px solid #eee;
	}
	.map-view {
		width: 100%;
		height: 200px;
		background-color: #f0f0f0;
	}

	/* 설명 섹션 */
	.description h3 {
		font-size: 18px;
		font-weight: bold;
		margin: 0 0 12px 0;
	}
	.description p {
		font-size: 15px;
		line-height: 1.6;
		color: #4a4a4a;
		white-space: pre-wrap;
	}

	/* 하단 고정 바 */
	.bottom-bar {
		position: fixed;
		bottom: 0;
		left: 0;
		right: 0;
		max-width: 600px; /* 앱 레이아웃 width에 맞춤 */
		margin: 0 auto;
		background-color: white;
		padding: 16px 20px;
		border-top: 1px solid #f0f0f0;
		z-index: 50;
	}
	.action-btn {
		width: 100%;
		padding: 16px;
		border-radius: 12px;
		font-size: 16px;
		font-weight: bold;
		border: none;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		transition: background-color 0.2s;
	}
	.action-btn.primary {
		background-color: #3182ce;
		color: white;
	}
	.action-btn.primary:hover {
		background-color: #2b6cb0;
	}
	.action-btn.disabled {
		background-color: #edf2f7;
		color: #718096;
		cursor: not-allowed;
	}
	.action-btn.success {
		background-color: #e6fffa;
		color: #2c7a7b;
		border: 1px solid #b2f5ea;
	}

	.loading-screen {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 100vh;
		color: #999;
	}
</style>