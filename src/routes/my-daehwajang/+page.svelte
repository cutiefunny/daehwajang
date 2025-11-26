<script>
	import { onMount } from 'svelte';
	import { user } from '$lib/stores';
	import { db } from '$lib/firebase';
	import { collection, query, where, getDocs, doc, getDoc, orderBy } from 'firebase/firestore';
	import { Calendar, MapPin, Loader2, Plus, Star, Check, Crown } from 'lucide-svelte';
	import { goto } from '$app/navigation';
	import MeetingReviewModal from '$lib/components/MeetingReviewModal.svelte';
	import Skeleton from '$lib/components/Skeleton.svelte';

	// 탭 관련 상태 제거하고 단일 리스트로 변경
	let myMeetings = []; 
	let isLoading = true;
	let loadedUserId = null;

	// 리뷰 모달 상태
	let showReviewModal = false;
	let reviewTargetMeeting = null;

	$: if ($user) {
		if ($user.uid !== loadedUserId) {
			loadedUserId = $user.uid;
			fetchMyMeetings();
		}
	} else if (!$user && !isLoading) {
		myMeetings = [];
		loadedUserId = null;
		isLoading = false;
	}

	async function fetchMyMeetings() {
		isLoading = true;
		try {
			// 1. 내 신청 내역 가져오기
			const appsQ = query(
				collection(db, 'meeting_applications'),
				where('userId', '==', $user.uid),
				orderBy('appliedAt', 'desc')
			);

			// 2. 내가 호스트인 모임 가져오기
			const hostedQ = query(
				collection(db, 'meetings'),
				where('hostId', '==', $user.uid),
				orderBy('date', 'desc')
			);

			// 3. 내가 작성한 후기 목록 가져오기
			const reviewsQ = query(
				collection(db, 'meeting_reviews'),
				where('reviewerId', '==', $user.uid)
			);

			const [appsSnap, hostedSnap, reviewsSnap] = await Promise.all([
				getDocs(appsQ),
				getDocs(hostedQ),
				getDocs(reviewsQ)
			]);

			const reviewedMeetingIds = new Set(reviewsSnap.docs.map(d => d.data().meetingId));

			// A. 신청 내역 가공 (호스트 닉네임 최신화 포함)
			const applications = appsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
			const appPromises = applications.map(async (app) => {
				if (!app.meetingId) return null;
				try {
					const meetingRef = doc(db, 'meetings', app.meetingId);
					const meetingSnap = await getDoc(meetingRef);
					
					if (meetingSnap.exists()) {
						const meetingData = meetingSnap.data();
						
						// [수정] 호스트 정보 최신화
						if (meetingData.hostId) {
							try {
								const hostSnap = await getDoc(doc(db, 'users', meetingData.hostId));
								if (hostSnap.exists()) {
									meetingData.hostName = hostSnap.data().nickname || meetingData.hostName;
								}
							} catch (e) {}
						}

						return formatMeetingData(meetingSnap.id, meetingData, app.status, reviewedMeetingIds);
					}
					return null;
				} catch (e) {
					console.error(e);
					return null;
				}
			});

			// B. 호스트 모임 가공 (호스트는 나 자신 - 프로필 업데이트 안 해도 되지만 일관성 위해 할 수도 있음. 여기선 생략 가능)
			// 하지만 본인 닉네임 변경 시 반영되도록 $userProfile을 사용하는 게 좋으나, 여기선 DB에서 가져오는 걸로 통일
			const hostedMeetings = await Promise.all(hostedSnap.docs.map(async (docSnap) => {
				const data = docSnap.data();
				// 내 닉네임은 스토어에서 가져오거나 DB에서 가져옴
				// 여기서는 간단히 기존 데이터 사용 (본인이 본인 걸 볼 땐 덜 중요하거나, 이미 위에서 처리됨)
				return formatMeetingData(docSnap.id, data, 'accepted', reviewedMeetingIds, true);
			}));

			const appResults = await Promise.all(appPromises);
			const validAppResults = appResults.filter(r => r !== null);

			// 중복 제거 및 합치기
			const meetingMap = new Map();
			hostedMeetings.forEach(m => meetingMap.set(m.id, m));
			validAppResults.forEach(m => {
				if (!meetingMap.has(m.id)) meetingMap.set(m.id, m);
			});

			const allMyMeetings = Array.from(meetingMap.values());

			// 날짜순 정렬 (최신순)
			allMyMeetings.sort((a, b) => new Date(b.date) - new Date(a.date));

			// 거절된(rejected) 내역은 제외하고 리스트에 저장
			myMeetings = allMyMeetings.filter(m => m.status !== 'rejected');

		} catch (error) {
			console.error("내 모임 로딩 실패:", error);
		} finally {
			isLoading = false;
		}
	}

	function formatMeetingData(id, data, status, reviewedSet, isHost = false) {
		const meetingDate = new Date(data.date);
		const now = new Date();
		
		return {
			id: id,
			title: data.title,
			date: data.date,
			location: data.location,
			image: data.image,
			status: status,
			dday: calculateDday(data.date),
			isPast: meetingDate < now,
			hasReviewed: reviewedSet.has(id),
			isHost: isHost
		};
	}

	// ... (나머지 openReviewModal, handleReviewComplete, calculateDday, formatMeetingDate, goToCreate, goToDetail 함수 유지) ...
	function openReviewModal(meeting) {
		reviewTargetMeeting = meeting;
		showReviewModal = true;
	}

	function handleReviewComplete() {
		fetchMyMeetings();
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
	
	function goToDetail(id) {
		goto(`/meetings/${id}`);
	}
</script>

<div class="page-container">
	<h2 class="page-title">내 대화장</h2>

	<div class="list-container">
		{#if isLoading}
			<Skeleton />
		{:else if !$user}
			<div class="empty-state">
				<p>로그인이 필요한 서비스입니다.</p>
				<a href="/login" class="login-link">로그인하기</a>
			</div>
		{:else if myMeetings.length > 0}
			{#each myMeetings as meeting}
				<div 
					class="meeting-card" 
					on:click={() => goToDetail(meeting.id)}
					role="button"
					tabindex="0"
					on:keydown={(e) => e.key === 'Enter' && goToDetail(meeting.id)}
				>
					<div class="image-wrapper {meeting.isPast ? 'grayscale' : ''}">
						<img src={meeting.image} alt={meeting.title} />
						<span class="d-day-badge">{meeting.dday}</span>
					</div>
					<div class="content">
						<div class="status-row">
							{#if meeting.isHost}
								<span class="status-badge host">
									<Crown size={12} /> 호스트
								</span>
							{/if}

							{#if meeting.status === 'pending'}
								<span class="status-badge pending">신청 중</span>
							{:else if meeting.isPast}
								<span class="status-badge completed">참여 완료</span>
							{:else}
								<span class="status-badge upcoming">참여 예정</span>
							{/if}

							{#if meeting.isPast}
								{#if meeting.hasReviewed}
									<span class="reviewed-badge">
										<Check size={12} /> 작성 완료
									</span>
								{:else}
									<button 
										class="review-btn" 
										on:click|stopPropagation={() => openReviewModal(meeting)}
									>
										<Star size={12} /> 후기 작성
									</button>
								{/if}
							{/if}
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
				<p>참여하거나 신청한 모임이 없습니다.</p>
			</div>
		{/if}
	</div>

	<button class="fab" on:click={goToCreate} aria-label="모임 개설하기">
		<Plus size={24} />
	</button>
</div>

{#if showReviewModal && reviewTargetMeeting}
	<MeetingReviewModal 
		meeting={reviewTargetMeeting} 
		on:close={() => showReviewModal = false}
		on:complete={handleReviewComplete}
	/>
{/if}

<style>
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
		height: 130px;
		cursor: pointer;
		transition: transform 0.2s, box-shadow 0.2s;
	}

	.meeting-card:hover {
		transform: translateY(-2px);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
	}
	
	.meeting-card:active {
		transform: scale(0.98);
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
		position: relative;
	}

	.status-row {
		margin-bottom: 6px;
		display: flex;
		align-items: center;
		gap: 6px;
		flex-wrap: wrap;
	}

	.status-badge {
		font-size: 11px;
		padding: 3px 8px;
		border-radius: 6px;
		font-weight: 700;
		display: inline-flex;
		align-items: center;
		gap: 4px;
	}

	.status-badge.host {
		background-color: #FEFCBF;
		color: #B7791F;
		border: 1px solid #F6E05E;
	}

	.status-badge.upcoming {
		background-color: #E6FFFA;
		color: #2C7A7B;
		border: 1px solid #B2F5EA;
	}

	.status-badge.pending {
		background-color: #FFFAF0;
		color: #C05621;
		border: 1px solid #FEEBC8;
	}

	.status-badge.completed {
		background-color: #EDF2F7;
		color: #4A5568;
		border: 1px solid #E2E8F0;
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

	.review-btn {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		background-color: #3182ce;
		color: white;
		border: none;
		padding: 3px 8px;
		border-radius: 6px;
		font-size: 11px;
		font-weight: bold;
		cursor: pointer;
		transition: background 0.2s;
	}
	.review-btn:hover {
		background-color: #2b6cb0;
	}
	.reviewed-badge {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		color: #718096;
		font-size: 11px;
		font-weight: bold;
		padding: 3px 0;
	}

	.empty-state {
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