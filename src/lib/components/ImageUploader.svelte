<script>
	import { createEventDispatcher } from 'svelte';
	import { storage } from '$lib/firebase';
	import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
	import { UploadCloud, X, Image as ImageIcon } from 'lucide-svelte';

	export let path = 'uploads'; 
	export let imageUrl = '';    
	export let maxWidth = 600;
	
	// 이미지를 꽉 채울지(cover), 다 보여줄지(contain) 결정하는 옵션
	export let objectFit = 'contain'; 

	const dispatch = createEventDispatcher();
	let isUploading = false;
	let fileInput;

	async function handleFileChange(e) {
		const file = e.target.files[0];
		if (!file) return;

		isUploading = true;

		try {
			const compressedBlob = await compressImage(file);
			const fileName = file.name.split('.').slice(0, -1).join('.') + '.avif';
			const storageRef = ref(storage, `${path}/${Date.now()}_${fileName}`);
			
			const snapshot = await uploadBytes(storageRef, compressedBlob);
			const url = await getDownloadURL(snapshot.ref);

			imageUrl = url;
			dispatch('upload', url);

		} catch (error) {
			console.error('이미지 업로드 실패:', error);
			alert('이미지 처리 중 오류가 발생했습니다.');
		} finally {
			isUploading = false;
			if (fileInput) fileInput.value = '';
		}
	}

	function compressImage(file) {
		return new Promise((resolve, reject) => {
			const reader = new FileReader();
			reader.readAsDataURL(file);
			
			reader.onload = (event) => {
				const img = new Image();
				img.src = event.target.result;
				
				img.onload = () => {
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
		<div class="preview-wrapper" style:background-color={objectFit === 'cover' ? '#fff' : '#000'}>
			<img src={imageUrl} alt="Preview" style:object-fit={objectFit} />
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
				<span>사진 업로드</span>
			{/if} </button>
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
		min-height: 100%; /* 높이 강제 조정 */
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
		font-size: 12px;
	}
	.upload-btn:hover { color: #3182ce; background-color: #f7fafc; }

	.preview-wrapper {
		width: 100%;
		height: 100%;
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	
	.preview-wrapper img {
		width: 100%;
		height: 100%;
	}

	.remove-btn {
		position: absolute;
		top: 4px;
		right: 4px;
		width: 20px;
		height: 20px;
		border-radius: 50%;
		background-color: rgba(0,0,0,0.6);
		color: white;
		border: none;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		z-index: 10;
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