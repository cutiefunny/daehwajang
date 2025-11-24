<script>
	import { onMount } from 'svelte';
	import { user } from '$lib/stores'; // 로그인된 유저 정보
	import { auth, db } from '$lib/firebase'; // Auth 및 Firestore
	import { signOut } from 'firebase/auth'; // [추가] 로그아웃 함수
	import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
	import { goto } from '$app/navigation';
	import { 
		Settings, 
		CreditCard, 
		Users, 
		MessageSquare, 
		Camera, 
		Check, 
		Edit2,
		Crown,
		LogOut // [추가] 로그아웃 아이콘
	} from 'lucide-svelte';

	// 프로필 데이터 상태
	let profile = {
		nickname: '',
		age: 20,
		intro: '',
		image: ''
	};

	let isLoading = true;
	let isEditing = false;
	let editForm = {}; // 수정 시 임시 저장소

	// 멤버십 정보 (아직은 임시 데이터 유지)
	let membership = {
		type: 'PRO 멤버십',
		status: 'active',
		price: '9,900원',
		nextBillingDate: '2025. 12. 01'
	};

	// 활동 통계 (아직은 임시 데이터 유지)
	let stats = {
		totalMeetings: 0,
		peopleMet: 0
	};

	// 대화평 (아직은 임시 데이터 유지)
	let reviews = [
		{ id: 1, text: '👂 경청을 잘해요', count: 0, color: '#e3f2fd', textColor: '#1976d2' },
		{ id: 2, text: '😄 유머 감각이 좋아요', count: 0, color: '#fff3e0', textColor: '#f57c00' },
		{ id: 3, text: '💡 통찰력이 있어요', count: 0, color: '#e8f5e9', textColor: '#388e3c' },
		{ id: 4, text: '🍯 목소리가 꿀', count: 0, color: '#f3e5f5', textColor: '#7b1fa2' }
	];

	// 유저 데이터 가져오기 및 초기화
	$: if ($user) {
		loadUserData($user);
	} else if (!$user && !isLoading) {
		// 로그아웃 상태라면 로그인 페이지로 (레이아웃 로딩 속도 고려하여 isLoading 체크)
	}

	async function loadUserData(currentUser) {
		try {
			const userRef = doc(db, 'users', currentUser.uid);
			const docSnap = await getDoc(userRef);

			if (docSnap.exists()) {
				// 이미 가입된 유저라면 DB 정보 로드
				profile = { ...profile, ...docSnap.data() };
			} else {
				// 최초 로그인 유저라면 기본 정보로 DB 생성
				const newProfile = {
					nickname: currentUser.displayName || '익명 유저',
					age: 20,
					image: currentUser.photoURL || 'https://placehold.co/200x200/333/fff?text=ME',
					email: currentUser.email,
					createdAt: new Date().toISOString()
				};
				await setDoc(userRef, newProfile);
				profile = newProfile;
			}
		} catch (error) {
			console.error('프로필 로딩 실패:', error);
		} finally {
			isLoading = false;
		}
	}

	// 수정 모드 시작
	function startEdit() {
		editForm = { ...profile };
		isEditing = true;
	}

	// 수정 사항 저장 (Firestore 업데이트)
	async function saveEdit() {
		if (!$user) return;

		try {
			const userRef = doc(db, 'users', $user.uid);
			await updateDoc(userRef, {
				nickname: editForm.nickname,
				age: Number(editForm.age)
			});
			
			// 로컬 상태 업데이트
			profile = { ...profile, nickname: editForm.nickname, age: Number(editForm.age) };
			isEditing = false;
		} catch (error) {
			console.error('저장 실패:', error);
			alert('저장에 실패했습니다.');
		}
	}

	// 이미지 변경 (추후 스토리지 연동 필요)
	function changeImage() {
		alert('프로필 사진 변경 기능은 추후 구현 예정입니다.');
	}

	// [추가] 로그아웃 함수
	async function handleLogout() {
		if (confirm('정말 로그아웃 하시겠습니까?')) {
			try {
				await signOut(auth);
				alert('로그아웃 되었습니다.');
				goto('/login');
			} catch (error) {
				console.error('로그아웃 실패:', error);
			}
		}
	}
</script>

