<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { user, modal } from '$lib/stores';
	import { db } from '$lib/firebase';
	import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
	import { ArrowLeft, Calendar, MapPin, AlignLeft, Type, Grid } from 'lucide-svelte';
	import ImageUploader from '$lib/components/ImageUploader.svelte';

	let isSubmitting = false;
	
	// 폼 데이터 초기값
	let formData = {
		title: '',
		category: '소셜',
		date: '',
		location: '',
		description: '',
		image: ''
	};

	// 로그인 체크
	onMount(async () => {
		if (!$user) {
			await modal.alert('모임을 개설하려면 로그인이 필요합니다.');
			goto('/login');
		}
	});

	function goBack() {
		history.back();
	}

	// 모임 개설하기
	async function handleSubmit() {
		// 1. 유효성 검사
		if (!formData.title.trim()) return await modal.alert('모임 이름을 입력해주세요.');
		if (!formData.date) return await modal.alert('모임 일시를 선택해주세요.');
		if (!formData.location.trim()) return await modal.alert('모임 장소를 입력해주세요.');
		if (!formData.image) return await modal.alert('대표 이미지를 업로드해주세요.');
		if (!$user) return await modal.alert('로그인 정보가 없습니다.');

		if (!confirm('이대로 모임을 개설하시겠습니까?')) return;

		isSubmitting = true;

		try {
			// 2. Firestore에 저장
			const meetingData = {
				title: formData.title,
				image: formData.image,
				category: formData.category,
				date: new Date(formData.date).toISOString(), // ISO 문자열로 변환
				location: formData.location,
				description: formData.description,
				
				// 호스트 정보 (현재 로그인한 유저)
				hostId: $user.uid,
				hostName: $user.displayName || '익명 호스트',
				hostImage: $user.photoURL || '',
				
				createdAt: serverTimestamp(),
				status: 'upcoming' // 기본 상태
			};

			const docRef = await addDoc(collection(db, 'meetings'), meetingData);
			
			await modal.alert('모임이 성공적으로 개설되었습니다!');
			// 3. 생성된 모임 상세 페이지로 이동
			goto(`/meetings/${docRef.id}`);

		} catch (error) {
			console.error('모임 생성 실패:', error);
			await modal.alert('모임 개설 중 오류가 발생했습니다.');
		} finally {
			isSubmitting = false;
		}
	}
</script>

<div class="page-container">
	<header class="header">
		<button class="back-btn" on:click={goBack}>
			<ArrowLeft size={24} />
		</button>
		<h1 class="page-title">새 모임 만들기</h1>
		<div style="width: 24px;"></div> </header>

	<div class="content-body">
		<div class="section image-section">
			<label class="section-label">대표 이미지</label>
			<div class="uploader-wrapper">
				<ImageUploader 
					path="meetings" 
					bind:imageUrl={formData.image} 
					objectFit="cover" 
				/>
			</div>
			<p class="hint">모임의 분위기를 잘 나타내는 사진을 올려주세요.</p>
		</div>

		<div class="section">
			<div class="input-group">
				<label>
					<Type size={16} /> 모임 이름
				</label>
				<input 
					type="text" 
					placeholder="예: 주말 한강 러닝, 퇴근 후 독서 모임" 
					bind:value={formData.title} 
				/>
			</div>

			<div class="input-group">
				<label>
					<Grid size={16} /> 카테고리
				</label>
				<select bind:value={formData.category}>
					<option value="소셜">👋 소셜/네트워킹</option>
					<option value="취미">🎨 취미/원데이</option>
					<option value="운동">🏃 운동/액티비티</option>
					<option value="독서">📚 독서/스터디</option>
					<option value="여행">✈️ 여행/나들이</option>
					<option value="기타">🎸 기타</option>
				</select>
			</div>
		</div>

		<div class="section">
			<div class="input-group">
				<label>
					<Calendar size={16} /> 일시
				</label>
				<input 
					type="datetime-local" 
					bind:value={formData.date} 
				/>
			</div>

			<div class="input-group">
				<label>
					<MapPin size={16} /> 장소
				</label>
				<input 
					type="text" 
					placeholder="예: 강남역 11번 출구, 스타벅스 사당점" 
					bind:value={formData.location} 
				/>
			</div>
		</div>

		<div class="section">
			<div class="input-group">
				<label>
					<AlignLeft size={16} /> 상세 설명
				</label>
				<textarea 
					rows="6" 
					placeholder="모임에 대한 자세한 설명을 적어주세요.&#13;&#10;(진행 방식, 준비물, 회비 등)"
					bind:value={formData.description}
				></textarea>
			</div>
		</div>
	</div>

	<div class="bottom-bar">
		<button class="submit-btn" on:click={handleSubmit} disabled={isSubmitting}>
			{isSubmitting ? '개설하는 중...' : '모임 개설하기'}
		</button>
	</div>
</div>

<style>
	.page-container {
		background-color: #fff;
		min-height: 100vh;
		display: flex;
		flex-direction: column;
		position: relative;
		padding-bottom: 80px; /* 하단 바 공간 확보 */
	}

	.header {
		height: 56px;
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0 16px;
		border-bottom: 1px solid #f0f0f0;
		background-color: white;
		position: sticky;
		top: 0;
		z-index: 10;
	}

	.back-btn {
		background: none;
		border: none;
		cursor: pointer;
		padding: 4px;
		color: #333;
	}

	.page-title {
		font-size: 18px;
		font-weight: bold;
		margin: 0;
		color: #1a1a1a;
	}

	.content-body {
		padding: 24px 20px;
		display: flex;
		flex-direction: column;
		gap: 32px;
	}

	.section-label {
		font-size: 14px;
		font-weight: bold;
		color: #1a1a1a;
		margin-bottom: 12px;
		display: block;
	}

	.uploader-wrapper {
		width: 100%;
		height: 200px;
		border-radius: 12px;
		overflow: hidden;
		background-color: #f9f9f9;
	}

	.hint {
		font-size: 12px;
		color: #888;
		margin-top: 8px;
	}

	.input-group {
		display: flex;
		flex-direction: column;
		gap: 8px;
		margin-bottom: 20px;
	}

	.input-group:last-child {
		margin-bottom: 0;
	}

	.input-group label {
		font-size: 14px;
		font-weight: 600;
		color: #4a5568;
		display: flex;
		align-items: center;
		gap: 6px;
	}

	input, select, textarea {
		padding: 12px 14px;
		border: 1px solid #e2e8f0;
		border-radius: 8px;
		font-size: 15px;
		width: 100%;
		box-sizing: border-box;
		background-color: #fff;
		outline: none;
		transition: border-color 0.2s;
	}

	input:focus, select:focus, textarea:focus {
		border-color: #3182ce;
	}

	textarea {
		resize: none;
		line-height: 1.5;
	}

	.bottom-bar {
		position: fixed;
		bottom: 0;
		left: 0;
		right: 0;
		max-width: 600px; /* 앱 레이아웃 width */
		margin: 0 auto;
		background-color: white;
		padding: 16px 20px;
		border-top: 1px solid #f0f0f0;
		z-index: 20;
	}

	.submit-btn {
		width: 100%;
		padding: 16px;
		border-radius: 12px;
		font-size: 16px;
		font-weight: bold;
		border: none;
		cursor: pointer;
		background-color: #3182ce;
		color: white;
		transition: background-color 0.2s;
	}

	.submit-btn:disabled {
		background-color: #cbd5e0;
		cursor: not-allowed;
	}

	.submit-btn:active:not(:disabled) {
		background-color: #2b6cb0;
	}
</style>