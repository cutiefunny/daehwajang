<script>
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { user } from '$lib/stores';
	import { db } from '$lib/firebase';
	import { collection, query, where, getDocs, doc, getDoc, orderBy } from 'firebase/firestore';
	import { Calendar, MapPin, Loader2, Plus, Star, Check, Crown, Users, Ban, Info, BookOpen, CreditCard, XCircle, MousePointerClick } from 'lucide-svelte';
	import { goto } from '$app/navigation';
	import MeetingReviewModal from '$lib/components/MeetingReviewModal.svelte';
	import MeetingApplicantsModal from '$lib/components/admin/MeetingApplicantsModal.svelte';
	import Skeleton from '$lib/components/Skeleton.svelte';

	// 탭 상태 ('list' | 'guide')
	let activeTab = 'list';

	let myMeetings = [];
	let isLoading = true;
	let loadedUserId = null;

	let showReviewModal = false;
	let reviewTargetMeeting = null;

	let showApplicantsModal = false;
	let applicantsTargetMeeting = null;

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

	onMount(() => {
		// [추가] 최초 접속 여부 확인 (Local Storage)
		const hasSeenGuide = localStorage.getItem('hasSeenDaehwajangGuide');
		if (!hasSeenGuide) {
			activeTab = 'guide'; // 가이드 탭 먼저 보여주기
			localStorage.setItem('hasSeenDaehwajangGuide', 'true');
		}
	});

	async function fetchMyMeetings() {
		isLoading = true;
		try {
			// 1. 내 신청 내역
			const appsQ = query(
				collection(db, 'meeting_applications'),
				where('userId', '==', $user.uid),
				orderBy('appliedAt', 'desc')
			);
			// 2. 내가 호스트인 모임
			const hostedQ = query(
				collection(db, 'meetings'),
				where('hostId', '==', $user.uid),
				orderBy('date', 'desc')
			);
			// 3. 내가 작성한 후기
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

			// A. 신청 내역 가공
			const applications = appsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
			const appPromises = applications.map(async (app) => {
				if (!app.meetingId) return null;
				try {
					const meetingRef = doc(db, 'meetings', app.meetingId);
					const meetingSnap = await getDoc(meetingRef);
					
					if (meetingSnap.exists()) {
						const meetingData = meetingSnap.data();
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

			// B. 호스트 모임 가공
			const hostedMeetings = await Promise.all(hostedSnap.docs.map(async (docSnap) => {
				const data = docSnap.data();
				return formatMeetingData(docSnap.id, data, 'accepted', reviewedMeetingIds, true);
			}));

			const appResults = await Promise.all(appPromises);
			const validAppResults = appResults.filter(r => r !== null);
            
			const meetingMap = new Map();
			hostedMeetings.forEach(m => meetingMap.set(m.id, m));
			validAppResults.forEach(m => {
				if (!meetingMap.has(m.id)) meetingMap.set(m.id, m);
			});
			const allMyMeetings = Array.from(meetingMap.values());

			allMyMeetings.sort((a, b) => new Date(b.date) - new Date(a.date));
			myMeetings = allMyMeetings; // 모든 상태 포함

            // 딥링크 처리
            const params = $page.url.searchParams;
            const targetId = params.get('meetingId');
            const viewMode = params.get('view');

            if (targetId && viewMode === 'applicants') {
                const targetMeeting = myMeetings.find(m => m.id === targetId);
                if (targetMeeting && targetMeeting.isHost) {
                    openApplicantsModal(targetMeeting);
                }
            }

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

	function openReviewModal(meeting) {
		reviewTargetMeeting = meeting;
		showReviewModal = true;
	}

	function handleReviewComplete() {
		fetchMyMeetings();
	}
	
	function openApplicantsModal(meeting) {
		applicantsTargetMeeting = meeting;
		showApplicantsModal = true;
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
	<div class="header-section">
		<div class="tabs">
			<button class="tab-btn {activeTab === 'list' ? 'active' : ''}" on:click={() => activeTab = 'list'}>
				<BookOpen size={18} /> 내 모임
			</button>
			<button class="tab-btn {activeTab === 'guide' ? 'active' : ''}" on:click={() => activeTab = 'guide'}>
				<Info size={18} /> 이용 가이드
			</button>
		</div>
	</div>

	{#if activeTab === 'list'}
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
									<button 
										class="manage-btn"
										on:click|stopPropagation={() => openApplicantsModal(meeting)}
									>
										<Users size={12} /> 참가자 관리
									</button>
								{/if}

								{#if !meeting.isHost}
									{#if meeting.status === 'pending'}
										<span class="status-badge pending">신청 중</span>
									{:else if meeting.status === 'rejected'}
										<span class="status-badge rejected">
											<Ban size={12} /> 거절됨
										</span>
									{:else if meeting.status === 'canceled'}
										<span class="status-badge canceled">취소됨</span>
									{:else if meeting.isPast}
										<span class="status-badge completed">참여 완료</span>
									{:else}
										<span class="status-badge upcoming">참여 예정</span>
									{/if}
								{/if}

								{#if meeting.isPast && !meeting.isHost && meeting.status === 'accepted'}
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

	{:else if activeTab === 'guide'}
		<div class="guide-container">
			<div class="guide-card">
				<div class="guide-icon"><Plus size={24} color="white" /></div>
				<div class="guide-content">
					<h4>모임 개설하기</h4>
					<p>홈 화면 우측 하단의 <span class="highlight">+ 버튼</span>을 눌러 새로운 모임을 만들어보세요. 호스트가 되어 사람들을 초대할 수 있습니다.</p>
				</div>
			</div>

			<div class="guide-arrow">▼</div>

			<div class="guide-card">
				<div class="guide-icon pay"><CreditCard size={24} color="white" /></div>
				<div class="guide-content">
					<h4>참여 신청 및 결제</h4>
					<p>마음에 드는 모임이 있다면 <span class="highlight">참여 신청</span>을 해보세요. 참가비 결제가 완료되면 호스트에게 알림이 전송됩니다.</p>
				</div>
			</div>

			<div class="guide-arrow">▼</div>

			<div class="guide-card">
				<div class="guide-icon host"><Crown size={24} color="white" /></div>
				<div class="guide-content">
					<h4>승인 대기 및 확정</h4>
					<p>호스트가 신청을 확인하고 <span class="highlight">승인</span>하면 참여가 확정됩니다. <span class="highlight">거절</span>될 경우 결제가 취소되며 재신청이 불가능합니다.</p>
				</div>
			</div>

			<div class="guide-arrow">▼</div>

			<div class="guide-card">
				<div class="guide-icon cancel"><XCircle size={24} color="white" /></div>
				<div class="guide-content">
					<h4>신청 취소</h4>
					<p>참여가 어려워졌다면 <span class="highlight">신청 취소</span>가 가능합니다. 단, 취소 시 해당 모임은 다시 신청할 수 없으니 신중하게 결정해주세요.</p>
				</div>
			</div>

			<div class="guide-footer">
				<button class="start-btn" on:click={() => activeTab = 'list'}>
					확인했어요! 내 모임 보러가기
				</button>
			</div>
		</div>
	{/if}
</div>

{#if showReviewModal && reviewTargetMeeting}
	<MeetingReviewModal 
		meeting={reviewTargetMeeting} 
		on:close={() => showReviewModal = false}
		on:complete={handleReviewComplete}
	/>
{/if}

{#if showApplicantsModal && applicantsTargetMeeting}
	<MeetingApplicantsModal
		meeting={applicantsTargetMeeting}
		on:close={() => showApplicantsModal = false}
	/>
{/if}

<style>
	.page-container {
		padding: 20px 16px;
		padding-bottom: 80px;
		position: relative;
		min-height: 100vh;
		background-color: #fff;
	}

	.header-section {
		margin-bottom: 20px;
	}

	.page-title {
		font-size: 22px;
		font-weight: bold;
		margin: 0 0 16px 0;
	}

	/* 탭 스타일 */
	.tabs {
		display: flex;
		gap: 8px;
		border-bottom: 1px solid #eee;
		padding-bottom: 12px;
	}
	.tab-btn {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 8px 16px;
		border-radius: 20px;
		border: 1px solid #e2e8f0;
		background-color: #fff;
		color: #718096;
		font-size: 14px;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s;
	}
	.tab-btn.active {
		background-color: #3182ce;
		color: white;
		border-color: #3182ce;
	}

	/* 가이드 스타일 */
	.guide-container {
		display: flex;
		flex-direction: column;
		gap: 8px;
		padding: 10px 0;
	}
	.guide-card {
		display: flex;
		align-items: flex-start;
		gap: 16px;
		background-color: #f8fafc;
		padding: 20px;
		border-radius: 16px;
		border: 1px solid #f1f5f9;
	}
	.guide-icon {
		width: 48px;
		height: 48px;
		border-radius: 12px;
		background-color: #333;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}
	.guide-icon.pay { background-color: #3182ce; }
	.guide-icon.host { background-color: #d69e2e; }
	.guide-icon.cancel { background-color: #e53e3e; }

	.guide-content h4 {
		margin: 0 0 4px 0;
		font-size: 16px;
		font-weight: bold;
		color: #2d3748;
	}
	.guide-content p {
		margin: 0;
		font-size: 14px;
		color: #4a5568;
		line-height: 1.5;
	}
	.highlight {
		color: #3182ce;
		font-weight: bold;
	}
	.guide-arrow {
		text-align: center;
		color: #cbd5e0;
		font-size: 12px;
	}
	.guide-footer {
		margin-top: 20px;
		text-align: center;
	}
	.start-btn {
		width: 100%;
		padding: 16px;
		background-color: #3182ce;
		color: white;
		border: none;
		border-radius: 12px;
		font-size: 16px;
		font-weight: bold;
		cursor: pointer;
	}

	/* 기존 리스트 스타일 유지 */
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
	
	.status-badge.rejected {
		background-color: #FFF5F5;
		color: #C53030;
		border: 1px solid #FEB2B2;
	}
	.status-badge.canceled {
		background-color: #EDF2F7;
		color: #718096;
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

	.manage-btn {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		background-color: #805AD5;
		color: white;
		border: none;
		padding: 3px 8px;
		border-radius: 6px;
		font-size: 11px;
		font-weight: bold;
		cursor: pointer;
		transition: background 0.2s;
	}
	.manage-btn:hover {
		background-color: #6B46C1;
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