<div class="page-container">
	<header class="header">
		<h2 class="page-title">내 프로필</h2>
		<div class="header-actions">
			<button class="icon-btn logout-btn" on:click={handleLogout} title="로그아웃">
				<LogOut size={22} />
			</button>
			<button class="icon-btn setting-btn">
				<Settings size={22} />
			</button>
		</div>
	</header>

	{#if isLoading}
		<div class="loading-state">로딩 중...</div>
	{:else if $user}
		<section class="profile-section">
			<div class="avatar-container">
				<div class="avatar-wrapper">
					<img src={profile.image} alt="프로필 이미지" />
					{#if isEditing}
						<button class="camera-btn" on:click={changeImage}>
							<Camera size={16} />
						</button>
					{/if}
				</div>
			</div>

			<div class="info-container">
				{#if isEditing}
					<div class="edit-form">
						<div class="input-group">
							<label for="nickname">닉네임</label>
							<input type="text" id="nickname" bind:value={editForm.nickname} />
						</div>
						<div class="input-group">
							<label for="age">나이</label>
							<input type="number" id="age" bind:value={editForm.age} />
						</div>
						<button class="save-btn" on:click={saveEdit}>
							<Check size={16} /> 저장완료
						</button>
					</div>
				{:else}
					<div class="display-info">
						<h3 class="nickname">
							{profile.nickname} <span class="age">({profile.age}세)</span>
						</h3>
						<button class="edit-btn" on:click={startEdit}>
							<Edit2 size={14} /> 수정
						</button>
					</div>
					<p class="email-text">{$user.email}</p>
				{/if}
			</div>
		</section>

		<section class="stats-grid">
			<div class="stat-card">
				<div class="stat-icon bg-blue">
					<MessageSquare size={20} color="#1976d2" />
				</div>
				<div class="stat-info">
					<span class="stat-label">참여한 모임</span>
					<span class="stat-value">{stats.totalMeetings}회</span>
				</div>
			</div>
			<div class="stat-card">
				<div class="stat-icon bg-orange">
					<Users size={20} color="#f57c00" />
				</div>
				<div class="stat-info">
					<span class="stat-label">만난 사람들</span>
					<span class="stat-value">{stats.peopleMet}명</span>
				</div>
			</div>
		</section>

		<section class="section">
			<h3 class="section-header">멤버십</h3>
			<div class="membership-card">
				<div class="card-header">
					<div class="plan-info">
						<Crown size={20} color="#FFD700" />
						<span class="plan-name">{membership.type}</span>
					</div>
					<span class="active-badge">구독중</span>
				</div>
				<div class="card-body">
					<p class="price-info">월 {membership.price}</p>
					<p class="billing-date">다음 결제일: {membership.nextBillingDate}</p>
				</div>
				<div class="card-footer">
					<button class="manage-btn">
						<CreditCard size={14} /> 결제 관리
					</button>
				</div>
			</div>
		</section>

		<section class="section">
			<h3 class="section-header">나의 대화 스타일</h3>
			<div class="review-tags">
				{#each reviews as review}
					<div 
						class="tag" 
						style="background-color: {review.color}; color: {review.textColor};"
					>
						{review.text} <span class="tag-count">+{review.count}</span>
					</div>
				{/each}
			</div>
		</section>
	{:else}
		<div class="empty-state">
			<p>로그인이 필요한 서비스입니다.</p>
			<a href="/login" class="login-link">로그인하러 가기</a>
		</div>
	{/if}
</div>

<style>
	.page-container {
		padding: 20px 16px;
		padding-bottom: 40px;
	}

	.header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 24px;
	}
	
	.header-actions {
		display: flex;
		gap: 8px;
	}

	.page-title {
		font-size: 22px;
		font-weight: bold;
		margin: 0;
	}

	.icon-btn {
		background: none;
		border: none;
		cursor: pointer;
		padding: 6px;
		color: #333;
		border-radius: 50%;
		transition: background-color 0.2s;
	}
	
	.icon-btn:hover {
		background-color: #f0f0f0;
	}
	
	.logout-btn {
		color: #e53e3e; /* 로그아웃은 약간 붉은 계열로 강조 */
	}

	.loading-state, .empty-state {
		text-align: center;
		padding: 40px 0;
		color: #666;
	}

	.login-link {
		display: inline-block;
		margin-top: 10px;
		color: #1976d2;
		text-decoration: underline;
	}

	/* 프로필 섹션 */
	.profile-section {
		display: flex;
		flex-direction: column;
		align-items: center;
		margin-bottom: 32px;
	}

	.avatar-container {
		margin-bottom: 16px;
	}

	.avatar-wrapper {
		width: 100px;
		height: 100px;
		border-radius: 50%;
		overflow: visible;
		position: relative;
		border: 3px solid white;
		box-shadow: 0 4px 12px rgba(0,0,0,0.1);
	}

	.avatar-wrapper img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		border-radius: 50%;
	}

	.camera-btn {
		position: absolute;
		bottom: 0;
		right: 0;
		background-color: #333;
		color: white;
		border: none;
		width: 32px;
		height: 32px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		border: 2px solid white;
	}

	.info-container {
		width: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
	}

	/* 조회 모드 스타일 */
	.display-info {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.nickname {
		font-size: 20px;
		font-weight: bold;
		margin: 0;
	}

	.age {
		font-weight: normal;
		font-size: 16px;
		color: #666;
	}

	.email-text {
		font-size: 13px;
		color: #999;
		margin: 4px 0 0 0;
	}

	.edit-btn {
		background-color: #f0f0f0;
		border: none;
		padding: 6px 10px;
		border-radius: 16px;
		font-size: 12px;
		display: flex;
		align-items: center;
		gap: 4px;
		cursor: pointer;
		color: #555;
	}

	/* 수정 모드 스타일 */
	.edit-form {
		display: flex;
		flex-direction: column;
		gap: 12px;
		width: 100%;
		max-width: 240px;
		background-color: #f9f9f9;
		padding: 16px;
		border-radius: 12px;
	}

	.input-group {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.input-group label {
		width: 50px;
		font-size: 13px;
		color: #666;
		font-weight: bold;
	}

	.input-group input {
		flex: 1;
		padding: 8px;
		border: 1px solid #ddd;
		border-radius: 6px;
		font-size: 14px;
	}

	.save-btn {
		margin-top: 4px;
		background-color: #333;
		color: white;
		border: none;
		padding: 10px;
		border-radius: 8px;
		font-weight: bold;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 6px;
	}

	/* 통계 그리드 */
	.stats-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 12px;
		margin-bottom: 24px;
	}

	.stat-card {
		background-color: white;
		padding: 16px;
		border-radius: 12px;
		box-shadow: 0 2px 8px rgba(0,0,0,0.05);
		display: flex;
		align-items: center;
		gap: 12px;
	}

	.stat-icon {
		width: 40px;
		height: 40px;
		border-radius: 12px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.bg-blue { background-color: #e3f2fd; }
	.bg-orange { background-color: #fff3e0; }

	.stat-info {
		display: flex;
		flex-direction: column;
	}

	.stat-label {
		font-size: 12px;
		color: #888;
	}

	.stat-value {
		font-size: 16px;
		font-weight: bold;
		color: #333;
	}

	/* 섹션 공통 */
	.section {
		margin-bottom: 24px;
	}

	.section-header {
		font-size: 16px;
		font-weight: bold;
		margin: 0 0 12px 0;
		color: #333;
	}

	/* 멤버십 카드 */
	.membership-card {
		background: linear-gradient(135deg, #333 0%, #555 100%);
		color: white;
		padding: 20px;
		border-radius: 16px;
		box-shadow: 0 4px 12px rgba(0,0,0,0.15);
	}

	.card-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 16px;
	}

	.plan-info {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.plan-name {
		font-size: 18px;
		font-weight: bold;
	}

	.active-badge {
		background-color: rgba(255,255,255,0.2);
		font-size: 11px;
		padding: 4px 8px;
		border-radius: 12px;
		font-weight: bold;
	}

	.price-info {
		font-size: 24px;
		font-weight: bold;
		margin: 0 0 4px 0;
	}

	.billing-date {
		font-size: 13px;
		color: rgba(255,255,255,0.7);
		margin: 0;
	}

	.card-footer {
		margin-top: 16px;
		padding-top: 16px;
		border-top: 1px solid rgba(255,255,255,0.1);
	}

	.manage-btn {
		background: none;
		border: 1px solid rgba(255,255,255,0.4);
		color: white;
		padding: 8px 12px;
		border-radius: 20px;
		font-size: 12px;
		cursor: pointer;
		display: flex;
		align-items: center;
		gap: 6px;
		transition: background 0.2s;
	}

	.manage-btn:hover {
		background-color: rgba(255,255,255,0.1);
	}

	/* 대화평 태그 */
	.review-tags {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}

	.tag {
		padding: 8px 12px;
		border-radius: 20px;
		font-size: 13px;
		font-weight: 500;
		display: flex;
		align-items: center;
		gap: 6px;
	}

	.tag-count {
		font-size: 11px;
		font-weight: bold;
		opacity: 0.8;
	}
</style>