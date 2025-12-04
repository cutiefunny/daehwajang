<script>
	import { onMount } from 'svelte';
	import { db } from '$lib/firebase';
	import { 
		collection, 
		getDocs, 
		query, 
		orderBy, 
		doc, 
		updateDoc, 
		limit, 
		startAfter, 
		getCountFromServer,
		where 
	} from 'firebase/firestore';
	import { Search, CheckCircle, XCircle, AlertCircle, RotateCcw } from 'lucide-svelte';
	import UserEditModal from '$lib/components/admin/UserEditModal.svelte';
	import Pagination from '$lib/components/Pagination.svelte';
	import Skeleton from '$lib/components/Skeleton.svelte';

	let users = [];
	let isLoading = true;
	let searchTerm = '';
	// 페이지네이션 상태
	let currentPage = 1;
	const itemsPerPage = 10;
	let totalItems = 0;
	let lastVisible = null;
	let pageStartDocs = []; 

	let isModalOpen = false;
	let selectedUser = null;

	onMount(() => {
		fetchTotalCount();
		fetchUsers(); 
	});

	async function fetchTotalCount() {
		try {
			const coll = collection(db, 'users');
			const snapshot = await getCountFromServer(coll);
			totalItems = snapshot.data().count;
		} catch (error) {
			console.error("카운트 로딩 실패:", error);
		}
	}

	async function fetchUsers(direction = 'next') {
		isLoading = true;
		try {
			let q = collection(db, 'users');
			const trimmedTerm = searchTerm.trim().replace(/\s/g, '').toLowerCase();
			// [수정] 검색 로직 변경 (Bi-gram)
			if (trimmedTerm && trimmedTerm.length >= 2) {
				// 2글자 이상일 경우 _searchKeywords 배열에 포함되어 있는지 검사
				q = query(
					q, 
					where('_searchKeywords', 'array-contains', trimmedTerm),
					limit(itemsPerPage)
				);
			} else {
				// 검색어가 없거나 1글자인 경우 기본 정렬
				q = query(q, orderBy('createdAt', 'desc'), limit(itemsPerPage));
			}

			// 페이지네이션 (검색 중일 때는 단순 이전/다음만 지원하거나, 
			// orderBy와 복합 인덱스가 없으면 커서 페이징이 까다로울 수 있어 주의)
			if (direction === 'next' && lastVisible) {
				q = query(q, startAfter(lastVisible));
			} else if (direction === 'prev' && pageStartDocs.length > 1) {
				const prevDoc = pageStartDocs[currentPage - 2];
				q = query(q, startAfter(prevDoc));
				if (currentPage === 2) {
					// 1페이지로 돌아갈 때 쿼리 초기화
					let resetQ = collection(db, 'users');
					if (trimmedTerm && trimmedTerm.length >= 2) {
						resetQ = query(resetQ, 
							where('_searchKeywords', 'array-contains', trimmedTerm),
							limit(itemsPerPage)
						);
					} else {
						resetQ = query(resetQ, orderBy('createdAt', 'desc'), limit(itemsPerPage));
					}
					q = resetQ;
				}
			} else if (currentPage === 1) {
				// 초기 로딩
			}

			const querySnapshot = await getDocs(q);
			if (!querySnapshot.empty) {
				lastVisible = querySnapshot.docs[querySnapshot.docs.length - 1];
				if (direction === 'next') {
					if (!pageStartDocs[currentPage - 1]) {
						pageStartDocs[currentPage - 1] = querySnapshot.docs[0];
					}
				}
			}

			users = querySnapshot.docs.map(doc => {
				const data = doc.data();
				return {
					id: doc.id,
					...data,
					gender: data.gender || '-',
					membership: data.membership || 'Basic',
					status: data.status || 'active'
				};
			});
		} catch (error) {
			console.error("회원 목록 로딩 실패:", error);
		} finally {
			isLoading = false;
		}
	}

	function handleSearch() {
		if (searchTerm.trim().length === 1) {
			alert('검색어는 2글자 이상 입력해주세요.');
			return;
		}
		currentPage = 1;
		pageStartDocs = [];
		lastVisible = null;
		fetchUsers();
	}

	function handleReset() {
		searchTerm = '';
		currentPage = 1;
		pageStartDocs = [];
		lastVisible = null;
		fetchUsers();
		fetchTotalCount();
	}

	async function changePage(newPage) {
		if (newPage > currentPage) {
			await fetchUsers('next');
			currentPage = newPage;
		} else if (newPage < currentPage) {
			if (newPage === 1) {
				handleReset(); // 1페이지 이동 시 리셋처럼 처리
			} else {
				await fetchUsers('prev');
				currentPage = newPage;
			}
		}
	}

	// [추가] 처음 페이지로 이동
	async function goToFirst() {
		currentPage = 1;
		pageStartDocs = [];
		lastVisible = null;
		await fetchUsers();
	}

	// [추가] 마지막 페이지로 이동 (반복 fetch)
	async function goToLast() {
		const target = Math.ceil(totalItems / itemsPerPage) || 1;
		if (target <= 1) return;
		// reset
		currentPage = 1;
		pageStartDocs = [];
		lastVisible = null;
		const maxIterations = Math.min(target, 50); // safety cap
		for (let p = 2; p <= maxIterations; p++) {
			await fetchUsers('next');
			currentPage = p;
		}
		if (target > maxIterations) console.warn('Stopped at iteration cap when jumping to last page');
	}

	async function toggleStatus(user) {
		const newStatus = user.status === 'active' ? 'suspended' : 'active';
		if (!confirm(`${user.nickname} 님의 상태를 변경하시겠습니까?`)) return;
		try {
			const userRef = doc(db, 'users', user.id);
			await updateDoc(userRef, { status: newStatus });
			users = users.map(u => u.id === user.id ? { ...u, status: newStatus } : u);
		} catch (error) { console.error(error);
		}
	}

	// [추가] 이미지 로드 에러 핸들러
	function handleImageError(userId) {
		// 해당 유저의 이미지를 null로 설정하여 대체 UI(이니셜)가 렌더링되도록 함
		users = users.map(u => u.id === userId ? { ...u, image: null } : u);
	}

	function formatDate(isoString) {
		if (!isoString) return '-';
		return new Date(isoString).toLocaleDateString('ko-KR');
	}

	function openEditModal(user) {
		selectedUser = user;
		isModalOpen = true;
	}

	function handleUserSaved(e) {
		const updatedUser = e.detail;
		users = users.map(u => u.id === updatedUser.id ? updatedUser : u);
		isModalOpen = false;
		selectedUser = null;
	}

	$: totalPages = Math.ceil(totalItems / itemsPerPage);
