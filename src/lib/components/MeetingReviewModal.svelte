<script>
	import { createEventDispatcher } from 'svelte';
	import { user, modal } from '$lib/stores';
	import { db } from '$lib/firebase';
	import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
	import { X, Star } from 'lucide-svelte';

	export let meeting; // 후기를 남길 모임 정보

	const dispatch = createEventDispatcher();
	let rating = 5;
	let content = '';
	let isSubmitting = false;

	function close() {
		dispatch('close');
	}

	function setRating(r) {
		rating = r;
	}

	async function submit() {
		if (!content.trim()) return modal.alert('후기 내용을 입력해주세요.');
		
		if (!await modal.confirm(`'${meeting.title}' 모임의 후기를 등록하시겠습니까?`)) return;

		isSubmitting = true;
		try {
			await addDoc(collection(db, 'meeting_reviews'), {
				meetingId: meeting.id, // 모임 ID (이걸로 중복 체크)
				meetingTitle: meeting.title,
				reviewerId: $user.uid,
				reviewerName: $user.displayName || '익명',
				rating: rating,
				content: content,
				createdAt: serverTimestamp()
			});

			await modal.alert('후기가 등록되었습니다. 감사합니다!');
			dispatch('complete'); // 부모에게 완료 알림
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
			<h3>모임 후기 작성</h3>
			<button class="close-btn" on:click={close}><X size={20}/></button>
		</div>
		<div class="body">
			<p class="meeting-title">{meeting.title}</p>
			<p class="desc">모임은 어떠셨나요?</p>
			
			<div class="star-rating">
				{#each [1, 2, 3, 4, 5] as r}
					<button 
						class="star-btn" 
						class:filled={r <= rating}
						on:click={() => setRating(r)}
					>
						<Star size={32} fill={r <= rating ? "#FFD700" : "none"} color={r <= rating ? "#FFD700" : "#CBD5E0"} />
					</button>
				{/each}
			</div>
			<p class="rating-text">{rating}점</p>

			<textarea 
				class="review-input"
				bind:value={content} 
				placeholder="모임의 분위기나 좋았던 점을 자유롭게 남겨주세요."
				rows="4"
			></textarea>

			<button class="submit-btn" on:click={submit} disabled={isSubmitting}>
				{isSubmitting ? '저장 중...' : '등록하기'}
			</button>
		</div>
	</div>
</div>

<style>
	.modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); z-index: 2200; display: flex; align-items: center; justify-content: center; padding: 20px; }
	.modal-content { background: white; width: 100%; max-width: 340px; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.2); animation: popIn 0.2s ease-out; }
	@keyframes popIn { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }

	.header { padding: 16px 20px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center; background: #fdfdfd; }
	.header h3 { margin: 0; font-size: 16px; font-weight: bold; color: #333; }
	.close-btn { background: none; border: none; cursor: pointer; color: #999; padding: 4px; }
	.close-btn:hover { color: #333; }

	.body { padding: 24px 20px; display: flex; flex-direction: column; align-items: center; gap: 16px; }
	.meeting-title { font-size: 16px; font-weight: 700; color: #2d3748; margin: 0; text-align: center; word-break: keep-all; }
	.desc { margin: 0; font-size: 14px; color: #718096; }
	
	.star-rating { display: flex; gap: 4px; }
	.star-btn { background: none; border: none; padding: 4px; cursor: pointer; transition: transform 0.1s; }
	.star-btn:active { transform: scale(0.9); }
	.rating-text { font-size: 14px; font-weight: bold; color: #F6AD55; margin-top: -8px; }

	.review-input { width: 100%; padding: 12px; border: 1px solid #e2e8f0; border-radius: 8px; box-sizing: border-box; font-size: 14px; outline: none; transition: border-color 0.2s; resize: none; }
	.review-input:focus { border-color: #3182ce; }

	.submit-btn { width: 100%; padding: 14px; background: #3182ce; color: white; border: none; border-radius: 10px; font-weight: bold; cursor: pointer; font-size: 15px; transition: background 0.2s; }
	.submit-btn:hover { background: #2b6cb0; }
	.submit-btn:disabled { background: #cbd5e0; cursor: not-allowed; }
</style>