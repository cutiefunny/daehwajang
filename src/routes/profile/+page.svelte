<script>
	import { 
		User, 
		Settings, 
		CreditCard, 
		Users, 
		MessageSquare, 
		Camera, 
		Check, 
		Edit2,
		Crown 
	} from 'lucide-svelte';

	// 사용자 정보 (수정 가능)
	let user = {
		nickname: '대화장인',
		age: 28,
		image: 'https://placehold.co/200x200/333/fff?text=ME'
	};

	// 수정 모드 토글
	let isEditing = false;
	
	// 수정 중인 임시 데이터
	let editForm = {
		nickname: user.nickname,
		age: user.age
	};

	// 멤버십 정보
	let membership = {
		type: 'PRO 멤버십',
		status: 'active', // active, none
		price: '9,900원',
		nextBillingDate: '2025. 12. 01'
	};

	// 활동 통계
	let stats = {
		totalMeetings: 12, // 총 모임 참여 횟수
		peopleMet: 45      // 만난 사람들 수
	};

	// 대화평 (받은 피드백 태그)
	let reviews = [
		{ id: 1, text: '👂 경청을 잘해요', count: 8, color: '#e3f2fd', textColor: '#1976d2' },
		{ id: 2, text: '😄 유머 감각이 좋아요', count: 5, color: '#fff3e0', textColor: '#f57c00' },
		{ id: 3, text: '💡 통찰력이 있어요', count: 3, color: '#e8f5e9', textColor: '#388e3c' },
		{ id: 4, text: '🍯 목소리가 꿀', count: 2, color: '#f3e5f5', textColor: '#7b1fa2' }
	];

	// 수정 시작
	function startEdit() {
		editForm = { ...user };
		isEditing = true;
	}

	// 저장 (실제로는 서버로 전송 필요)
	function saveEdit() {
		user = { ...editForm };
		isEditing = false;
		// TODO: API 호출하여 사용자 정보 업데이트
	}

	// 이미지 변경 (임시 구현)
	function changeImage() {
		alert('프로필 사진 변경 기능이 열립니다 (구현 예정)');
	}
</script>

<div class="page-container">
	<header class="header">
		<h2 class="page-title">내 프로필</h2>
		<button class="icon-btn setting-btn">
			<Settings size={24} />
		</button>
	</header>

	<section class="profile-section">
		<div class="avatar-container">
			<div class="avatar-wrapper">
				<img src={user.image} alt="프로필 이미지" />
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
						{user.nickname} <span class="age">({user.age}세)</span>
					</h3>
					<button class="edit-btn" on:click={startEdit}>
						<Edit2 size={14} /> 수정
					</button>
				</div>
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

	.page-title {
		font-size: 22px;
		font-weight: bold;
		margin: 0;
	}

	.icon-btn {
		background: none;
		border: none;
		cursor: pointer;
		padding: 4px;
		color: #333;
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
		overflow: visible; /* 카메라 버튼 표시를 위해 visible 혹은 absolute 처리 필요 */
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