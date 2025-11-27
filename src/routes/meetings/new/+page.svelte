<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { user, modal } from '$lib/stores';
	import { db } from '$lib/firebase';
	import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
	// [수정] 카테고리 및 디자인용 아이콘 추가 임포트
	import { 
		ArrowLeft, Calendar, MapPin, AlignLeft, Type, Grid, Search, Users, Banknote, Info,
		MessageCircle, Palette, Dumbbell, BookOpen, Plane, MoreHorizontal 
	} from 'lucide-svelte';
	import ImageUploader from '$lib/components/ImageUploader.svelte';
	import { fade, slide } from 'svelte/transition';

	const NAVER_CLIENT_ID = import.meta.env.VITE_NAVER_MAPS_CLIENT_ID;

	let isSubmitting = false;
	// 폼 데이터 초기값
	let formData = {
		title: '',
		category: '소셜',
		date: '',
		location: '',
		description: '',
		image: '',
		maxParticipants: 4,
		cost: ''
	};
	// [추가] 카테고리 데이터 정의 (아이콘 매핑)
	const categories = [
		{ value: '소셜', label: '소셜', icon: MessageCircle, color: '#4299e1' },
		{ value: '취미', label: '취미', icon: Palette, color: '#ed8936' },
		{ value: '운동', label: '운동', icon: Dumbbell, color: '#48bb78' },
		{ value: '독서', label: '독서', icon: BookOpen, color: '#9f7aea' },
		{ value: '여행', label: '여행', icon: Plane, color: '#0bc5ea' },
		{ value: '기타', label: '기타', icon: MoreHorizontal, color: '#718096' }
	];
	// 지도 관련 상태
	let mapElement;
	let mapObject;
	let markerObject;
	let isMapVisible = false;

	// 툴팁 상태
	let showCostInfo = false;
	onMount(async () => {
		if (!$user) {
			await modal.alert('모임을 개설하려면 로그인이 필요합니다.');
			goto('/login');
		}
	});

	// [추가] 검색 키워드 생성 유틸리티
	function generateSearchKeywords(text) {
		if (!text) return [];
		const keywords = [];
		const cleanText = text.replace(/\s/g, '').toLowerCase();
		for (let i = 0; i < cleanText.length - 1; i++) {
			keywords.push(cleanText.substring(i, i + 2));
		}
		return keywords;
	}

	function goBack() {
		history.back();
	}

	// 주소 검색
	function searchLocation() {
		if (!formData.location.trim()) return modal.alert('주소를 입력해주세요.');
		if (!window.naver) return modal.alert('지도 서비스를 로드하는 중입니다. 잠시 후 다시 시도해주세요.');
		window.naver.maps.Service.geocode({ query: formData.location }, (status, response) => {
			if (status !== window.naver.maps.Service.Status.OK) {
				return modal.alert('주소 검색에 실패했습니다.');
			}

			const result = response.v2.addresses[0];
			if (!result) {
				return modal.alert('검색 결과가 없습니다. 도로명 주소나 지번 주소로 다시 시도해주세요.');
			}

			const foundAddress = result.roadAddress || result.jibunAddress;
			formData.location = foundAddress;
			
			const point = new window.naver.maps.LatLng(result.y, result.x);
			isMapVisible = true;

			if (!mapObject) {
				mapObject = new window.naver.maps.Map(mapElement, {
					center: point,
					zoom: 15
				});
			} else {
				mapObject.setCenter(point);
			}

			if (markerObject) {
				markerObject.setPosition(point);
			} else {
				markerObject = new window.naver.maps.Marker({
					position: point,
					map: mapObject
				});
			}
		});
	}

	// 모임 개설하기
	async function handleSubmit() {
		if (!formData.title.trim()) return await modal.alert('모임 이름을 입력해주세요.');
		if (!formData.date) return await modal.alert('모임 일시를 선택해주세요.');
		if (!formData.location.trim()) return await modal.alert('모임 장소를 입력해주세요.');
		if (!formData.image) return await modal.alert('대표 이미지를 업로드해주세요.');
		if (formData.maxParticipants < 2) return await modal.alert('모집 인원은 최소 2명 이상이어야 합니다.');
		
		if (!$user) return await modal.alert('로그인 정보가 없습니다.');
		if (!confirm('이대로 모임을 개설하시겠습니까?')) return;

		isSubmitting = true;

		try {
			const meetingData = {
				title: formData.title,
				image: formData.image,
				category: formData.category,
				date: new Date(formData.date).toISOString(),
				location: formData.location,
				description: formData.description,
				maxParticipants: Number(formData.maxParticipants),
				cost: formData.cost.trim() || '무료',
				hostId: $user.uid,
				hostName: $user.displayName || '익명 호스트',
				hostImage: $user.photoURL || '',
				createdAt: serverTimestamp(),
				status: 'upcoming',
				// [수정] 검색 키워드 추가
				_searchKeywords: [
					...generateSearchKeywords(formData.title),
					...generateSearchKeywords(formData.location)
				]
			};

			const docRef = await addDoc(collection(db, 'meetings'), meetingData);
			await modal.alert('모임이 성공적으로 개설되었습니다!');
			goto(`/meetings/${docRef.id}`);

		} catch (error) {
			console.error('모임 생성 실패:', error);
			await modal.alert('모임 개설 중 오류가 발생했습니다.');
		} finally {
			isSubmitting = false;
		}
	}
