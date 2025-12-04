<script>
	import { db } from '$lib/firebase';
	import { doc, setDoc, collection, addDoc, Timestamp } from 'firebase/firestore';
	import { CheckCircle, AlertCircle, Database, Tag, Award, Calendar, MapPin, User, Smile } from 'lucide-svelte';

	// --- 1. 관심사 태그 데이터 ---
	const mockTags = [
		'운동', '러닝', '등산', '헬스', '요가',
		'독서', '영화', '음악', '전시회', '사진',
		'여행', '맛집', '카페', '요리', '와인',
		'코딩', '주식', '부동산', '재테크', '영어',
		'게임', '반려동물', '봉사', '드라이브'
	];

	// --- 2. 대화평 뱃지 데이터 ---
	const mockBadges = [
		{ id: '1', text: '👂 경청을 잘해요', color: '#e3f2fd', textColor: '#1976d2' },
		{ id: '2', text: '😄 유머 감각이 좋아요', color: '#fff3e0', textColor: '#f57c00' },
		{ id: '3', text: '💡 통찰력이 있어요', color: '#e8f5e9', textColor: '#388e3c' },
		{ id: '4', text: '🍯 목소리가 꿀', color: '#f3e5f5', textColor: '#7b1fa2' },
		{ id: '5', text: '🔥 열정이 넘쳐요', color: '#FFEBEE', textColor: '#C62828' }
	];

	// --- 3. 대구 모임 랜덤 데이터 소스 ---
	const daeguLocations = [
		'대구 중구 동성로', '대구 수성구 수성못', '대구 남구 앞산 전망대', 
		'대구 달서구 두류공원', '대구 중구 김광석거리', '대구 동구 팔공산',
		'대구 수성구 범어동', '대구 중구 반월당', '대구 북구 경북대 북문', '대구 동구 동대구역'
	];

	const meetingTitles = [
		'동성로 맛집 탐방 함께해요 🍕', '수성못 야간 러닝 (초보 환영) 🏃', '앞산 전망대 등산 & 커피 ⛰️',
		'두류공원 피크닉 치맥 파티 🍗', '김광석거리 버스킹 구경가요 🎸', '팔공산 드라이브 & 백숙 🚗',
		'범어동 조용한 독서 모임 📚', '반월당 영어 회화 스터디 💬', '경북대 북문 보드게임 벙개 🎲',
		'동대구역 근처 감성 카페 투어 ☕'
	];

	const categories = ['소셜', '운동', '취미', '독서', '여행', '맛집', '기타'];
	const hostNames = ['대구토박이', '러닝조아', '독서왕', '맛집네비', '산다람쥐', '커피중독', '여행자'];

	// --- 4. [신규] 회원 랜덤 데이터 소스 (2030 남녀) ---
	const userNicknames = [
		'민준', '서연', '도윤', '지우', '서준', '하은', '주원', '수아', '예준', '지아',
		'지호', '소율', '준우', '서현', '건우', '하윤', '우진', '서윤', '선우', '채원'
	];
	const userJobs = ['개발자', '디자이너', '마케터', '기획자', '교사', '공무원', '간호사', '엔지니어', '프리랜서', '대학생'];
	const userIntros = [
		'안녕하세요! 반가워요 👋', '새로운 취미를 찾고 있습니다.', '러닝 메이트 구해요!', 
		'맛집 탐방 좋아하시는 분?', '대화하는 거 좋아해요 ㅎㅎ', '주말에 심심해서 왔어요.',
		'자기개발에 관심 많습니다.', '편하게 연락주세요!', 'MBTI EEEE입니다.', '조용한 걸 선호해요.'
	];

	// --- 상태 변수 ---
	let tagStatus = 'idle';
	let badgeStatus = 'idle';
	let meetingStatus = 'idle';
	let userStatus = 'idle'; // [신규]
	
	let tagMessage = '';
	let badgeMessage = '';
	let meetingMessage = '';
	let userMessage = ''; // [신규]

	// --- 유틸리티: 검색 키워드 생성 (Bi-gram) ---
	function generateSearchKeywords(text) {
		if (!text) return [];
		const keywords = [];
		const cleanText = text.replace(/\s/g, '').toLowerCase();
		for (let i = 0; i < cleanText.length - 1; i++) {
			keywords.push(cleanText.substring(i, i + 2));
		}
		return keywords;
	}

	// --- 함수 정의 ---

	// 1. 태그 저장
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

	// 2. 뱃지 저장
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

	// 3. 대구 모임 10개 랜덤 생성
	async function seedMeetings() {
		if (!confirm('대구 지역 모임 10개를 추가하시겠습니까?')) return;
		meetingStatus = 'loading';
		try {
			const meetingsColl = collection(db, 'meetings');
			const batchPromises = [];

			for (let i = 0; i < 10; i++) {
				const randomIndex = Math.floor(Math.random() * meetingTitles.length);
				const title = meetingTitles[randomIndex];
				const location = daeguLocations[randomIndex];
				const category = categories[Math.floor(Math.random() * categories.length)];
				
				const futureDate = new Date();
				futureDate.setDate(futureDate.getDate() + Math.floor(Math.random() * 30) + 1);
				futureDate.setHours(Math.floor(Math.random() * 10) + 10, 0, 0, 0);

				const imageId = Math.floor(Math.random() * 1000);
				const image = `https://picsum.photos/id/${imageId}/800/600`;
				const maxParticipants = Math.floor(Math.random() * 8) + 3;
				
				const newMeeting = {
					title: title,
					category: category,
					location: location,
					date: futureDate.toISOString(),
					image: image,
					hostId: 'admin-seeder',
					hostName: hostNames[Math.floor(Math.random() * hostNames.length)],
					description: `대구 ${location}에서 진행되는 즐거운 ${category} 모임입니다! 누구나 환영합니다.`,
					maxParticipants: maxParticipants,
					currentParticipants: Math.floor(Math.random() * (maxParticipants - 1)),
					createdAt: new Date().toISOString(),
					status: 'open',
					_searchKeywords: [
						...generateSearchKeywords(title),
						...generateSearchKeywords(location)
					]
				};

				batchPromises.push(addDoc(meetingsColl, newMeeting));
			}

			await Promise.all(batchPromises);
			
			meetingStatus = 'success';
			meetingMessage = '대구 모임 10개가 성공적으로 추가되었습니다!';
		} catch (error) {
			console.error(error);
			meetingStatus = 'error';
			meetingMessage = '오류: ' + error.message;
		}
	}

	// 4. [신규] 2030 남녀 회원 10명 랜덤 생성
	async function seedUsers() {
		if (!confirm('20~30대 남녀 회원 10명을 추가하시겠습니까?')) return;
		userStatus = 'loading';
		try {
			const usersColl = collection(db, 'users');
			const batchPromises = [];

			for (let i = 0; i < 10; i++) {
				const gender = Math.random() > 0.5 ? 'M' : 'F';
				const age = Math.floor(Math.random() * 20) + 20; // 20 ~ 39세
				const nickname = userNicknames[Math.floor(Math.random() * userNicknames.length)] + Math.floor(Math.random() * 100);
				const email = `testuser${Date.now()}_${i}@example.com`;
				const job = userJobs[Math.floor(Math.random() * userJobs.length)];
				const intro = userIntros[Math.floor(Math.random() * userIntros.length)];
				
				// 랜덤 아바타 이미지 (gender 기반)
				// pravatar.cc는 랜덤 이미지를 제공, u 파라미터로 고정 가능
				const image = `https://i.pravatar.cc/150?u=${email}`;

				const newUser = {
					nickname: nickname,
					email: email,
					age: age,
					gender: gender,
					job: job,
					image: image,
					intro: intro,
					membership: Math.random() > 0.8 ? 'Pro' : (Math.random() > 0.5 ? 'Standard' : 'Basic'),
					createdAt: new Date().toISOString(),
					status: 'active',
					interestTags: mockTags.sort(() => 0.5 - Math.random()).slice(0, 3), // 태그 3개 랜덤
					_searchKeywords: [
						...generateSearchKeywords(nickname),
						...generateSearchKeywords(email.split('@')[0])
					]
				};

				// addDoc을 사용하여 Firestore가 ID 자동 생성하도록 함
				batchPromises.push(addDoc(usersColl, newUser));
			}

			await Promise.all(batchPromises);

			userStatus = 'success';
			userMessage = '회원 10명이 성공적으로 추가되었습니다!';
		} catch (error) {
			console.error(error);
			userStatus = 'error';
			userMessage = '오류: ' + error.message;
		}
	}
