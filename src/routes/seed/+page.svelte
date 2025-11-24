<script>
	import { db } from '$lib/firebase';
	import { doc, setDoc } from 'firebase/firestore';
	import { CheckCircle, AlertCircle, Database, Tag, Award } from 'lucide-svelte';

	// 1. 저장할 Mock 태그 목록
	const mockTags = [
		'운동', '러닝', '등산', '헬스', '요가',
		'독서', '영화', '음악', '전시회', '사진',
		'여행', '맛집', '카페', '요리', '와인',
		'코딩', '주식', '부동산', '재테크', '영어',
		'게임', '반려동물', '봉사', '드라이브'
	];

	// 2. [추가] 저장할 Mock 대화평 뱃지 목록 (5개)
	const mockBadges = [
		{ id: '1', text: '👂 경청을 잘해요', color: '#e3f2fd', textColor: '#1976d2' }, // 파랑
		{ id: '2', text: '😄 유머 감각이 좋아요', color: '#fff3e0', textColor: '#f57c00' }, // 주황
		{ id: '3', text: '💡 통찰력이 있어요', color: '#e8f5e9', textColor: '#388e3c' }, // 초록
		{ id: '4', text: '🍯 목소리가 꿀', color: '#f3e5f5', textColor: '#7b1fa2' }, // 보라
		{ id: '5', text: '🔥 열정이 넘쳐요', color: '#FFEBEE', textColor: '#C62828' }  // 빨강 (신규)
	];

	let tagStatus = 'idle';
	let badgeStatus = 'idle';
	let tagMessage = '';
	let badgeMessage = '';

	// 태그 저장 함수
	async function seedTags() {
		if (!confirm('기존 태그 설정이 덮어씌워집니다. 진행하시겠습니까?')) return;
		tagStatus = 'loading';
		try {
			const settingsRef = doc(db, 'settings', 'global');
			await setDoc(settingsRef, { interestTags: mockTags }, { merge: true });
			tagStatus = 'success';
			tagMessage = `태그 ${mockTags.length}개가 저장되었습니다.`;
		} catch (error) {
			console.error(error);
			tagStatus = 'error';
			tagMessage = '오류: ' + error.message;
		}
	}

	// [추가] 뱃지 저장 함수
	async function seedBadges() {
		if (!confirm('기존 뱃지 설정이 덮어씌워집니다. 진행하시겠습니까?')) return;
		badgeStatus = 'loading';
		try {
			const settingsRef = doc(db, 'settings', 'global');
			await setDoc(settingsRef, { reviewBadges: mockBadges }, { merge: true });
			badgeStatus = 'success';
			badgeMessage = `뱃지 ${mockBadges.length}개가 저장되었습니다.`;
		} catch (error) {
			console.error(error);
			badgeStatus = 'error';
			badgeMessage = '오류: ' + error.message;
		}
	}
</script>

<div class="seed-container">
	<div class="header-section">
		<div class="icon-wrapper main-icon">
			<Database size={40} color="#3182ce" />
		</div>
		<h1>데이터 시딩 (Seed)</h1>
		<p class="page-desc">초기 데이터를 Firestore DB (<code>settings/global</code>)에 일괄 등록합니다.</p>
	</div>

	<div class="grid-layout">
		<div class="card">
			<div class="card-header">
				<Tag size={24} color="#4a5568" />
				<h2>관심사 태그</h2>
			</div>
			<div class="preview-box tags">
				{#each mockTags as tag}
					<span class="tag-chip">{tag}</span>
				{/each}
			</div>
			<button class="action-btn" on:click={seedTags} disabled={tagStatus === 'loading'}>
				{tagStatus === 'loading' ? '저장 중...' : '태그 저장하기'}
			</button>
			{#if tagStatus === 'success'}
				<div class="result success"><CheckCircle size={16} /> {tagMessage}</div>
			{:else if tagStatus === 'error'}
				<div class="result error"><AlertCircle size={16} /> {tagMessage}</div>
			{/if}
		</div>

		<div class="card">
			<div class="card-header">
				<Award size={24} color="#4a5568" />
				<h2>대화평 뱃지 (5종)</h2>
			</div>
			<div class="preview-box badges">
				{#each mockBadges as badge}
					<div 
						class="badge-chip" 
						style="background-color: {badge.color}; color: {badge.textColor};"
					>
						{badge.text}
					</div>
				{/each}
			</div>
			<button class="action-btn" on:click={seedBadges} disabled={badgeStatus === 'loading'}>
				{badgeStatus === 'loading' ? '저장 중...' : '뱃지 저장하기'}
			</button>
			{#if badgeStatus === 'success'}
				<div class="result success"><CheckCircle size={16} /> {badgeMessage}</div>
			{:else if badgeStatus === 'error'}
				<div class="result error"><AlertCircle size={16} /> {badgeMessage}</div>
			{/if}
		</div>
	</div>
</div>

<style>
	.seed-container {
		min-height: 100vh;
		background-color: #f5f7fa;
		padding: 40px 20px;
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.header-section {
		text-align: center;
		margin-bottom: 40px;
	}

	.icon-wrapper {
		background-color: #ebf8ff;
		width: 64px;
		height: 64px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		margin: 0 auto 16px;
	}

	h1 { margin: 0 0 8px; color: #2d3748; font-size: 24px; }
	h2 { margin: 0; font-size: 18px; color: #2d3748; }
	.page-desc { color: #718096; margin: 0; }

	.grid-layout {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
		gap: 24px;
		width: 100%;
		max-width: 800px;
	}

	.card {
		background: white;
		padding: 24px;
		border-radius: 16px;
		box-shadow: 0 4px 6px rgba(0,0,0,0.05);
		display: flex;
		flex-direction: column;
	}

	.card-header {
		display: flex;
		align-items: center;
		gap: 10px;
		margin-bottom: 16px;
		padding-bottom: 12px;
		border-bottom: 1px solid #e2e8f0;
	}

	.preview-box {
		flex: 1;
		background: #f9fafb;
		border: 1px solid #edf2f7;
		border-radius: 8px;
		padding: 12px;
		margin-bottom: 20px;
		max-height: 200px;
		overflow-y: auto;
	}

	.tags {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}

	.tag-chip {
		font-size: 12px;
		padding: 4px 10px;
		background-color: #fff;
		border: 1px solid #e2e8f0;
		border-radius: 20px;
		color: #4a5568;
	}

	.badges {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.badge-chip {
		padding: 8px 12px;
		border-radius: 8px;
		font-size: 13px;
		font-weight: 600;
		text-align: center;
	}

	.action-btn {
		background-color: #3182ce;
		color: white;
		border: none;
		padding: 12px;
		border-radius: 8px;
		font-size: 14px;
		font-weight: bold;
		cursor: pointer;
		transition: background 0.2s;
		width: 100%;
	}
	.action-btn:hover { background-color: #2b6cb0; }
	.action-btn:disabled { background-color: #cbd5e0; cursor: not-allowed; }

	.result {
		margin-top: 12px;
		padding: 10px;
		border-radius: 6px;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 6px;
		font-size: 13px;
		font-weight: 500;
	}
	.result.success { background-color: #f0fff4; color: #38a169; }
	.result.error { background-color: #fff5f5; color: #e53e3e; }
</style>