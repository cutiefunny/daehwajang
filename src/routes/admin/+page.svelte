<script>
	import { onMount } from 'svelte';
	import { db } from '$lib/firebase';
	import { 
		collection, getCountFromServer, query, where, orderBy, limit, getDocs 
	} from 'firebase/firestore';
	import { Users, Calendar, MessageSquare, DollarSign } from 'lucide-svelte';
	
	// 공통 모달 컴포넌트 가져오기
	import UserEditModal from '$lib/components/admin/UserEditModal.svelte';
	import MeetingEditModal from '$lib/components/admin/MeetingEditModal.svelte';

	let stats = [
		{ id: 'users', label: '총 회원수', value: '-', change: '', icon: Users, color: 'blue', link: '/admin/users' },
		{ id: 'meetings', label: '활성 모임', value: '-', change: '', icon: Calendar, color: 'green', link: '/admin/meetings' },
		{ id: 'chats', label: '개설된 채팅방', value: '-', change: '', icon: MessageSquare, color: 'purple', link: '/admin/chats' },
		{ id: 'revenue', label: '예상 매출', value: '-', change: '', icon: DollarSign, color: 'orange', link: '/admin/payments' }
	];

	let recentUsers = [];
	let recentMeetings = [];
	let isLoading = true;

	// 모달 상태
	let isUserModalOpen = false;
	let selectedUser = null;
	let isMeetingModalOpen = false;
	let selectedMeeting = null;

	onMount(async () => {
		try {
			const now = new Date().toISOString();

			// 1. 통계
			const usersCountSnap = await getCountFromServer(collection(db, 'users'));
			const meetingsQuery = query(collection(db, 'meetings'), where('date', '>=', now));
			const meetingsCountSnap = await getCountFromServer(meetingsQuery);
			const chatsCountSnap = await getCountFromServer(collection(db, 'chatRooms'));

			const userCount = usersCountSnap.data().count;
			const meetingCount = meetingsCountSnap.data().count;
			const chatCount = chatsCountSnap.data().count;
			const estimatedRevenue = meetingCount * 2200000;

			stats = stats.map(stat => {
				if (stat.id === 'users') return { ...stat, value: `${userCount}명` };
				if (stat.id === 'meetings') return { ...stat, value: `${meetingCount}개` };
				if (stat.id === 'chats') return { ...stat, value: `${chatCount}개` };
				if (stat.id === 'revenue') return { ...stat, value: `₩ ${(estimatedRevenue / 1000000).toFixed(1)}M` };
				return stat;
			});

			// 2. 최근 가입 회원
			const recentUsersQuery = query(collection(db, 'users'), orderBy('createdAt', 'desc'), limit(5));
			const recentUsersSnap = await getDocs(recentUsersQuery);
			recentUsers = recentUsersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

			// 3. 최근 개설 모임
			const recentMeetingsQuery = query(collection(db, 'meetings'), orderBy('createdAt', 'desc'), limit(5));
			const recentMeetingsSnap = await getDocs(recentMeetingsQuery);
			recentMeetings = recentMeetingsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

		} catch (error) {
			console.error("대시보드 데이터 로딩 실패:", error);
		} finally {
			isLoading = false;
		}
	});

	// --- 회원 수정 핸들러 ---
	function openUserModal(user) {
		selectedUser = user;
		isUserModalOpen = true;
	}
	function handleUserSaved(e) {
		const updatedUser = e.detail;
		recentUsers = recentUsers.map(u => u.id === updatedUser.id ? updatedUser : u);
		isUserModalOpen = false;
		selectedUser = null;
	}

	// --- 모임 수정 핸들러 ---
	function openMeetingModal(meeting) {
		selectedMeeting = meeting;
		isMeetingModalOpen = true;
	}
	function handleMeetingSaved(e) {
		const updatedMeeting = e.detail;
		recentMeetings = recentMeetings.map(m => m.id === updatedMeeting.id ? updatedMeeting : m);
		isMeetingModalOpen = false;
		selectedMeeting = null;
	}

	function formatDate(isoString) {
		if (!isoString) return '-';
		return new Date(isoString).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' });
	}
</script>