</script>

<div class="seed-container">
	<div class="header-section">
		<div class="icon-wrapper main-icon">
			<Database size={40} color="#3182ce" />
		</div>
		<h1>데이터 시딩 (Seed)</h1>
		<p class="page-desc">초기 데이터를 Firestore DB에 일괄 등록하거나 테스트 데이터를 생성합니다.</p>
	</div>

	<div class="grid-layout">
		<div class="card">
			<div class="card-header">
				<Tag size={24} color="#4a5568" />
				<h2>관심사 태그 설정</h2>
			</div>
			<div class="preview-box tags">
				{#each mockTags as tag}
					<span class="tag-chip">{tag}</span>
				{/each}
			</div>
			<button class="action-btn" on:click={seedTags} disabled={tagStatus === 'loading'}>
				{tagStatus === 'loading' ? '저장 중...' : '태그 설정 저장하기'}
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
				<h2>대화평 뱃지 설정</h2>
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
				{badgeStatus === 'loading' ? '저장 중...' : '뱃지 설정 저장하기'}
			</button>
			{#if badgeStatus === 'success'}
				<div class="result success"><CheckCircle size={16} /> {badgeMessage}</div>
			{:else if badgeStatus === 'error'}
				<div class="result error"><AlertCircle size={16} /> {badgeMessage}</div>
			{/if}
		</div>

		<div class="card">
			<div class="card-header">
				<Calendar size={24} color="#4a5568" />
				<h2>대구 모임 생성 (랜덤)</h2>
			</div>
			<div class="preview-box content-list">
				<p class="info-text">대구 지역(수성못, 동성로 등)을 기반으로 한 랜덤 모임 10개를 추가합니다.</p>
				<ul class="sample-list">
					{#each meetingTitles.slice(0, 5) as title, i}
						<li>
							<MapPin size={12} /> 
							<span>{title}</span>
						</li>
					{/each}
					<li>... 외 5개</li>
				</ul>
			</div>
			<button class="action-btn primary" on:click={seedMeetings} disabled={meetingStatus === 'loading'}>
				{meetingStatus === 'loading' ? '생성 중...' : '대구 모임 10개 추가하기'}
			</button>
			{#if meetingStatus === 'success'}
				<div class="result success"><CheckCircle size={16} /> {meetingMessage}</div>
			{:else if meetingStatus === 'error'}
				<div class="result error"><AlertCircle size={16} /> {meetingMessage}</div>
			{/if}
		</div>

		<div class="card">
			<div class="card-header">
				<User size={24} color="#4a5568" />
				<h2>회원 데이터 생성 (랜덤)</h2>
			</div>
			<div class="preview-box content-list">
				<p class="info-text">20대~30대 남녀 회원 10명을 가상으로 생성하여 추가합니다.</p>
				<ul class="sample-list">
					<li><Smile size={12} /> <span>닉네임: 민준, 서연 등 랜덤</span></li>
					<li><Smile size={12} /> <span>나이: 20세 ~ 39세</span></li>
					<li><Smile size={12} /> <span>직업: 개발자, 디자이너 등</span></li>
					<li><Smile size={12} /> <span>성별: 남/녀 랜덤 배정</span></li>
				</ul>
			</div>
			<button class="action-btn secondary" on:click={seedUsers} disabled={userStatus === 'loading'}>
				{userStatus === 'loading' ? '생성 중...' : '회원 10명 추가하기'}
			</button>
			{#if userStatus === 'success'}
				<div class="result success"><CheckCircle size={16} /> {userMessage}</div>
			{:else if userStatus === 'error'}
				<div class="result error"><AlertCircle size={16} /> {userMessage}</div>
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
		grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
		gap: 24px;
		width: 100%;
		max-width: 1000px;
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

	.content-list .info-text {
		font-size: 13px;
		color: #4a5568;
		margin-bottom: 12px;
		line-height: 1.5;
	}

	.sample-list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 6px;
	}
	
	.sample-list li {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 12px;
		color: #718096;
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
	
	.action-btn.primary { background-color: #38a169; }
	.action-btn.primary:hover { background-color: #2f855a; }

	.action-btn.secondary { background-color: #805ad5; }
	.action-btn.secondary:hover { background-color: #6b46c1; }

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