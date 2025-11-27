<script>
	import { createEventDispatcher } from 'svelte';
	import { modal } from '$lib/stores';
	import { db } from '$lib/firebase';
	import { doc, updateDoc } from 'firebase/firestore';
	import { X } from 'lucide-svelte';
	import ImageUploader from '$lib/components/ImageUploader.svelte';

	export let user = {}; // 수정할 유저 데이터

	const dispatch = createEventDispatcher();
	let isSaving = false;
	let formData = { ...user }; // 사본 생성

	// [추가] 검색 키워드 생성 유틸리티 (Bi-gram)
	function generateSearchKeywords(text) {
		if (!text) return [];
		const keywords = [];
		const cleanText = text.replace(/\s/g, '').toLowerCase(); // 공백 제거 및 소문자
		for (let i = 0; i < cleanText.length - 1; i++) {
			keywords.push(cleanText.substring(i, i + 2));
		}
		return keywords;
	}

	async function save() {
		isSaving = true;
		try {
			const userRef = doc(db, 'users', formData.id);
			
			const updates = {
				nickname: formData.nickname,
				image: formData.image || '',
				job: formData.job || '',
				age: Number(formData.age),
				gender: formData.gender,
				membership: formData.membership,
				status: formData.status,
				// [수정] 검색용 키워드 필드 업데이트
				_searchKeywords: [
					...generateSearchKeywords(formData.nickname),
					...generateSearchKeywords(formData.email?.split('@')[0]) // 이메일 아이디 부분만 인덱싱
				]
			};

			await updateDoc(userRef, updates);
			
			// 부모에게 변경된 데이터 전달
			dispatch('save', { ...formData, ...updates });
			await modal.alert('회원 정보가 수정되었습니다.');
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

<div class="modal-overlay" role="button" tabindex="0" on:click={close} on:keydown={(e) => (e.key === 'Enter' || e.key === ' ') && close()}>
	<div class="modal-content" role="dialog" aria-modal="true" tabindex="0" on:keydown={(e) => e.key === 'Escape' && close()} on:click|stopPropagation>
		<div class="modal-header">
			<h3>회원 정보 수정</h3>
			<button class="close-btn" on:click={close}><X size={20} /></button>
		</div>
		
		<div class="modal-body">
			<div class="form-row">
				<div class="profile-edit-section">
					<div class="uploader-wrapper">
						<ImageUploader 
							path="users" 
							bind:imageUrl={formData.image} 
							objectFit="cover"
						/>
					</div>
				</div>
				<div class="info-edit-section">
					<div class="form-group">
						<label for="user-email">이메일 (수정불가)</label>
						<input id="user-email" type="text" value={formData.email} disabled class="disabled-input" />
					</div>
					<div class="form-group">
						<label for="user-nickname">닉네임</label>
						<input id="user-nickname" type="text" bind:value={formData.nickname} />
					</div>
					<div class="form-group">
						<label for="user-job">직업</label>
						<input id="user-job" type="text" bind:value={formData.job} />
					</div>
				</div>
			</div>

			<div class="form-row three-col">
				<div class="form-group">
					<label for="user-age">나이</label>
					<input id="user-age" type="number" bind:value={formData.age} />
				</div>
				<div class="form-group">
					<label for="user-gender">성별</label>
					<select id="user-gender" bind:value={formData.gender}>
						<option value="M">남성</option>
						<option value="F">여성</option>
					</select>
				</div>
				<div class="form-group">
					<label for="user-membership">멤버십</label>
					<select id="user-membership" bind:value={formData.membership}>
						<option value="Basic">Basic</option>
						<option value="Standard">Standard</option>
						<option value="Pro">Pro</option>
					</select>
				</div>
			</div>

			<div class="form-group">
				<div class="form-label">상태</div>
				<div class="radio-group">
					<label class="radio-label">
						<input type="radio" bind:group={formData.status} value="active" /> 
						<span class="active">정상</span>
					</label>
					<label class="radio-label">
						<input type="radio" bind:group={formData.status} value="suspended" /> 
						<span class="suspended">정지</span>
					</label>
					<label class="radio-label">
						<input type="radio" bind:group={formData.status} value="pending" /> 
						<span class="pending">대기</span>
					</label>
				</div>
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
	.modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%;
		background-color: rgba(0,0,0,0.5); z-index: 9999; display: flex; align-items: center; justify-content: center; }
	.modal-content { background: white; width: 600px; max-height: 90vh; border-radius: 12px;
		display: flex; flex-direction: column; box-shadow: 0 10px 25px rgba(0,0,0,0.2); overflow: hidden; }
	.modal-header { padding: 16px 24px; border-bottom: 1px solid #e2e8f0;
		display: flex; justify-content: space-between; align-items: center; }
	.modal-header h3 { margin: 0; font-size: 18px; color: #2d3748; }
	.close-btn { background: none;
		border: none; cursor: pointer; color: #a0aec0; }
	.modal-body { padding: 24px; display: flex; flex-direction: column; gap: 20px; overflow-y: auto;
	}
	.modal-footer { padding: 16px 24px; background-color: #f7fafc; display: flex; justify-content: flex-end; gap: 12px; border-top: 1px solid #e2e8f0;
	}
	
	.form-row { display: flex; gap: 20px; }
	.three-col .form-group { flex: 1; }
	.profile-edit-section { width: 120px; flex-shrink: 0;
	}
	.uploader-wrapper { height: 120px; width: 120px; border-radius: 12px; overflow: hidden; }
	.info-edit-section { flex: 1; display: flex; flex-direction: column; gap: 12px;
	}
	.form-group { display: flex; flex-direction: column; gap: 6px; }
	label { font-size: 13px; font-weight: 600; color: #4a5568;
	}
	input, select { padding: 10px; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 14px; width: 100%; box-sizing: border-box;
	}
	.disabled-input { background-color: #f7fafc; color: #a0aec0; cursor: not-allowed; }
	
	.radio-group { 
		display: flex; 
		gap: 20px;
		padding-top: 4px; 
		align-items: center;
	}
	.radio-label { 
		display: flex; 
		align-items: center; 
		gap: 6px; 
		cursor: pointer; 
		font-size: 14px;
		margin: 0;
	}
	.radio-label .active { color: #48bb78; font-weight: 600; min-width: 30px;}
	.radio-label .suspended { color: #e53e3e; font-weight: 600;
		min-width: 30px;}
	.radio-label .pending { color: #ed8936; font-weight: 600; min-width: 30px;}

	.cancel-btn { background: white; border: 1px solid #e2e8f0; padding: 8px 16px;
		border-radius: 6px; cursor: pointer; color: #4a5568; font-weight: 500; }
	.submit-btn { background: #3182ce; border: none; padding: 8px 16px; border-radius: 6px;
		cursor: pointer; color: white; font-weight: 600; }
	.submit-btn:disabled { background-color: #cbd5e0; cursor: not-allowed; }
</style>