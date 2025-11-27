<script>
	import { createEventDispatcher, onMount } from 'svelte';
	import { modal } from '$lib/stores';
	import { db } from '$lib/firebase';
	// [수정] addDoc, serverTimestamp 추가
	import { collection, query, where, getDocs, doc, updateDoc, orderBy, getDoc, addDoc, serverTimestamp } from 'firebase/firestore';
	import { X, Check, Ban, Loader2, User } from 'lucide-svelte';
	import Skeleton from '$lib/components/Skeleton.svelte';

	export let meeting = null;
	const dispatch = createEventDispatcher();
	let applicants = [];
	let isLoading = true;

	// 신청자 목록 불러오기
	async function fetchApplicants() {
		if (!meeting) return;
		isLoading = true;
		try {
			const q = query(
				collection(db, 'meeting_applications'),
				where('meetingId', '==', meeting.id),
				orderBy('appliedAt', 'desc')
			);
			const snapshot = await getDocs(q);
			
			const applications = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

			const combinedPromises = applications.map(async (app) => {
				if (!app.userId) return app;

				try {
					const userDocRef = doc(db, 'users', app.userId);
					const userSnap = await getDoc(userDocRef);
					
					if (userSnap.exists()) {
						const userData = userSnap.data();
						return {
							...app,
							userName: userData.nickname || app.userName,
							userImage: userData.image || app.userImage,
							userEmail: userData.email || app.userEmail
						};
					}
				} catch (e) {
					console.error(`유저 정보 로딩 실패 (${app.userId}):`, e);
				}
				return app;
			});
			applicants = await Promise.all(combinedPromises);

		} catch (error) {
			console.error("신청자 로딩 실패:", error);
		} finally {
			isLoading = false;
		}
	}

	// [수정] 상태 변경 및 알림 전송 로직 추가
	async function updateStatus(applicant, newStatus) {
		const originalStatus = applicant.status;
		
		// 1. UI 낙관적 업데이트
		applicants = applicants.map(app => 
			app.id === applicant.id ? { ...app, status: newStatus } : app
		);

		try {
			// 2. DB 상태 업데이트
			const appRef = doc(db, 'meeting_applications', applicant.id);
			await updateDoc(appRef, { status: newStatus });

			// 3. 신청자에게 알림 전송
			if (newStatus === 'accepted' || newStatus === 'rejected') {
				await sendStatusNotification(applicant, newStatus);
			}

		} catch (error) {
			console.error("상태 업데이트 실패:", error);
			await modal.alert("상태 변경 중 오류가 발생했습니다.");
			// 실패 시 롤백
			applicants = applicants.map(app => 
				app.id === applicant.id ? { ...app, status: originalStatus } : app
			);
		}
	}

	// [추가] 알림 전송 함수
	async function sendStatusNotification(applicant, status) {
		try {
			// 신청자의 알림 설정 확인
			const userRef = doc(db, 'users', applicant.userId);
			const userSnap = await getDoc(userRef);
			
			if (userSnap.exists()) {
				const userData = userSnap.data();
				const settings = userData.notificationSettings || {};
				
				// 전체 알림 ON && 게스트 상태 알림 ON 인지 확인
				const isEnabled = (settings.enabled !== false) && (settings.guestStatus !== false);

				if (isEnabled) {
					const isAccepted = status === 'accepted';
					const title = isAccepted ? '모임 참여 승인 🎉' : '모임 참여 거절 😥';
					const body = isAccepted 
						? `'${meeting.title}' 모임 참여가 확정되었습니다!` 
						: `'${meeting.title}' 모임 참여가 아쉽게도 거절되었습니다.`;

					await addDoc(collection(db, 'notifications'), {
						targetUserId: applicant.userId,
						type: 'application_status',
						title: title,
						body: body,
						link: `/my-daehwajang`, // 내 모임 목록으로 이동
						read: false,
						timestamp: serverTimestamp()
					});
					console.log(`신청자(${applicant.userId})에게 알림 전송 완료`);
				}
			}
		} catch (e) {
			console.error('알림 전송 실패:', e);
		}
	}

	function close() {
		dispatch('close');
	}

	function formatDate(timestamp) {
		if (!timestamp) return '-';
		return timestamp.toDate().toLocaleString('ko-KR', {
			month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit'
		});
	}

	onMount(() => {
		fetchApplicants();
	});
</script>

