<script>
	import { onMount } from 'svelte';
	import { db } from '$lib/firebase';
	import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
	import { Save, Type, Layers, Smartphone, Palette, Hash, Plus, X, Award } from 'lucide-svelte';
	import ImageUploader from '$lib/components/ImageUploader.svelte';

	let settings = {
		logoText: '대화의 장',
		sliderLimit: 5,
		splashImage: '',
		splashBgColor: '#ffffff',
		headerFooterBg: '#ffffff',
		appBg: '#ffffff',
		interestTags: [],
		reviewBadges: [] // [추가] 뱃지 목록
	};

	// 태그 입력 상태
	let newTag = '';

	// [추가] 뱃지 입력 상태
	let newBadge = {
		text: '',
		color: '#e3f2fd',
		textColor: '#1976d2'
	};

	let isLoading = true;
	let isSaving = false;

	onMount(async () => {
		try {
			const docRef = doc(db, 'settings', 'global');
			const docSnap = await getDoc(docRef);
			if (docSnap.exists()) {
				const data = docSnap.data();
				settings = { 
					...settings, 
					...data,
					interestTags: data.interestTags || [],
					reviewBadges: data.reviewBadges || [] // DB에서 불러오기
				};
			} else {
				await setDoc(docRef, settings);
			}
		} catch (error) {
			console.error('설정 로드 실패:', error);
		} finally {
			isLoading = false;
		}
	});

	// --- 태그 관련 함수 ---
	function addTag() {
		const tag = newTag.trim();
		if (!tag) return;
		if (settings.interestTags.includes(tag)) return alert('이미 존재하는 태그입니다.');
		settings.interestTags = [...settings.interestTags, tag];
		newTag = '';
	}

	function removeTag(tagToRemove) {
		settings.interestTags = settings.interestTags.filter(t => t !== tagToRemove);
	}

	function handleTagKeydown(e) {
		if (e.key === 'Enter' && !e.isComposing) {
			e.preventDefault();
			addTag();
		}
	}

	// --- [추가] 뱃지 관련 함수 ---
	function addBadge() {
		if (!newBadge.text.trim()) return alert('뱃지 문구를 입력해주세요.');
		
		const badgeToAdd = {
			id: Date.now().toString(), // 고유 ID 생성
			text: newBadge.text.trim(),
			color: newBadge.color,
			textColor: newBadge.textColor
		};

		settings.reviewBadges = [...settings.reviewBadges, badgeToAdd];
		
		// 입력 초기화 (색상은 유지하거나 초기화)
		newBadge.text = '';
	}

	function removeBadge(badgeId) {
		settings.reviewBadges = settings.reviewBadges.filter(b => b.id !== badgeId);
	}

	function handleBadgeKeydown(e) {
		if (e.key === 'Enter' && !e.isComposing) {
			e.preventDefault();
			addBadge();
		}
	}

	async function saveSettings() {
		isSaving = true;
		try {
			const docRef = doc(db, 'settings', 'global');
			await updateDoc(docRef, settings);
			alert('설정이 저장되었습니다.');
		} catch (error) {
			console.error('저장 실패:', error);
			alert('저장 중 오류가 발생했습니다.');
		} finally {
			isSaving = false;
		}
	}
</script>

