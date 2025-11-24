<script>
	import { onMount } from 'svelte';
	import { db, storage } from '$lib/firebase'; // storage 추가
	import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
	import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'; // Storage 관련 함수 추가
	import { Save, Image, Type, Layers, Smartphone, Palette, UploadCloud } from 'lucide-svelte';

	let settings = {
		logoText: '대화의 장',
		sliderLimit: 5,
		splashImage: '',
		splashBgColor: '#ffffff',
		headerFooterBg: '#ffffff',
		appBg: '#ffffff'
	};

	let isLoading = true;
	let isSaving = false;
	let isUploading = false; // 업로드 상태
	let fileInput; // 파일 인풋 참조

	onMount(async () => {
		try {
			const docRef = doc(db, 'settings', 'global');
			const docSnap = await getDoc(docRef);

			if (docSnap.exists()) {
				settings = { ...settings, ...docSnap.data() };
			} else {
				await setDoc(docRef, settings);
			}
		} catch (error) {
			console.error('설정 로드 실패:', error);
		} finally {
			isLoading = false;
		}
	});

	// 파일 선택 창 열기
	function triggerFileUpload() {
		fileInput.click();
	}

	// 파일 선택 및 업로드 처리
	async function handleFileChange(e) {
		const file = e.target.files[0];
		if (!file) return;

		isUploading = true;
		try {
			// 1. Storage 참조 생성 (파일명 중복 방지를 위해 타임스탬프 추가)
			const storageRef = ref(storage, `settings/splash_${Date.now()}_${file.name}`);
			
			// 2. 파일 업로드
			const snapshot = await uploadBytes(storageRef, file);
			
			// 3. 다운로드 URL 가져오기
			const url = await getDownloadURL(snapshot.ref);
			
			// 4. 설정 상태 업데이트
			settings.splashImage = url;
			
		} catch (error) {
			console.error('업로드 실패:', error);
			alert('이미지 업로드 중 오류가 발생했습니다.');
		} finally {
			isUploading = false;
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

<input 
	type="file" 
	bind:this={fileInput} 
	on:change={handleFileChange} 
	accept="image/*" 
	style="display: none;" 
/>

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
					<label for="splashImage">이미지</label>
					<div class="url-input-box">
						<input 
							type="text" 
							id="splashImage" 
							bind:value={settings.splashImage} 
							placeholder="이미지를 업로드하세요" 
							readonly 
						/>
						<button 
							class="icon-btn upload-btn" 
							on:click={triggerFileUpload} 
							disabled={isUploading}
							title="이미지 업로드"
						>
							{#if isUploading}
								<div class="spinner"></div>
							{:else}
								<UploadCloud size={18} />
							{/if}
						</button>
					</div>
					<p class="hint">권장 사이즈: 400x800px 이상</p>
				</div>
				<div class="input-group">
					<label for="splashBgColor">배경 색상</label>
					<div class="color-picker-box">
						<input type="color" id="splashBgColor" bind:value={settings.splashBgColor} />
						<span class="color-code">{settings.splashBgColor}</span>
					</div>
				</div>
				
				<div class="preview-box" style="background-color: {settings.splashBgColor};">
					<span class="preview-label">Preview</span>
					{#if settings.splashImage}
						<img src={settings.splashImage} alt="Splash Preview" />
					{:else}
						<span class="no-image">이미지 없음</span>
					{/if}
				</div>
			</div>
		</div>
	{/if}
</div>

<style>
	.settings-container { max-width: 800px; margin: 0 auto; }
	.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
	.header h2 { margin: 0; font-size: 24px; color: #2d3748; }
	.save-btn { display: flex; align-items: center; gap: 8px; background-color: #3182ce; color: white; border: none; padding: 10px 20px; border-radius: 8px; font-weight: 600; cursor: pointer; transition: background 0.2s; }
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
	.hint { font-size: 12px; color: #718096; margin-top: 6px; }
	
	.url-input-box { display: flex; gap: 8px; }
	.icon-btn { background: #edf2f7; border: none; padding: 0 12px; border-radius: 6px; cursor: pointer; color: #4a5568; display: flex; align-items: center; justify-content: center; }
	.upload-btn:hover { background-color: #e2e8f0; }
	
	.color-picker-box { display: flex; align-items: center; gap: 12px; }
	.color-code { font-family: monospace; color: #4a5568; }
	.loading { text-align: center; padding: 40px; color: #718096; }

	.preview-box {
		margin-top: 16px;
		height: 200px; /* 미리보기 높이 증가 */
		border-radius: 8px;
		border: 1px dashed #cbd5e0;
		display: flex;
		align-items: center;
		justify-content: center;
		position: relative;
		overflow: hidden;
	}
	.preview-box img {
		max-width: 100%;
		max-height: 100%;
		object-fit: contain;
	}
	.preview-label {
		position: absolute; top: 8px; left: 8px; font-size: 10px;
		background: rgba(0,0,0,0.5); color: white; padding: 2px 6px; border-radius: 4px;
	}
	.no-image { color: #a0aec0; font-size: 14px; }

	/* 로딩 스피너 */
	.spinner {
		width: 18px; height: 18px;
		border: 2px solid #cbd5e0;
		border-top-color: #4299e1;
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}
	@keyframes spin { to { transform: rotate(360deg); } }
</style>