<div class="modal-overlay" role="button" tabindex="0" on:click={close} on:keydown={(e) => (e.key === 'Enter' || e.key === ' ') && close()}>
	<div class="modal-content" role="dialog" aria-modal="true" tabindex="0" on:keydown={(e) => e.key === 'Escape' && close()} on:click|stopPropagation>
		<div class="modal-header">
			<div>
				<h3>신청자 관리</h3>
				<span class="sub-title">{meeting.title}</span>
			</div>
			<button class="close-btn" on:click={close}><X size={20} /></button>
		</div>
		
		<div class="modal-body">
			{#if isLoading}
				<Skeleton />
			{:else if applicants.length > 0}
				<div class="applicant-list">
					{#each applicants as applicant (applicant.id)}
						<div class="applicant-item">
							<div class="user-info">
								<div class="avatar">
									{#if applicant.userImage}
										<img src={applicant.userImage} alt={applicant.userName} />
									{:else}
										<span>{applicant.userName?.[0] || 'U'}</span>
									{/if}
								</div>
								<div class="text-info">
									<span class="name">{applicant.userName}</span>
									<span class="email">{applicant.userEmail}</span>
									<span class="date">신청: {formatDate(applicant.appliedAt)}</span>
								</div>
							</div>

							<div class="actions">
								{#if applicant.status === 'pending'}
									<button class="btn approve" on:click={() => updateStatus(applicant, 'accepted')} title="승인">
										<Check size={16} />
									</button>
									<button class="btn reject" on:click={() => updateStatus(applicant, 'rejected')} title="거절">
										<Ban size={16} />
									</button>
								{:else}
									<span class="status-badge {applicant.status}">
										{applicant.status === 'accepted' ? '승인됨' : '거절됨'}
									</span>
								{/if}
							</div>
						</div>
					{/each}
				</div>
			{:else}
				<div class="empty-state">
					<User size={48} color="#ddd" />
					<p>아직 신청자가 없습니다.</p>
				</div>
			{/if}
		</div>
	</div>
</div>

<style>
	.modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%;
		background-color: rgba(0,0,0,0.5); z-index: 9999; display: flex; align-items: center; justify-content: center; }
	.modal-content { background: white; width: 500px; max-height: 80vh; border-radius: 12px;
		display: flex; flex-direction: column; box-shadow: 0 10px 25px rgba(0,0,0,0.2); overflow: hidden; }
	
	.modal-header { padding: 16px 24px; border-bottom: 1px solid #e2e8f0;
		display: flex; justify-content: space-between; align-items: flex-start; background-color: #fff; }
	.modal-header h3 { margin: 0; font-size: 18px; color: #2d3748;
	}
	.sub-title { font-size: 13px; color: #718096; margin-top: 4px; display: block; }
	.close-btn { background: none; border: none; cursor: pointer; color: #a0aec0;
		padding: 4px; }
	.close-btn:hover { color: #4a5568; }

	.modal-body { padding: 0; overflow-y: auto; flex: 1; background-color: #fff;
	}
	
	.empty-state { padding: 60px 20px; text-align: center; color: #a0aec0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px;
	}
	
	.applicant-list { display: flex;
		flex-direction: column; }
	.applicant-item { display: flex; align-items: center; justify-content: space-between; padding: 16px 24px; border-bottom: 1px solid #f7fafc; transition: background-color 0.2s;
	}
	.applicant-item:hover { background-color: #fafafa; }
	.applicant-item:last-child { border-bottom: none; }

	.user-info { display: flex; align-items: center; gap: 12px; }
	.avatar { width: 40px;
		height: 40px; border-radius: 50%; background-color: #edf2f7; overflow: hidden; display: flex; align-items: center; justify-content: center; color: #718096; font-weight: bold; font-size: 14px;
		flex-shrink: 0; border: 1px solid #eee; }
	.avatar img { width: 100%; height: 100%; object-fit: cover; }
	
	.text-info { display: flex;
		flex-direction: column; }
	.name { font-size: 14px; font-weight: 600; color: #2d3748; }
	.email { font-size: 12px; color: #718096; }
	.date { font-size: 11px;
		color: #a0aec0; margin-top: 2px; }

	.actions { display: flex; gap: 8px; align-items: center; }
	.btn { width: 32px; height: 32px; border-radius: 6px;
		border: none; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s; }
	.btn.approve { background-color: #e6fffa; color: #2c7a7b;
	}
	.btn.approve:hover { background-color: #b2f5ea; }
	.btn.reject { background-color: #fff5f5; color: #c53030; }
	.btn.reject:hover { background-color: #fed7d7; }

	.status-badge { padding: 4px 8px;
		border-radius: 4px; font-size: 12px; font-weight: bold; }
	.status-badge.accepted { background-color: #c6f6d5; color: #22543d; }
	.status-badge.rejected { background-color: #fed7d7; color: #822727; }
</style>