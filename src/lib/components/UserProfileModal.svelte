<script>
	import { createEventDispatcher } from 'svelte';
	import { user as currentUser } from '$lib/stores';
	import { db } from '$lib/firebase';
	import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore'; // [추가] doc, getDoc 임포트
	import { X, Briefcase, MessageSquare, MessageCircle } from 'lucide-svelte';
	import ReviewModal from '$lib/components/ReviewModal.svelte';

	// [수정] userId를 받을 수 있도록 prop 추가
	export let userId = null; 
	export let user = {}; // 기존처럼 user 객체를 바로 받는 경우도 지원

	const dispatch = createEventDispatcher();
	let showReviewModal = false;
	let canReview = false;
	let isLoading = false; // 로딩 상태

	function close() {
		dispatch('close');
	}

	function getGenderText(code) {
		if (code === 'M') return '남성';
		if (code === 'F') return '여성';
		return '';
	}

	// [추가] userId로 유저 정보 가져오기
	async function fetchUserData(id) {
		if (!id) return;
		isLoading = true;
		try {
			const docRef = doc(db, 'users', id);
			const docSnap = await getDoc(docRef);
			
			if (docSnap.exists()) {
				// 문서 데이터에 id를 포함하여 user 객체 업데이트
				user = { id: docSnap.id, ...docSnap.data() };
			} else {
				console.error("해당 유저를 찾을 수 없습니다.");
			}
		} catch (error) {
			console.error("유저 정보 로딩 실패:", error);
		} finally {
			isLoading = false;
		}
	}

	// [반응형] userId가 변경되면 데이터 새로 불러오기
	$: if (userId) {
		fetchUserData(userId);
	}

	// 대화평 작성 권한 확인
	async function checkReviewAvailability() {
		canReview = false;
		
		// user 정보가 로딩되지 않았거나 본인이면 리턴
		if (!$currentUser || !user?.id || $currentUser.uid === user.id) return;

		try {
			const myAppsQ = query(
				collection(db, 'meeting_applications'),
				where('userId', '==', $currentUser.uid),
				where('status', '==', 'accepted')
			);
			
			const targetAppsQ = query(
				collection(db, 'meeting_applications'),
				where('userId', '==', user.id),
				where('status', '==', 'accepted')
			);

			const [mySnap, targetSnap] = await Promise.all([getDocs(myAppsQ), getDocs(targetAppsQ)]);

			const myMeetings = mySnap.docs.map(doc => ({ 
				id: doc.data().meetingId, 
				date: doc.data().meetingDate 
			}));
			
			const targetMeetingIds = new Set(targetSnap.docs.map(doc => doc.data().meetingId));
			const now = new Date().toISOString();
			
			canReview = myMeetings.some(meeting => 
				targetMeetingIds.has(meeting.id) && meeting.date < now
			);

		} catch (error) {
			console.error('대화평 가능 여부 확인 실패:', error);
		}
	}

	// user 정보가 업데이트되면 대화평 권한 다시 확인
	$: if (user && user.id && $currentUser) {
		checkReviewAvailability();
	}
</script>

