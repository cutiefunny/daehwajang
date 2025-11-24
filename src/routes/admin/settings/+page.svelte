<script>
	import { onMount } from 'svelte';
	import { db } from '$lib/firebase';
	import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
	import { Save, Type, Layers, Smartphone, Palette } from 'lucide-svelte';
	import ImageUploader from '$lib/components/ImageUploader.svelte'; // [추가]

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
	/* 스타일은 기존과 거의 동일하며, 불필요해진 부분만 제거했습니다 */
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
	.color-picker-box { display: flex; align-items: center; gap: 12px; }
	.color-code { font-family: monospace; color: #4a5568; }
	.loading { text-align: center; padding: 40px; color: #718096; }
	
	/* 업로더 영역 높이 고정 */
	.uploader-wrapper { height: 200px; }
</style>