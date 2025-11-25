<script>
	import { createEventDispatcher } from 'svelte';
	import { appSettings, user, modal } from '$lib/stores';
	import { db } from '$lib/firebase';
	import { addDoc, collection, serverTimestamp, doc, updateDoc, increment } from 'firebase/firestore';
	import { X } from 'lucide-svelte';

	export let targetUser; // 리뷰 대상 유저

	const dispatch = createEventDispatcher();
	let selectedBadgeId = null;
	let customText = '';
	let isSubmitting = false;

	// 앱 설정에서 뱃지 목록 가져오기
	$: badges = $appSettings.reviewBadges || [];

	function close() {
		dispatch('close');
	}

	async function submit() {
		if (!selectedBadgeId) return modal.alert('대화평을 선택해주세요.');
		if (selectedBadgeId === 'custom') {
			if (!customText.trim()) return modal.alert('내용을 입력해주세요.');
			if (customText.length > 20) return modal.alert('20자 이내로 입력해주세요.');
		}

		if (!await modal.confirm(`${targetUser.nickname}님에게 대화평을 남기시겠습니까?`)) return;

		isSubmitting = true;
		try {
			// 1. 리뷰 데이터 저장 (reviews 컬렉션)
			const reviewData = {
				targetUserId: targetUser.id,
				reviewerId: $user.uid,
				type: selectedBadgeId === 'custom' ? 'custom' : 'badge',
				content: selectedBadgeId === 'custom' ? customText : selectedBadgeId,
				text: selectedBadgeId === 'custom' ? customText : badges.find(b => b.id === selectedBadgeId)?.text,
				createdAt: serverTimestamp()
			};
			
			await addDoc(collection(db, 'reviews'), reviewData);

			// 2. 뱃지인 경우, 대상 유저의 통계(reviewCounts) 증가
			if (selectedBadgeId !== 'custom') {
				const userRef = doc(db, 'users', targetUser.id);
				// Firestore Map 필드 업데이트 (reviewCounts.뱃지ID)
				await updateDoc(userRef, {
					[`reviewCounts.${selectedBadgeId}`]: increment(1)
				});
			}

			await modal.alert('소중한 대화평을 남겨주셔서 감사합니다!');
			close();
		} catch (e) {
			console.error(e);
			await modal.alert('저장 중 오류가 발생했습니다.');
		} finally {
			isSubmitting = false;
		}
	}
</script>

<div class="modal-overlay" on:click={close}>
	<div class="modal-content" on:click|stopPropagation>
		<div class="header">
			<h3>대화평 남기기</h3>
			<button class="close-btn" on:click={close}><X size={20}/></button>
		</div>
		<div class="body">
			<p class="desc"><strong>{targetUser.nickname}</strong>님과의 대화는 어떠셨나요?</p>
			
			<div class="badge-list">
				{#each badges as badge}
					<button 
						class="badge-btn" 
						class:selected={selectedBadgeId === badge.id}
						style="--bg-color: {badge.color}; --text-color: {badge.textColor};"
						on:click={() => selectedBadgeId = badge.id}
					>
						{badge.text}
					</button>
				{/each}
				<button 
					class="badge-btn custom" 
					class:selected={selectedBadgeId === 'custom'}
					on:click={() => selectedBadgeId = 'custom'}
				>
					✏️ 기타 (직접 입력)
				</button>
			</div>

			{#if selectedBadgeId === 'custom'}
				<div class="custom-input">
					<input 
						type="text" 
						bind:value={customText} 
						placeholder="20자 이내로 입력해주세요." 
						maxlength="20"
					/>
					<span class="count">{customText.length}/20</span>
				</div>
			{/if}

			<button class="submit-btn" on:click={submit} disabled={isSubmitting}>
				{isSubmitting ? '저장 중...' : '보내기'}
			</button>
		</div>
	</div>
</div>

<style>
	.modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); z-index: 2200; display: flex; align-items: center; justify-content: center; }
	.modal-content { background: white; width: 320px; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.2); animation: popIn 0.2s ease-out; }
	@keyframes popIn { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }

	.header { padding: 16px 20px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center; background: #fdfdfd; }
	.header h3 { margin: 0; font-size: 16px; font-weight: bold; color: #333; }
	.close-btn { background: none; border: none; cursor: pointer; color: #999; padding: 4px; }
	.close-btn:hover { color: #333; }

	.body { padding: 24px 20px; display: flex; flex-direction: column; gap: 20px; }
	.desc { margin: 0; font-size: 15px; color: #4a5568; text-align: center; line-height: 1.4; }
	
	.badge-list { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; }
	.badge-btn {
		padding: 8px 12px; border-radius: 20px; border: 1px solid transparent;
		background-color: var(--bg-color, #f5f5f5);
		color: var(--text-color, #555);
		font-size: 13px; cursor: pointer; transition: all 0.2s;
		font-weight: 500;
	}
	.badge-btn.custom { background-color: #f5f5f5; color: #333; border-color: #eee; }
	
	/* 선택된 상태 */
	.badge-btn.selected {
		border-color: #3182ce;
		box-shadow: 0 0 0 1px #3182ce;
		font-weight: bold;
		transform: translateY(-1px);
	}

	.custom-input { position: relative; }
	.custom-input input { width: 100%; padding: 12px; padding-right: 45px; border: 1px solid #e2e8f0; border-radius: 8px; box-sizing: border-box; font-size: 14px; outline: none; transition: border-color 0.2s; }
	.custom-input input:focus { border-color: #3182ce; }
	.count { position: absolute; right: 12px; top: 14px; font-size: 11px; color: #a0aec0; }

	.submit-btn { width: 100%; padding: 14px; background: #3182ce; color: white; border: none; border-radius: 10px; font-weight: bold; cursor: pointer; font-size: 15px; transition: background 0.2s; }
	.submit-btn:hover { background: #2b6cb0; }
	.submit-btn:disabled { background: #cbd5e0; cursor: not-allowed; }
</style>