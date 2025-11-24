<script>
	import { createEventDispatcher } from 'svelte';
	import { storage } from '$lib/firebase';
	import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
	import { UploadCloud, X, Image as ImageIcon } from 'lucide-svelte';

	export let path = 'uploads'; // Storage 저장 경로 폴더명
	export let imageUrl = '';    // 현재 이미지 URL (바인딩됨)
	export let maxWidth = 600;   // 최대 너비

	const dispatch = createEventDispatcher();
	let isUploading = false;
	let fileInput;

	// 이미지 처리 및 업로드 메인 로직
	async function handleFileChange(e) {
		const file = e.target.files[0];
		if (!file) return;

		isUploading = true;

		try {
			// 1. 이미지 압축 및 변환 (avif, max-width 600px)
			const compressedBlob = await compressImage(file);

			// 2. 업로드 (확장자는 .avif로 변경)
			const fileName = file.name.split('.').slice(0, -1).join('.') + '.avif';
			const storageRef = ref(storage, `${path}/${Date.now()}_${fileName}`);
			
			const snapshot = await uploadBytes(storageRef, compressedBlob);
			const url = await getDownloadURL(snapshot.ref);

			// 3. 결과 업데이트
			imageUrl = url;
			dispatch('upload', url); // 부모에게 알림

		} catch (error) {
			console.error('이미지 업로드 실패:', error);
			alert('이미지 처리 중 오류가 발생했습니다.');
		} finally {
			isUploading = false;
			if (fileInput) fileInput.value = ''; // 인풋 초기화
		}
	}

	// Canvas를 이용한 이미지 리사이징 & 변환 함수
	function compressImage(file) {
		return new Promise((resolve, reject) => {
			const reader = new FileReader();
			reader.readAsDataURL(file);
			
			reader.onload = (event) => {
				const img = new Image();
				img.src = event.target.result;
				
				img.onload = () => {
					// 가로 세로 비율 유지하며 리사이징
					let width = img.width;
					let height = img.height;

					if (width > maxWidth) {
						height = Math.round((height * maxWidth) / width);
						width = maxWidth;
					}

					const canvas = document.createElement('canvas');
					canvas.width = width;
					canvas.height = height;

					const ctx = canvas.getContext('2d');
					ctx.drawImage(img, 0, 0, width, height);

					// avif 포맷, 품질 0.8로 변환
					canvas.toBlob((blob) => {
						if (blob) resolve(blob);
						else reject(new Error('Canvas to Blob failed'));
					}, 'image/avif', 0.8);
				};
				
				img.onerror = (err) => reject(err);
			};
			
			reader.onerror = (err) => reject(err);
		});
	}

	function removeImage() {
		imageUrl = '';
		dispatch('remove');
	}
</script>

<div class="uploader-container">
	{#if imageUrl}
		<div class="preview-wrapper">
			<img src={imageUrl} alt="Preview" />
			<button class="remove-btn" on:click={removeImage} type="button">
				<X size={14} />
			</button>
		</div>
	{:else}
		<button 
			class="upload-btn" 
			on:click={() => fileInput.click()} 
			disabled={isUploading}
			type="button"
		>
			{#if isUploading}
				<div class="spinner"></div>
			{:else}
				<UploadCloud size={24} />
				<span>이미지 업로드 (AVIF)</span>
			{/if}
		</button>
	{/if}

	<input 
		type="file" 
		bind:this={fileInput} 
		on:change={handleFileChange} 
		accept="image/*" 
		hidden 
	/>
</div>

<style>
	.uploader-container {
		width: 100%;
		height: 100%;
		min-height: 150px;
		border: 2px dashed #e2e8f0;
		border-radius: 8px;
		background-color: #fafafa;
		display: flex;
		align-items: center;
		justify-content: center;
		overflow: hidden;
		position: relative;
	}

	.upload-btn {
		width: 100%;
		height: 100%;
		background: none;
		border: none;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 8px;
		color: #718096;
		cursor: pointer;
		font-size: 13px;
		min-height: 150px;
	}
	.upload-btn:hover { color: #3182ce; background-color: #f7fafc; }

	.preview-wrapper {
		width: 100%;
		height: 100%;
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
		background-color: #000;
	}
	
	.preview-wrapper img {
		max-width: 100%;
		max-height: 100%;
		object-fit: contain;
	}

	.remove-btn {
		position: absolute;
		top: 8px;
		right: 8px;
		width: 24px;
		height: 24px;
		border-radius: 50%;
		background-color: rgba(0,0,0,0.6);
		color: white;
		border: none;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
	}

	.spinner {
		width: 20px;
		height: 20px;
		border: 2px solid #cbd5e0;
		border-top-color: #3182ce;
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}
	@keyframes spin { to { transform: rotate(360deg); } }
</style>