</script>

<div class="page-header">
	<h2>회원 관리 <span class="count">({totalItems}명)</span></h2>
	<div class="search-box">
		<Search size={18} color="#718096" />
		<input 
			type="text" 
			placeholder="2글자 이상 입력 (닉네임/이메일)" 
			bind:value={searchTerm} 
			on:keydown={(e) => e.key === 'Enter' && handleSearch()}
		/>
		{#if searchTerm}
			<button class="reset-btn" on:click={handleReset}>
				<RotateCcw size={14} />
			</button>
		{/if}
	</div>
</div>

<div class="table-container">
	{#if isLoading}
		<Skeleton count={5} />
	{:else}
		<table>
			<thead>
				<tr>
					<th>프로필</th>
					<th>이름 / 이메일</th>
					<th>성별</th>
					<th>나이</th>
					<th>멤버십</th>
					<th>가입일</th>
					<th>상태</th>
					<th>관리</th>
				</tr>
			</thead>
			<tbody>
				{#if users.length > 0}
					{#each users as user (user.id)}
						<tr on:click={() => openEditModal(user)} class="clickable-row">
							<td>
								<div class="avatar">
									{#if user.image}
										<img 
											src={user.image} 
											alt={user.nickname}
											referrerpolicy="no-referrer"
											on:error={() => handleImageError(user.id)}
										/>
									{:else}
										<span class="initial">{user.nickname?.[0] || 'U'}</span>
									{/if}
								</div>
							</td>
							<td>
								<div class="user-info">
									<span class="nickname">{user.nickname}</span>
									<span class="email">{user.email}</span>
								</div>
							</td>
							<td>{user.gender === 'M' ? '남성' : user.gender === 'F' ? '여성' : user.gender}</td>
							<td>{user.age}세</td>
							<td>
								<span class="badge membership {user.membership.toLowerCase()}">{user.membership}</span>
							</td>
							<td class="date">{formatDate(user.createdAt)}</td>
							<td>
								<span class="status-indicator {user.status}">
									{#if user.status === 'active'} <CheckCircle size={14} /> 정상
									{:else if user.status === 'suspended'} <XCircle size={14} /> 정지
									{:else} <AlertCircle size={14} /> 대기 {/if}
								</span>
							</td>
							<td>
								<button class="action-btn" on:click|stopPropagation={() => toggleStatus(user)}>
									{user.status === 'active' ? '정지' : '해제'}
								</button>
							</td>
						</tr>
					{/each}
				{:else}
					<tr><td colspan="8" class="empty-message">검색 결과가 없습니다.</td></tr>
				{/if}
			</tbody>
		</table>

		<Pagination {currentPage} totalPages={totalPages}
			on:first={goToFirst}
			on:prev={() => changePage(currentPage - 1)}
			on:next={() => changePage(currentPage + 1)}
			on:last={goToLast}
		/>
	{/if}
</div>

{#if isModalOpen && selectedUser}
	<UserEditModal 
		user={selectedUser} 
		on:close={() => isModalOpen = false} 
		on:save={handleUserSaved} 
	/>
{/if}

<style>
	.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
	h2 { margin: 0; font-size: 24px; color: #2d3748; display: flex; align-items: center; gap: 8px; }
	.count { font-size: 16px; color: #718096; font-weight: normal; }
	
	.search-box { display: flex; align-items: center; background: white; padding: 8px 16px; border-radius: 8px; border: 1px solid #e2e8f0; gap: 8px; width: 300px; }
	.search-box input { border: none; outline: none; width: 100%; font-size: 14px; }
	.reset-btn { background: none; border: none; cursor: pointer; color: #a0aec0; padding: 0; display: flex; align-items: center; }
	.reset-btn:hover { color: #4a5568; }

	.table-container { background: white; border-radius: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); overflow: hidden; display: flex; flex-direction: column; }
	table { width: 100%; border-collapse: collapse; min-width: 800px; }
	th { text-align: left; padding: 16px 24px; background-color: #f7fafc; color: #718096; font-size: 12px; font-weight: 600; text-transform: uppercase; border-bottom: 1px solid #e2e8f0; }
	td { padding: 16px 24px; border-bottom: 1px solid #edf2f7; vertical-align: middle; font-size: 14px; color: #4a5568; }
	tr:last-child td { border-bottom: none; }
	.clickable-row { cursor: pointer; transition: background 0.1s; }
	.clickable-row:hover { background-color: #f0f4f8; }

	.avatar { width: 40px; height: 40px; border-radius: 50%; overflow: hidden; background-color: #edf2f7; display: flex; align-items: center; justify-content: center; }
	.avatar img { width: 100%; height: 100%; object-fit: cover; }
	.initial { font-weight: bold; color: #718096; }
	.user-info { display: flex; flex-direction: column; }
	.nickname { font-weight: 600; color: #2d3748; }
	.email { font-size: 12px; color: #a0aec0; }
	.badge { padding: 4px 8px; border-radius: 12px; font-size: 11px; font-weight: 700; text-transform: uppercase; }
	.badge.pro { background-color: #e9d8fd; color: #6b46c1; }
	.badge.basic { background-color: #edf2f7; color: #4a5568; }
	.badge.standard { background-color: #c6f6d5; color: #276749; }
	.status-indicator { display: flex; align-items: center; gap: 6px; font-weight: 600; font-size: 13px; }
	.status-indicator.active { color: #48bb78; }
	.status-indicator.suspended { color: #e53e3e; }
	.status-indicator.pending { color: #ed8936; }
	.action-btn { padding: 6px 12px; border: 1px solid #e2e8f0; background: white; border-radius: 6px; font-size: 12px; cursor: pointer; }
	.action-btn:hover { background-color: #edf2f7; border-color: #cbd5e0; }
	.empty-message { text-align: center; padding: 40px; color: #a0aec0; }
</style>