<div class="settings-container">
	<div class="header">
		<h2>일반 설정</h2>
		<button class="save-btn" on:click={saveSettings} disabled={isSaving}>
			<Save size={18} />
			{isSaving ? '저장 중...' : '변경사항 저장'}
		</button>
	</div>

	{#if isLoading}
		<div class="loading">설정을 불러오는 중...</div>
	{:else}
		<div class="settings-grid">
			
			<div class="card">
				<div class="card-header">
					<Hash size={20} color="#4a5568" />
					<h3>관심사 태그 관리</h3>
				</div>
				<div class="input-group">
					<label for="tagInput">태그 추가</label>
					<div class="row-input-box">
						<input 
							type="text" 
							id="tagInput" 
							placeholder="태그 입력 후 엔터" 
							bind:value={newTag}
							on:keydown={handleTagKeydown}
						/>
						<button class="add-btn" on:click={addTag}>
							<Plus size={20} />
						</button>
					</div>
				</div>
				<div class="items-wrapper">
					{#if settings.interestTags.length > 0}
						{#each settings.interestTags as tag}
							<div class="tag-chip">
								<span>{tag}</span>
								<button class="remove-btn" on:click={() => removeTag(tag)}>
									<X size={12} />
								</button>
							</div>
						{/each}
					{:else}
						<p class="empty-text">등록된 태그가 없습니다.</p>
					{/if}
				</div>
			</div>

			<div class="card">
				<div class="card-header">
					<Award size={20} color="#4a5568" />
					<h3>대화평 뱃지 관리</h3>
				</div>
				
				<div class="input-group">
					<label>새 뱃지 만들기</label>
					<div class="badge-creator">
						<div class="row-input-box">
							<input 
								type="text" 
								placeholder="뱃지 문구 (예: 👂 경청왕)" 
								bind:value={newBadge.text}
								on:keydown={handleBadgeKeydown}
							/>
						</div>
						<div class="color-selectors">
							<div class="cp-mini">
								<span>배경</span>
								<input type="color" bind:value={newBadge.color} />
							</div>
							<div class="cp-mini">
								<span>글자</span>
								<input type="color" bind:value={newBadge.textColor} />
							</div>
							<button class="add-btn badge-add" on:click={addBadge}>
								추가
							</button>
						</div>
					</div>
					<div class="preview-row">
						<span class="preview-label">미리보기:</span>
						<span 
							class="badge-preview" 
							style="background-color: {newBadge.color}; color: {newBadge.textColor};"
						>
							{newBadge.text || '뱃지 문구'}
						</span>
					</div>
				</div>

				<div class="items-wrapper">
					{#if settings.reviewBadges.length > 0}
						{#each settings.reviewBadges as badge (badge.id)}
							<div class="badge-item">
								<span 
									class="badge-chip" 
									style="background-color: {badge.color}; color: {badge.textColor};"
								>
									{badge.text}
								</span>
								<button class="remove-btn badge-remove" on:click={() => removeBadge(badge.id)}>
									<X size={12} />
								</button>
							</div>
						{/each}
					{:else}
						<p class="empty-text">등록된 뱃지가 없습니다.</p>
					{/if}
				</div>
			</div>

			<div class="card">
				<div class="card-header">
					<Palette size={20} color="#4a5568" />
					<h3>디자인 테마</h3>
				</div>
				<div class="input-group">
					<label for="headerFooterBg">헤더 & 푸터 배경색</label>
					<div class="color-picker-box">
						<input type="color" id="headerFooterBg" bind:value={settings.headerFooterBg} />
						<span class="color-code">{settings.headerFooterBg}</span>
					</div>
				</div>
				<div class="input-group">
					<label for="appBg">메인 화면 배경색</label>
					<div class="color-picker-box">
						<input type="color" id="appBg" bind:value={settings.appBg} />
						<span class="color-code">{settings.appBg}</span>
					</div>
				</div>
			</div>

			<div class="card">
				<div class="card-header">
					<Type size={20} color="#4a5568" />
					<h3>헤더 텍스트</h3>
				</div>
				<div class="input-group">
					<label for="logoText">로고 텍스트</label>
					<input type="text" id="logoText" bind:value={settings.logoText} />
				</div>
			</div>

			<div class="card">
				<div class="card-header">
					<Layers size={20} color="#4a5568" />
					<h3>메인 컨텐츠</h3>
				</div>
				<div class="input-group">
					<label for="sliderLimit">슬라이더 표시 개수</label>
					<input type="number" id="sliderLimit" bind:value={settings.sliderLimit} min="1" max="10" />
				</div>
			</div>

			<div class="card">
				<div class="card-header">
					<Smartphone size={20} color="#4a5568" />
					<h3>스플래시 화면</h3>
				</div>
				<div class="input-group">
					<label>스플래시 이미지</label>
					<div class="uploader-wrapper">
						<ImageUploader 
							path="settings" 
							bind:imageUrl={settings.splashImage} 
						/>
					</div>
					<p class="hint">자동으로 AVIF 포맷으로 변환되며 가로 600px로 리사이징됩니다.</p>
				</div>
				<div class="input-group">
					<label for="splashBgColor">배경 색상</label>
					<div class="color-picker-box">
						<input type="color" id="splashBgColor" bind:value={settings.splashBgColor} />
						<span class="color-code">{settings.splashBgColor}</span>
					</div>
				</div>
			</div>
		</div>
	{/if}
</div>

<style>
	.settings-container { max-width: 800px; margin: 0 auto; }
	.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
	.header h2 { margin: 0; font-size: 24px; color: #2d3748; }
	.save-btn { display: flex; align-items: center; gap: 8px; background-color: #3182ce;
		color: white; border: none; padding: 10px 20px; border-radius: 8px; font-weight: 600; cursor: pointer; transition: background 0.2s; }
	.save-btn:hover { background-color: #2b6cb0; }
	.save-btn:disabled { background-color: #cbd5e0; cursor: not-allowed; }
	
	.settings-grid { display: grid; gap: 24px; }
	.card { background: white; border-radius: 12px; padding: 24px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
	.card-header { display: flex; align-items: center; gap: 10px; margin-bottom: 20px; padding-bottom: 12px; border-bottom: 1px solid #e2e8f0; }
	.card-header h3 { margin: 0; font-size: 16px; color: #2d3748; }
	
	.input-group { margin-bottom: 16px; }
	.input-group:last-child { margin-bottom: 0; }
	.input-group label { display: block; font-size: 14px; font-weight: 600; color: #4a5568; margin-bottom: 8px; }
	.input-group input[type="text"], .input-group input[type="number"] { width: 100%; padding: 10px; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 14px; box-sizing: border-box; }
	
	/* 공통 입력 박스 스타일 */
	.row-input-box { display: flex; gap: 8px; width: 100%; }
	.add-btn { background-color: #edf2f7; border: 1px solid #e2e8f0; border-radius: 6px; width: 42px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #4a5568; flex-shrink: 0; }
	.add-btn:hover { background-color: #e2e8f0; }
	
	/* 아이템 목록 영역 */
	.items-wrapper { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 16px; padding: 16px; background-color: #f7fafc; border-radius: 8px; min-height: 60px; }
	.empty-text { font-size: 13px; color: #a0aec0; margin: 0; width: 100%; text-align: center; line-height: 28px; }

	/* 태그 칩 */
	.tag-chip { display: flex; align-items: center; gap: 6px; background-color: white; border: 1px solid #e2e8f0; padding: 6px 10px; border-radius: 20px; font-size: 13px; color: #2d3748; font-weight: 500; }
	.remove-btn { background: none; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; padding: 2px; color: #a0aec0; border-radius: 50%; }
	.remove-btn:hover { background-color: #edf2f7; color: #e53e3e; }

	/* 뱃지 생성기 */
	.badge-creator { display: flex; flex-direction: column; gap: 10px; margin-bottom: 12px; }
	.color-selectors { display: flex; gap: 16px; align-items: center; }
	.cp-mini { display: flex; align-items: center; gap: 6px; font-size: 12px; color: #718096; }
	.cp-mini input { width: 40px; height: 30px; padding: 0; border: 1px solid #e2e8f0; cursor: pointer; background: none; border-radius: 4px; }
	.badge-add { width: auto; padding: 0 16px; height: 32px; font-size: 13px; font-weight: 600; margin-left: auto; background-color: #3182ce; color: white; border: none; }
	.badge-add:hover { background-color: #2b6cb0; }

	.preview-row { display: flex; align-items: center; gap: 10px; font-size: 13px; color: #718096; margin-top: 4px; }
	.badge-preview { padding: 6px 12px; border-radius: 8px; font-weight: 600; font-size: 13px; border: 1px solid rgba(0,0,0,0.05); }

	/* 뱃지 아이템 */
	.badge-item { display: flex; align-items: center; background: white; padding: 4px; border-radius: 8px; border: 1px solid #e2e8f0; }
	.badge-chip { padding: 6px 12px; border-radius: 6px; font-size: 13px; font-weight: 600; }
	.badge-remove { margin-left: 4px; padding: 6px; }

	.hint { font-size: 12px; color: #718096; margin-top: 6px; }
	.color-picker-box { display: flex; align-items: center; gap: 12px; }
	.color-code { font-family: monospace; color: #4a5568; }
	.loading { text-align: center; padding: 40px; color: #718096; }
	.uploader-wrapper { height: 200px; }
</style>