</script>

<svelte:head>
	<script type="text/javascript" src="https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId={NAVER_CLIENT_ID}&submodules=geocoder"></script>
</svelte:head>

<div class="page-container">
	<header class="header">
		<button class="back-btn" on:click={goBack}>
			<ArrowLeft size={24} />
		</button>
		<h1 class="page-title">새 모임 만들기</h1>
		<div style="width: 24px;"></div>
	</header>

	<div class="content-body">
		<div class="section image-section">
			<div class="uploader-wrapper">
				<ImageUploader 
					path="meetings" 
					bind:imageUrl={formData.image} 
					objectFit="cover" 
				/>
				{#if !formData.image}
					<div class="image-placeholder-text">
						대표 이미지를 등록해주세요
					</div>
				{/if}
			</div>
		</div>

		<div class="section">
			<div class="input-group">
				<label>
					<Type size={16} /> 모임 이름
				</label>
				<input 
					type="text" 
					class="input-field title-input"
					placeholder="모임 이름을 입력해주세요" 
					bind:value={formData.title} 
				/>
			</div>

			<div class="input-group">
				<label>
					<Grid size={16} /> 카테고리
				</label>
				<div class="category-grid">
					{#each categories as cat}
						<button 
							type="button"
							class="category-card" 
							class:selected={formData.category === cat.value}
							on:click={() => formData.category = cat.value}
						>
							<div 
								class="cat-icon" 
								style="background-color: {formData.category === cat.value ?
								cat.color : '#f7fafc'}; color: {formData.category === cat.value ? '#fff' : cat.color}"
							>
								<svelte:component this={cat.icon} size={20} />
							</div>
							<span class="cat-label">{cat.label}</span>
						</button>
					{/each}
				</div>
			</div>
		</div>

		<div class="section">
			<div class="form-row">
				<div class="input-group half">
					<label>
						<Users size={16} /> 모집 인원
					</label>
					<div class="number-input-wrapper">
						<input 
							type="number" 
							min="2" 
							max="100"
							class="input-field"
							bind:value={formData.maxParticipants} 
						/>
						<span class="unit">명</span>
					</div>
				</div>
				<div class="input-group half">
					<label class="label-with-tooltip">
						<div class="label-content">
							<Banknote size={16} /> 참가비
						</div>
						<div class="tooltip-wrapper">
							<button 
								type="button" 
								class="info-icon" 
								on:click={() => showCostInfo = !showCostInfo}
								on:blur={() => setTimeout(() => showCostInfo = false, 200)} 
							>
								<Info size={14} />
							</button>
							{#if showCostInfo}
								<div class="tooltip" transition:fade={{ duration: 200 }}>
									참가비는 노쇼비를 포함하므로 환불 되지 않습니다
								</div>
							{/if}
						</div>
					</label>
					<input 
						type="text" 
						class="input-field"
						placeholder="금액 (선택)" 
						bind:value={formData.cost} 
					/>
				</div>
			</div>
		</div>

		<div class="section">
			<div class="input-group">
				<label>
					<Calendar size={16} /> 일시
				</label>
				<input 
					type="datetime-local" 
					class="input-field"
					bind:value={formData.date} 
				/>
			</div>

			<div class="input-group">
				<label>
					<MapPin size={16} /> 장소
				</label>
				<div class="search-wrapper">
					<input 
						type="text" 
						class="input-field"
						placeholder="주소 또는 장소명 검색" 
						bind:value={formData.location} 
						on:keydown={(e) => e.key === 'Enter' && !e.isComposing && searchLocation()}
					/>
					<button type="button" class="search-btn" 
						on:click={searchLocation}>
						<Search size={20} />
					</button>
				</div>
				
				<div class="map-container" class:visible={isMapVisible} transition:slide>
					<div bind:this={mapElement} class="map-view"></div>
				</div>
			</div>
		</div>

		<div class="section">
			<div class="input-group">
				<label>
					<AlignLeft size={16} /> 상세 설명
				</label>
				<textarea 
					rows="8" 
					class="input-field textarea"
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
		background-color: #f8f9fa; /* 배경색 변경 */
		min-height: 100vh;
		display: flex;
		flex-direction: column;
		position: relative;
		padding-bottom: 90px;
	}

	.header {
		height: 56px;
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0 16px;
		background-color: white;
		position: sticky;
		top: 0;
		z-index: 10;
		box-shadow: 0 1px 2px rgba(0,0,0,0.03);
	}

	.back-btn {
		background: none;
		border: none;
		cursor: pointer;
		padding: 8px;
		margin-left: -8px;
		color: #333;
	}

	.page-title {
		font-size: 17px;
		font-weight: 700;
		color: #1a1a1a;
	}

	.content-body {
		display: flex;
		flex-direction: column;
		gap: 16px;
		padding: 16px;
	}

	.section {
		background-color: white;
		padding: 20px;
		border-radius: 16px;
		box-shadow: 0 1px 3px rgba(0,0,0,0.02);
		display: flex;
		flex-direction: column;
		gap: 20px;
	}

	.image-section {
		padding: 0;
		overflow: hidden;
		background: none;
		box-shadow: none;
	}

	.uploader-wrapper {
		width: 100%;
		height: 220px;
		border-radius: 16px;
		overflow: hidden;
		background-color: #e2e8f0;
		position: relative;
		box-shadow: 0 2px 8px rgba(0,0,0,0.05);
	}
	
	.image-placeholder-text {
		position: absolute;
		bottom: 16px;
		left: 0; 
		right: 0;
		text-align: center;
		color: #718096;
		font-size: 13px;
		pointer-events: none;
	}

	/* 라벨 스타일 */
	label {
		font-size: 14px;
		font-weight: 600;
		color: #2d3748;
		display: flex;
		align-items: center;
		gap: 6px;
		margin-bottom: 8px;
	}

	/* 공통 입력 필드 스타일 */
	.input-field {
		width: 100%;
		padding: 12px 14px;
		border: 1px solid #e2e8f0;
		border-radius: 10px;
		font-size: 15px;
		background-color: #fff;
		box-sizing: border-box;
		outline: none;
		transition: all 0.2s;
		color: #2d3748;
	}

	.input-field:focus {
		border-color: #3182ce;
		box-shadow: 0 0 0 3px rgba(49, 130, 206, 0.1);
	}

	.title-input {
		font-size: 16px;
		font-weight: 500;
	}

	/* 카테고리 그리드 스타일 */
	.category-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 10px;
	}

	.category-card {
		background-color: white;
		border: 1px solid #e2e8f0;
		border-radius: 12px;
		padding: 12px 4px;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 8px;
		cursor: pointer;
		transition: all 0.2s;
	}

	.category-card:hover {
		background-color: #f7fafc;
	}

	.category-card.selected {
		border-color: #3182ce;
		background-color: #ebf8ff;
		box-shadow: 0 0 0 1px #3182ce;
	}

	.cat-icon {
		width: 36px;
		height: 36px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.2s;
	}

	.cat-label {
		font-size: 12px;
		font-weight: 600;
		color: #4a5568;
	}
	.category-card.selected .cat-label {
		color: #2b6cb0;
	}

	/* 폼 레이아웃 */
	.form-row {
		display: flex;
		gap: 12px;
	}
	.input-group {
		display: flex;
		flex-direction: column;
	}
	.input-group.half {
		flex: 1;
	}

	.number-input-wrapper {
		position: relative;
	}
	.unit {
		position: absolute;
		right: 12px;
		top: 50%;
		transform: translateY(-50%);
		font-size: 14px;
		color: #718096;
		pointer-events: none;
	}

	/* 툴팁 스타일 */
	.label-with-tooltip {
		display: flex;
		align-items: center;
		justify-content: space-between;
		width: 100%;
	}
	.label-content {
		display: flex;
		align-items: center;
		gap: 6px;
	}
	.tooltip-wrapper {
		position: relative;
	}
	.info-icon {
		background: none;
		border: none;
		padding: 4px;
		cursor: pointer;
		color: #a0aec0;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: color 0.2s;
	}
	.info-icon:hover { color: #718096; }

	.tooltip {
		position: absolute;
		bottom: 100%;
		right: 0;
		/* 오른쪽 정렬로 변경하여 화면 밖으로 나가는 것 방지 */
		background-color: rgba(45, 55, 72, 0.95);
		color: white;
		padding: 8px 12px;
		border-radius: 8px;
		font-size: 12px;
		white-space: nowrap;
		margin-bottom: 8px;
		z-index: 50;
		box-shadow: 0 4px 12px rgba(0,0,0,0.15);
		pointer-events: none;
	}
	.tooltip::after {
		content: '';
		position: absolute;
		top: 100%;
		right: 6px;
		border-width: 5px;
		border-style: solid;
		border-color: rgba(45, 55, 72, 0.95) transparent transparent transparent;
	}

	/* 지도 및 검색 */
	.search-wrapper {
		display: flex;
		gap: 8px;
	}
	.search-btn {
		background-color: #3182ce;
		color: white;
		border: none;
		border-radius: 10px;
		width: 48px;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		flex-shrink: 0;
		transition: background 0.2s;
	}
	.search-btn:hover { background-color: #2b6cb0; }

	.map-container {
		height: 0;
		overflow: hidden;
		transition: height 0.3s ease;
		border-radius: 12px;
		margin-top: 0;
	}
	.map-container.visible {
		height: 200px;
		margin-top: 12px;
		border: 1px solid #e2e8f0;
	}
	.map-view {
		width: 100%;
		height: 100%;
		background-color: #f0f0f0;
	}

	.textarea {
		resize: none;
		line-height: 1.6;
		min-height: 120px;
	}

	/* 하단 고정 버튼 */
	.bottom-bar {
		position: fixed;
		bottom: 0;
		left: 0;
		right: 0;
		max-width: 600px;
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
		font-weight: 700;
		border: none;
		cursor: pointer;
		background-color: #3182ce;
		color: white;
		transition: all 0.2s;
		box-shadow: 0 4px 6px rgba(49, 130, 206, 0.2);
	}

	.submit-btn:disabled {
		background-color: #cbd5e0;
		cursor: not-allowed;
		box-shadow: none;
	}

	.submit-btn:active:not(:disabled) {
		background-color: #2b6cb0;
		transform: translateY(1px);
	}
</style>