<script>
	import { onMount } from 'svelte';
	import { user, appSettings, modal } from '$lib/stores';
	import { auth, db } from '$lib/firebase';
	import { signOut } from 'firebase/auth';
	import { doc, getDoc, setDoc, updateDoc, collection, query, where, getCountFromServer } from 'firebase/firestore';
	import { goto } from '$app/navigation';
	import { 
		Settings, 
		CreditCard, 
		Users, 
		MessageSquare, 
		Check, 
		Edit2,
		Crown,
		LogOut,
		Briefcase,
		Bell // [추가] 종 아이콘
	} from 'lucide-svelte';
	import ImageUploader from '$lib/components/ImageUploader.svelte';
	import Skeleton from '$lib/components/Skeleton.svelte';

	// 프로필 데이터 상태
	let profile = {
		nickname: '',
		age: 20,
		gender: '',
		job: '',      
		interests: [], 
		intro: '',
		image: ''
	};

	// [추가] 알림 설정 상태 (기본값 true)
	let notificationSettings = {
		enabled: true,        // 전체 알림
		hostApplication: true, // (호스트) 참가 신청 알림
		guestStatus: true,     // (게스트) 참가 승인/거부 알림
		chat: true,            // 채팅 알림
		review: true,          // 대화평 등록 알림
		event: true            // 이벤트 알림
	};

	let isLoading = true;
	let isEditing = false;
	let editForm = {};

	// 기본 태그 목록
	const defaultInterests = [
		'운동', '러닝', '등산', '헬스', '요가',
		'독서', '영화', '음악', '전시회', '사진',
		'여행', '맛집', '카페', '요리', '와인',
		'코딩', '주식', '부동산', '재테크', '영어',
		'게임', '반려동물', '봉사', '드라이브'
	];

	$: interestOptions = $appSettings.interestTags && $appSettings.interestTags.length > 0 
		? $appSettings.interestTags 
		: defaultInterests;

	// 멤버십 정보
	let membership = {
		type: 'Basic',
		status: 'inactive',
		price: '무료',
		nextBillingDate: '-'
	};

	// 활동 통계
	let stats = {
		totalMeetings: 0,
		peopleMet: 0
	};

	// 대화평
	let reviews = [
		{ id: '1', text: '👂 경청을 잘해요', count: 0, color: '#e3f2fd', textColor: '#1976d2' },
		{ id: '2', text: '😄 유머 감각이 좋아요', count: 0, color: '#fff3e0', textColor: '#f57c00' },
		{ id: '3', text: '💡 통찰력이 있어요', count: 0, color: '#e8f5e9', textColor: '#388e3c' },
		{ id: '4', text: '🍯 목소리가 꿀', count: 0, color: '#f3e5f5', textColor: '#7b1fa2' }
	];

	// 1표 이상 획득한 뱃지만 필터링
	$: activeReviews = reviews.filter(r => r.count > 0);

	$: if ($user) {
		loadUserData($user);
	} else if (!$user && !isLoading) {
		// 로그아웃 처리
	}

	// 검색 키워드 생성 유틸리티
	function generateSearchKeywords(text) {
		if (!text) return [];
		const keywords = [];
		const cleanText = text.replace(/\s/g, '').toLowerCase();
		for (let i = 0; i < cleanText.length - 1; i++) {
			keywords.push(cleanText.substring(i, i + 2));
		}
		return keywords;
	}

	async function loadUserData(currentUser) {
		try {
			const userRef = doc(db, 'users', currentUser.uid);
			const docSnap = await getDoc(userRef);

			if (docSnap.exists()) {
				const data = docSnap.data();
				profile = { 
					...profile, 
					...data,
					gender: data.gender || '',
					job: data.job || '',
					interests: data.interests || []
				};

				// [추가] 저장된 알림 설정 불러오기
				if (data.notificationSettings) {
					notificationSettings = { ...notificationSettings, ...data.notificationSettings };
				}

				if (data.membership) {
					membership = {
						type: data.membership,
						status: data.membershipStatus || 'active',
						price: getPriceByMembership(data.membership),
						nextBillingDate: data.nextBillingDate || '-'
					};
				}

				const savedCounts = data.reviewCounts || {};
				reviews = reviews.map(r => ({
					...r,
					count: savedCounts[r.id] || 0
				}));
				
				stats.peopleMet = data.peopleMet || 0;
			} else {
				const newProfile = {
					nickname: currentUser.displayName || '익명 유저',
					age: 20,
					gender: '',
					job: '',
					interests: [],
					image: currentUser.photoURL || 'https://placehold.co/200x200/333/fff?text=ME',
					email: currentUser.email,
					membership: 'Basic',
					createdAt: new Date().toISOString(),
					notificationSettings: notificationSettings, // 초기 설정 저장
					_searchKeywords: [
						...generateSearchKeywords(currentUser.displayName || '익명 유저'),
						...generateSearchKeywords(currentUser.email?.split('@')[0])
					]
				};
				await setDoc(userRef, newProfile);
				profile = newProfile;
			}

			await fetchActivityStats(currentUser.uid);

		} catch (error) {
			console.error('프로필 로딩 실패:', error);
		} finally {
			isLoading = false;
		}
	}

	async function fetchActivityStats(uid) {
		try {
			const q = query(
				collection(db, 'meeting_applications'),
				where('userId', '==', uid),
				where('status', '==', 'accepted')
			);
			const snapshot = await getCountFromServer(q);
			const meetingCount = snapshot.data().count;

			stats.totalMeetings = meetingCount;
			if (stats.peopleMet === 0 && meetingCount > 0) {
				stats.peopleMet = meetingCount * 3; 
			}
		} catch (error) {
			console.error("통계 로딩 실패:", error);
		}
	}

	function getPriceByMembership(type) {
		switch (type) {
			case 'Pro': return '9,900원';
			case 'Standard': return '5,900원';
			default: return '무료';
		}
	}

	function startEdit() {
		editForm = JSON.parse(JSON.stringify(profile));
		isEditing = true;
	}

	async function toggleInterest(interest) {
		if (editForm.interests.includes(interest)) {
			editForm.interests = editForm.interests.filter(i => i !== interest);
		} else {
			if (editForm.interests.length >= 5) {
				return await modal.alert('관심사는 최대 5개까지 선택 가능합니다.');
			}
			editForm.interests = [...editForm.interests, interest];
		}
	}

	async function saveEdit() {
		if (!$user) return;

		try {
			const userRef = doc(db, 'users', $user.uid);
			const updateData = {
				nickname: editForm.nickname,
				age: Number(editForm.age),
				gender: editForm.gender,
				job: editForm.job,
				interests: editForm.interests,
				image: editForm.image,
				_searchKeywords: [
					...generateSearchKeywords(editForm.nickname),
					...generateSearchKeywords($user.email?.split('@')[0])
				]
			};

			await updateDoc(userRef, updateData);
			
			profile = { ...profile, ...updateData };
			isEditing = false;
			
			await modal.alert('프로필이 수정되었습니다.'); 
		} catch (error) {
			console.error('저장 실패:', error);
			await modal.alert('저장에 실패했습니다.');
		}
	}

	// [추가] 알림 설정 토글 핸들러
	async function toggleNotification(key) {
		if (!$user) return;
		
		// UI 상태 업데이트
		const newValue = !notificationSettings[key];
		notificationSettings[key] = newValue;

		try {
			const userRef = doc(db, 'users', $user.uid);
			await updateDoc(userRef, {
				[`notificationSettings.${key}`]: newValue
			});
		} catch (error) {
			console.error('알림 설정 저장 실패:', error);
			// 실패 시 롤백
			notificationSettings[key] = !newValue; 
			await modal.alert('설정 저장에 실패했습니다.');
		}
	}

	async function handleLogout() {
		if (await modal.confirm('정말 로그아웃 하시겠습니까?')) {
			try {
				await signOut(auth);
				await modal.alert('로그아웃 되었습니다.');
				goto('/login');
			} catch (error) {
				console.error('로그아웃 실패:', error);
			}
		}
	}
	
	function getGenderText(code) {
		if (code === 'M') return '남성';
		if (code === 'F') return '여성';
		return '';
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
		<Skeleton />
	{:else if $user}
		<section class="profile-section">
			<div class="avatar-container">
				<div class="avatar-wrapper">
					{#if isEditing}
						<ImageUploader 
							path="users" 
							bind:imageUrl={editForm.image} 
							objectFit="cover"
						/>
					{:else}
						<img src={profile.image} alt="프로필 이미지" />
					{/if}
				</div>
			</div>

			<div class="info-container">
				{#if isEditing}
					<div class="edit-form">
						<div class="input-group">
							<label for="nickname">닉네임</label>
							<input type="text" id="nickname" bind:value={editForm.nickname} placeholder="닉네임 입력" />
						</div>
						
						<div class="form-row">
							<div class="input-group half">
								<label for="age">나이</label>
								<input type="number" id="age" bind:value={editForm.age} />
							</div>
							<div class="input-group half">
								<label for="gender">성별</label>
								<select id="gender" bind:value={editForm.gender}>
									<option value="">선택</option>
									<option value="M">남성</option>
									<option value="F">여성</option>
								</select>
							</div>
						</div>

						<div class="input-group">
							<label for="job">직업</label>
							<input type="text" id="job" bind:value={editForm.job} placeholder="예: 개발자" />
						</div>

							<div class="input-group">
								<fieldset class="interest-fieldset">
								<legend class="interest-legend">관심사 (최대 5개)</legend>
								<div class="interest-selector">
								{#each interestOptions as option}
									<button 
										class="interest-chip {editForm.interests.includes(option) ?
										'selected' : ''}"
										on:click={() => toggleInterest(option)}
									>
										{option}
									</button>
								{/each}
							</div>
						</fieldset>
						</div>

						<button class="save-btn" on:click={saveEdit}>
							<Check size={16} /> 저장완료
						</button>
					</div>
				{:else}
					<div class="display-info">
						<h3 class="nickname">
							{profile.nickname} 
							<span class="age">
								({profile.age}세{#if profile.gender}, {getGenderText(profile.gender)}{/if})
							</span>
						</h3>
						<button class="edit-btn" on:click={startEdit}>
							<Edit2 size={14} /> 수정
						</button>
					</div>
					
					<div class="sub-info">
						{#if profile.job}
							<div class="info-item">
								<Briefcase size={14} /> <span>{profile.job}</span>
							</div>
						{/if}
					</div>

					{#if profile.interests && profile.interests.length > 0}
						<div class="interests-display">
							{#each profile.interests as interest}
								<span class="interest-tag">#{interest}</span>
							{/each}
						</div>
					{/if}

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
					<span class="active-badge {membership.status}">{membership.status === 'active' ?
					'구독중' : '미구독'}</span>
				</div>
				<div class="card-body">
					<p class="price-info">월 {membership.price}</p>
					{#if membership.status === 'active'}
						<p class="billing-date">다음 결제일: {membership.nextBillingDate}</p>
					{:else}
						<p class="billing-date">멤버십 혜택을 누려보세요!</p>
					{/if}
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
				{#if activeReviews.length > 0}
					{#each activeReviews as review}
						<div 
							class="tag" 
							style="background-color: {review.color}; color: {review.textColor};"
						>
							{review.text} <span class="tag-count">+{review.count}</span>
						</div>
					{/each}
				{:else}
					<p class="empty-text">아직 받은 대화평이 없습니다.</p>
				{/if}
			</div>
		</section>

		<section class="section">
			<h3 class="section-header">알림 설정</h3>
			<div class="settings-card">
				<div class="setting-row main">
					<div class="label-group">
						<Bell size={20} color="#4a5568" />
						<span>푸시 알림 받기</span>
					</div>
					<button 
						class="toggle-switch {notificationSettings.enabled ? 'on' : 'off'}" 
						on:click={() => toggleNotification('enabled')}
					>
						<div class="toggle-thumb"></div>
					</button>
				</div>

				{#if notificationSettings.enabled}
					<div class="sub-settings">
						<div class="setting-row">
							<span class="sub-label">참가 신청 알림 (호스트일 때)</span>
							<button 
								class="toggle-switch sm {notificationSettings.hostApplication ? 'on' : 'off'}" 
								on:click={() => toggleNotification('hostApplication')}
							>
								<div class="toggle-thumb"></div>
							</button>
						</div>
						<div class="setting-row">
							<span class="sub-label">참가 승인/거부 알림 (게스트일 때)</span>
							<button 
								class="toggle-switch sm {notificationSettings.guestStatus ? 'on' : 'off'}" 
								on:click={() => toggleNotification('guestStatus')}
							>
								<div class="toggle-thumb"></div>
							</button>
						</div>
						<div class="setting-row">
							<span class="sub-label">채팅 알림</span>
							<button 
								class="toggle-switch sm {notificationSettings.chat ? 'on' : 'off'}" 
								on:click={() => toggleNotification('chat')}
							>
								<div class="toggle-thumb"></div>
							</button>
						</div>
						<div class="setting-row">
							<span class="sub-label">대화평 등록 알림</span>
							<button 
								class="toggle-switch sm {notificationSettings.review ? 'on' : 'off'}" 
								on:click={() => toggleNotification('review')}
							>
								<div class="toggle-thumb"></div>
							</button>
						</div>
						<div class="setting-row">
							<span class="sub-label">이벤트 및 마케팅 알림</span>
							<button 
								class="toggle-switch sm {notificationSettings.event ? 'on' : 'off'}" 
								on:click={() => toggleNotification('event')}
							>
								<div class="toggle-thumb"></div>
							</button>
						</div>
					</div>
				{/if}
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
	.page-container { padding: 20px 16px; padding-bottom: 40px;
	}
	.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
	.header-actions { display: flex; gap: 8px; }
	.page-title { font-size: 22px;
		font-weight: bold; margin: 0; }
	.icon-btn { background: none; border: none; cursor: pointer; padding: 6px; color: #333; border-radius: 50%;
		transition: background-color 0.2s; }
	.icon-btn:hover { background-color: #f0f0f0; }
	.logout-btn { color: #e53e3e; }
	.empty-state { text-align: center; padding: 40px 0; color: #666;
	}
	.login-link { display: inline-block; margin-top: 10px; color: #1976d2; text-decoration: underline; }

	.profile-section { display: flex; flex-direction: column; align-items: center; margin-bottom: 32px;
	}
	.avatar-container { margin-bottom: 16px; }
	.avatar-wrapper { width: 100px; height: 100px; border-radius: 10%; overflow: visible; position: relative; border: 3px solid white;
		box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
	
	.avatar-wrapper img { width: 100%; height: 100%; object-fit: cover; }

	.info-container { width: 100%; display: flex;
		flex-direction: column; align-items: center; justify-content: center; }
	.display-info { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
	.nickname { font-size: 20px;
		font-weight: bold; margin: 0; }
	.age { font-weight: normal; font-size: 16px; color: #666; }
	.email-text { font-size: 13px; color: #999;
		margin: 12px 0 0 0; }
	.edit-btn { background-color: #f0f0f0; border: none; padding: 6px 10px; border-radius: 16px; font-size: 12px; display: flex;
		align-items: center; gap: 4px; cursor: pointer; color: #555; }

	.sub-info { display: flex; gap: 12px; margin-bottom: 8px; flex-wrap: wrap; justify-content: center;
	}
	.info-item { display: flex; align-items: center; gap: 4px; font-size: 13px; color: #555; background-color: #f5f7fa; padding: 4px 8px; border-radius: 6px;
	}
	.interests-display { display: flex; flex-wrap: wrap; gap: 6px; justify-content: center; max-width: 280px; margin-top: 4px; }
	.interest-tag { font-size: 12px; color: #3182ce;
		background-color: #ebf8ff; padding: 2px 8px; border-radius: 12px; font-weight: 500; }

	.edit-form { display: flex; flex-direction: column; gap: 16px; width: 100%;
		max-width: 320px; background-color: #fff; padding: 20px; border-radius: 16px; border: 1px solid #eee; box-shadow: 0 4px 20px rgba(0,0,0,0.05);
	}
	.form-row { display: flex; gap: 12px; }
	.input-group { display: flex; flex-direction: column; gap: 6px; }
	.input-group.half { flex: 1;
	}
	.input-group label { font-size: 13px; color: #666; font-weight: bold; margin-left: 2px; }
	.input-group input, .input-group select { width: 100%;
		padding: 10px 12px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 14px; box-sizing: border-box; transition: border-color 0.2s; background-color: #fff;
	}
	.input-group input:focus, .input-group select:focus { border-color: #3182ce; outline: none; }

	.interest-selector { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 4px;
	}
	.interest-chip { background-color: #f7fafc; border: 1px solid #e2e8f0; padding: 6px 12px; border-radius: 20px; font-size: 13px; color: #4a5568; cursor: pointer;
		transition: all 0.2s; }
	.interest-chip.selected { background-color: #3182ce; color: white; border-color: #3182ce; font-weight: bold; }

	.save-btn { margin-top: 12px; background-color: #1a1a1a;
		color: white; border: none; padding: 14px; border-radius: 10px; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;
		font-size: 15px; }

	.stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 24px; }
	.stat-card { background-color: white; padding: 16px;
		border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); display: flex; align-items: center; gap: 12px; }
	.stat-icon { width: 40px; height: 40px;
		border-radius: 12px; display: flex; align-items: center; justify-content: center; }
	.bg-blue { background-color: #e3f2fd; }
	.bg-orange { background-color: #fff3e0; }
	.stat-info { display: flex;
		flex-direction: column; }
	.stat-label { font-size: 12px; color: #888; }
	.stat-value { font-size: 16px; font-weight: bold; color: #333; }

	.section { margin-bottom: 24px;
	}
	.section-header { font-size: 16px; font-weight: bold; margin: 0 0 12px 0; color: #333;
	}

	.membership-card { background: linear-gradient(135deg, #333 0%, #555 100%); color: white; padding: 20px; border-radius: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);
	}
	.card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
	.plan-info { display: flex; align-items: center; gap: 8px;
	}
	.plan-name { font-size: 18px; font-weight: bold; }
	.active-badge { background-color: rgba(255,255,255,0.2); font-size: 11px; padding: 4px 8px; border-radius: 12px; font-weight: bold;
	}
	.active-badge.inactive { background-color: #999; color: #eee; }
	.price-info { font-size: 24px; font-weight: bold; margin: 0 0 4px 0;
	}
	.billing-date { font-size: 13px; color: rgba(255,255,255,0.7); margin: 0; }
	.card-footer { margin-top: 16px; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.1);
	}
	.manage-btn { background: none; border: 1px solid rgba(255,255,255,0.4); color: white; padding: 8px 12px; border-radius: 20px; font-size: 12px; cursor: pointer;
		display: flex; align-items: center; gap: 6px; transition: background 0.2s; }
	.manage-btn:hover { background-color: rgba(255,255,255,0.1); }

	.review-tags { display: flex; flex-wrap: wrap;
		gap: 8px; }
	.tag { padding: 8px 12px; border-radius: 20px; font-size: 13px; font-weight: 500; display: flex; align-items: center; gap: 6px;
	}
	.tag-count { font-size: 11px; font-weight: bold; opacity: 0.8; }
	
	.empty-text { font-size: 14px; color: #999;
		margin: 0; }

	/* [추가] 알림 설정 스타일 */
	.settings-card {
		background-color: white;
		border-radius: 16px;
		box-shadow: 0 2px 8px rgba(0,0,0,0.05);
		overflow: hidden;
	}
	.setting-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 16px 20px;
		border-bottom: 1px solid #f5f7fa;
	}
	.setting-row:last-child { border-bottom: none; }
	.setting-row.main {
		background-color: #fff;
		font-weight: 600;
	}
	.label-group {
		display: flex;
		align-items: center;
		gap: 10px;
		font-size: 15px;
		color: #2d3748;
	}
	.sub-settings {
		background-color: #fafbfc;
		border-top: 1px solid #f0f0f0;
	}
	.sub-label {
		font-size: 14px;
		color: #4a5568;
		padding-left: 8px;
	}

	/* 토글 스위치 스타일 */
	.toggle-switch {
		width: 44px;
		height: 24px;
		border-radius: 12px;
		background-color: #e2e8f0;
		border: none;
		position: relative;
		cursor: pointer;
		transition: background-color 0.2s;
		padding: 2px;
	}
	.toggle-switch.on {
		background-color: #3182ce;
	}
	.toggle-thumb {
		width: 20px;
		height: 20px;
		background-color: white;
		border-radius: 50%;
		transition: transform 0.2s;
		box-shadow: 0 1px 2px rgba(0,0,0,0.1);
	}
	.toggle-switch.on .toggle-thumb {
		transform: translateX(20px);
	}
	
	/* 작은 토글 스위치 */
	.toggle-switch.sm {
		width: 36px;
		height: 20px;
	}
	.toggle-switch.sm .toggle-thumb {
		width: 16px;
		height: 16px;
	}
	.toggle-switch.sm.on .toggle-thumb {
		transform: translateX(16px);
	}
</style>