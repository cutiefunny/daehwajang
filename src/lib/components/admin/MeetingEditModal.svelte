<script>
	import { createEventDispatcher, onMount } from 'svelte';
	import { modal } from '$lib/stores';
	import { db } from '$lib/firebase';
	import { doc, updateDoc } from 'firebase/firestore';
	import { X } from 'lucide-svelte';
	import ImageUploader from '$lib/components/ImageUploader.svelte';

	export let meeting = {};

	const dispatch = createEventDispatcher();
	let isSaving = false;
	let formData = { ...meeting };

	// 날짜 인풋용 포맷 변환
	onMount(() => {
		if (formData.date) {
			formData.dateInput = formData.date.slice(0, 16);
		}
	});

	async function save() {
		isSaving = true;
		try {
			const meetingRef = doc(db, 'meetings', formData.id);
			const isoDate = new Date(formData.dateInput).toISOString();
			
			const updates = {
				title: formData.title,
				image: formData.image,
				category: formData.category,
				date: isoDate,
				location: formData.location,
				description: formData.description || '',
				hostName: formData.hostName
			};

			await updateDoc(meetingRef, updates);
			
			// status는 클라이언트에서 재계산 필요할 수 있으므로 부모에게 위임하거나 여기서 처리
			dispatch('save', { ...formData, ...updates, date: isoDate });
			await modal.alert('모임 정보가 수정되었습니다.');
		} catch (error) {
			console.error("수정 실패:", error);
			await modal.alert("수정 중 오류가 발생했습니다.");
		} finally {
			isSaving = false;
		}
	}

	function close() {
		dispatch('close');
	}
</script>

<div class="modal-overlay" on:click={close}>
	<div class="modal-content" on:click|stopPropagation>
		<div class="modal-header">
			<h3>모임 정보 수정</h3>
			<button class="close-btn" on:click={close}><X size={20} /></button>
		</div>
		
		<div class="modal-body">
			<div class="form-group">
				<label>대표 이미지</label>
				<div style="height: 200px;">
					<ImageUploader 
						path="meetings" 
						bind:imageUrl={formData.image} 
						objectFit="cover" 
					/>
				</div>
			</div>

			<div class="form-group">
				<label>모임명</label>
				<input type="text" bind:value={formData.title} />
			</div>

			<div class="form-row">
				<div class="form-group">
					<label>카테고리</label>
					<input type="text" bind:value={formData.category} />
				</div>
				<div class="form-group">
					<label>호스트</label>
					<input type="text" bind:value={formData.hostName} />
				</div>
			</div>

			<div class="form-row">
				<div class="form-group">
					<label>일시</label>
					<input type="datetime-local" bind:value={formData.dateInput} />
				</div>
				<div class="form-group">
					<label>장소</label>
					<input type="text" bind:value={formData.location} />
				</div>
			</div>

			<div class="form-group">
				<label>설명</label>
				<textarea bind:value={formData.description} rows="3"></textarea>
			</div>
		</div>

		<div class="modal-footer">
			<button class="cancel-btn" on:click={close}>취소</button>
			<button class="submit-btn" on:click={save} disabled={isSaving}>
				{isSaving ? '저장 중...' : '수정 완료'}
			</button>
		</div>
	</div>
</div>

<style>
	/* 공통 모달 스타일 */
	.modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.5); z-index: 9999; display: flex; align-items: center; justify-content: center; }
	.modal-content { background: white; width: 600px; max-height: 90vh; border-radius: 12px; display: flex; flex-direction: column; box-shadow: 0 10px 25px rgba(0,0,0,0.2); overflow: hidden; }
	.modal-header { padding: 16px 24px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; }
	.modal-header h3 { margin: 0; font-size: 18px; color: #2d3748; }
	.close-btn { background: none; border: none; cursor: pointer; color: #a0aec0; }
	.modal-body { padding: 24px; display: flex; flex-direction: column; gap: 16px; overflow-y: auto; }
	.modal-footer { padding: 16px 24px; background-color: #f7fafc; display: flex; justify-content: flex-end; gap: 12px; border-top: 1px solid #e2e8f0; }
	
	.form-row { display: flex; gap: 16px; }
	.form-row .form-group { flex: 1; }
	.form-group { display: flex; flex-direction: column; gap: 6px; }
	label { font-size: 13px; font-weight: 600; color: #4a5568; }
	input, textarea { padding: 10px; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 14px; width: 100%; box-sizing: border-box; }
	textarea { resize: vertical; }

	.cancel-btn { background: white; border: 1px solid #e2e8f0; padding: 8px 16px; border-radius: 6px; cursor: pointer; color: #4a5568; font-weight: 500; }
	.submit-btn { background: #3182ce; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; color: white; font-weight: 600; }
	.submit-btn:disabled { background-color: #cbd5e0; cursor: not-allowed; }
</style>