<div class="modal-overlay" role="button" tabindex="0" on:click={close} on:keydown={(e) => (e.key === 'Enter' || e.key === ' ') && close()}>
	<div class="modal-content" role="dialog" aria-modal="true" tabindex="0" on:keydown={(e) => e.key === 'Escape' && close()} on:click|stopPropagation>
		<button class="close-btn" on:click={close}>
			<X size={24} />
		</button>

		{#if isLoading}
			<div class="loading-state">
				<div class="spinner"></div>
				<p>정보를 불러오는 중...</p>
			</div>
		{:else}
			<div class="profile-header">
				<div class="avatar-wrapper">
					<img src={user.image || 'https://placehold.co/200x200/eee/ccc?text=User'} alt={user.nickname || 'User'} />
				</div>
				<h3 class="nickname">
					{user.nickname || '알 수 없음'}
					{#if user.age || user.gender}
						<span class="meta">
							{user.age ? `${user.age}세` : ''}
							{user.gender ? ` · ${getGenderText(user.gender)}` : ''}
						</span>
					{/if}
				</h3>
				{#if user.job}
					<div class="job-badge">
						<Briefcase size={12} /> {user.job}
					</div>
				{/if}
			</div>

			<div class="profile-body">
				{#if user.intro}
					<div class="section intro-box">
						<MessageSquare size={16} class="icon" />
						<p>"{user.intro}"</p>
					</div>
				{/if}

				{#if user.interests && user.interests.length > 0}
					<div class="section">
						<h4 class="section-title">관심사</h4>
						<div class="tags">
							{#each user.interests as interest}
								<span class="tag-chip">#{interest}</span>
							{/each}
						</div>
					</div>
				{/if}

				{#if user.peopleMet > 0}
					<div class="section stats">
						<div class="stat-item">
							<span class="label">만난 사람들</span>
							<span class="value">{user.peopleMet}명</span>
						</div>
					</div>
				{/if}

				{#if canReview}
					<div class="action-area">
						<button class="review-trigger-btn" on:click={() => showReviewModal = true}>
							<MessageCircle size={18} />
							<span>대화평 남기기</span>
						</button>
					</div>
				{/if}
			</div>
		{/if}
	</div>
</div>

{#if showReviewModal}
	<ReviewModal 
		targetUser={user} 
		on:close={() => showReviewModal = false} 
	/>
{/if}

<style>
	.modal-overlay {
		position: fixed;
		top: 0; left: 0; width: 100%; height: 100%;
		background-color: rgba(0, 0, 0, 0.6); z-index: 2000;
		display: flex; align-items: center;
		justify-content: center;
		padding: 20px; backdrop-filter: blur(2px);
	}

	.modal-content {
		background: white; width: 100%; max-width: 340px;
		border-radius: 20px; overflow: hidden;
		box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
		position: relative;
		animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
		min-height: 300px; /* 로딩 중에도 최소 높이 유지 */
	}

	@keyframes slideUp {
		from { transform: translateY(20px); opacity: 0; }
		to { transform: translateY(0); opacity: 1; }
	}

	.close-btn {
		position: absolute; top: 16px;
		right: 16px;
		background: rgba(0,0,0,0.05); border: none; border-radius: 50%;
		width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;
		cursor: pointer;
		color: #333; z-index: 10;
	}

	/* 로딩 상태 스타일 */
	.loading-state {
		display: flex; flex-direction: column; align-items: center; justify-content: center;
		height: 300px; color: #888; font-size: 14px;
	}
	.spinner {
		width: 30px; height: 30px; border: 3px solid #f3f3f3;
		border-top: 3px solid #333; border-radius: 50%;
		animation: spin 1s linear infinite; margin-bottom: 12px;
	}
	@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

	.profile-header {
		display: flex; flex-direction: column; align-items: center;
		padding: 32px 20px 20px; background-color: #fdfdfd;
		border-bottom: 1px solid #f0f0f0;
	}

	.avatar-wrapper {
		width: 90px; height: 90px; border-radius: 50%;
		overflow: hidden; border: 4px solid white;
		box-shadow: 0 4px 12px rgba(0,0,0,0.1);
		margin-bottom: 12px;
	}
	.avatar-wrapper img { width: 100%; height: 100%; object-fit: cover; }

	.nickname { font-size: 20px;
		font-weight: 800; color: #1a1a1a; margin: 0 0 6px; display: flex; align-items: center; gap: 6px; }
	.meta { font-size: 14px; font-weight: normal;
		color: #888; }

	.job-badge {
		display: inline-flex; align-items: center; gap: 4px;
		background-color: #f0f4ff; color: #3182ce;
		padding: 4px 10px; border-radius: 12px;
		font-size: 12px;
		font-weight: 600;
	}

	.profile-body { padding: 20px; display: flex; flex-direction: column; gap: 20px; }

	.intro-box {
		background-color: #f8f9fa; padding: 16px; border-radius: 12px;
		display: flex; gap: 10px; align-items: flex-start;
	}
	.intro-box .icon { color: #cbd5e0; flex-shrink: 0; margin-top: 2px; }
	.intro-box p { margin: 0;
		font-size: 14px; line-height: 1.5; color: #4a5568; font-style: italic; }

	.section-title { font-size: 13px; font-weight: 700; color: #a0aec0; margin: 0 0 10px;
		text-transform: uppercase; letter-spacing: 0.5px; }

	.tags { display: flex; flex-wrap: wrap; gap: 6px; }
	.tag-chip {
		background-color: white; border: 1px solid #e2e8f0;
		padding: 6px 12px; border-radius: 20px;
		font-size: 13px; color: #4a5568;
	}

	.stats { border-top: 1px solid #f0f0f0; padding-top: 16px; display: flex;
		justify-content: center; }
	.stat-item { display: flex; flex-direction: column; align-items: center; }
	.stat-item .label { font-size: 11px; color: #a0aec0; margin-bottom: 2px;
	}
	.stat-item .value { font-size: 16px; font-weight: 800; color: #2d3748; }

	.action-area { margin-top: 10px; }
	.review-trigger-btn {
		width: 100%; padding: 12px;
		background-color: #333;
		color: white;
		border: none; border-radius: 12px;
		font-size: 14px; font-weight: 600;
		display: flex; align-items: center; justify-content: center; gap: 8px;
		cursor: pointer;
		transition: background-color 0.2s;
	}
	.review-trigger-btn:hover { background-color: #1a1a1a; }
	.review-trigger-btn:active { transform: scale(0.98); }
</style>