<div class="dashboard">
	<div class="stats-grid">
		{#each stats as stat}
			<a href={stat.link} class="stat-card">
				<div class="stat-header">
					<span class="label">{stat.label}</span>
					<div class="icon-box {stat.color}">
						<stat.icon size={20} />
					</div>
				</div>
				<div class="stat-value">{stat.value}</div>
				<div class="stat-change"><span class="text-muted">실시간 집계 기준</span></div>
			</a>
		{/each}
	</div>

	<div class="recent-section">
		<div class="card">
			<h3>최근 가입 회원</h3>
			<div class="table-wrapper">
				<table>
					<thead>
						<tr>
							<th>사용자</th>
							<th>가입일</th>
							<th>상태</th>
						</tr>
					</thead>
					<tbody>
						{#if recentUsers.length > 0}
							{#each recentUsers as user}
								<tr on:click={() => openUserModal(user)} class="clickable-row">
									<td>
										<div class="user-cell">
											<div class="avatar-mini">
												{#if user.image}
													<img src={user.image} alt={user.nickname} />
												{:else}
													<span>{user.nickname?.[0] || 'U'}</span>
												{/if}
											</div>
											<span>{user.nickname || '이름 없음'}</span>
										</div>
									</td>
									<td>{formatDate(user.createdAt)}</td>
									<td><span class="status {user.status || 'active'}">{user.status || 'Active'}</span></td>
								</tr>
							{/each}
						{:else}
							<tr><td colspan="3" class="empty-row">데이터가 없습니다.</td></tr>
						{/if}
					</tbody>
				</table>
			</div>
		</div>

		<div class="card">
			<h3>최근 개설된 모임</h3>
			<div class="list-wrapper">
				{#if recentMeetings.length > 0}
					{#each recentMeetings as meeting}
						<div class="list-item clickable-row" on:click={() => openMeetingModal(meeting)}>
							<div class="item-info">
								<span class="item-title">{meeting.title}</span>
								<span class="item-sub">{meeting.category} • {formatDate(meeting.date)} 예정</span>
							</div>
						</div>
					{/each}
				{:else}
					<div class="empty-row">개설된 모임이 없습니다.</div>
				{/if}
			</div>
		</div>
	</div>
</div>

{#if isUserModalOpen && selectedUser}
	<UserEditModal 
		user={selectedUser} 
		on:close={() => isUserModalOpen = false} 
		on:save={handleUserSaved} 
	/>
{/if}

{#if isMeetingModalOpen && selectedMeeting}
	<MeetingEditModal 
		meeting={selectedMeeting} 
		on:close={() => isMeetingModalOpen = false} 
		on:save={handleMeetingSaved} 
	/>
{/if}

<style>
	.dashboard { padding-bottom: 40px; }
	.stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 24px; margin-bottom: 32px; }
	.stat-card { background: white; padding: 24px; border-radius: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); text-decoration: none; color: inherit; display: block; transition: transform 0.2s; cursor: pointer; }
	.stat-card:hover { transform: translateY(-4px); }
	.stat-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; }
	.label { color: #718096; font-size: 14px; font-weight: 500; }
	.icon-box { width: 40px; height: 40px; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white; }
	.icon-box.blue { background-color: #4299e1; }
	.icon-box.green { background-color: #48bb78; }
	.icon-box.purple { background-color: #9f7aea; }
	.icon-box.orange { background-color: #ed8936; }
	.stat-value { font-size: 24px; font-weight: bold; color: #2d3748; margin-bottom: 4px; }
	.stat-change { font-size: 12px; color: #48bb78; font-weight: 600; }
	.text-muted { color: #a0aec0; font-weight: normal; }

	.recent-section { display: grid; grid-template-columns: 2fr 1fr; gap: 24px; }
	@media (max-width: 1024px) { .recent-section { grid-template-columns: 1fr; } }

	.card { background: white; padding: 24px; border-radius: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
	.card h3 { margin: 0 0 20px 0; font-size: 16px; color: #2d3748; }

	table { width: 100%; border-collapse: collapse; }
	th { text-align: left; color: #718096; font-size: 12px; font-weight: 600; padding-bottom: 12px; border-bottom: 1px solid #e2e8f0; }
	td { padding: 12px 0; font-size: 14px; color: #4a5568; border-bottom: 1px solid #f7fafc; }
	.user-cell { display: flex; align-items: center; gap: 8px; }
	.avatar-mini { width: 24px; height: 24px; border-radius: 50%; background-color: #eee; overflow: hidden; display: flex; align-items: center; justify-content: center; font-size: 10px; color: #666; }
	.avatar-mini img { width: 100%; height: 100%; object-fit: cover; }
	.status { padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 600; text-transform: capitalize; }
	.status.active { background-color: #c6f6d5; color: #2f855a; }
	.status.suspended { background-color: #fed7d7; color: #c53030; }

	.list-item { display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid #f7fafc; }
	.item-info { display: flex; flex-direction: column; gap: 4px; }
	.item-title { font-size: 14px; font-weight: 500; color: #2d3748; }
	.item-sub { font-size: 12px; color: #718096; }
	.btn-sm { padding: 4px 12px; border: 1px solid #e2e8f0; background: white; border-radius: 4px; font-size: 12px; cursor: pointer; }
	.empty-row { padding: 20px 0; text-align: center; color: #999; font-size: 14px; }
	.clickable-row { cursor: pointer; transition: background 0.1s; }
	.clickable-row:hover { background-color: #f7fafc; }
</style>