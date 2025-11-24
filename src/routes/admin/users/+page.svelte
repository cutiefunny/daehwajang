<script>
	import { onMount } from 'svelte';
	import { db } from '$lib/firebase';
	import { collection, getDocs, query, orderBy, doc, updateDoc } from 'firebase/firestore';
	import { Search, CheckCircle, XCircle, AlertCircle, ChevronLeft, ChevronRight, X } from 'lucide-svelte';
	import ImageUploader from '$lib/components/ImageUploader.svelte';

	let users = [];
	let isLoading = true;
	let searchTerm = '';

	// 페이지네이션
	let currentPage = 1;
	const itemsPerPage = 10;

	// 모달 상태
	let isModalOpen = false;
	let selectedUser = null; // 수정할 유저 데이터 복사본
	let isSaving = false;

	// 회원 목록 불러오기
	async function fetchUsers() {
		isLoading = true;
		try {
			const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
			const querySnapshot = await getDocs(q);
			
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

	// 상세/수정 모달 열기
	function openEditModal(user) {
		selectedUser = { ...user }; // 객체 복사 (수정 취소 시 원본 유지 위해)
		isModalOpen = true;
	}

	function closeModal() {
		isModalOpen = false;
		selectedUser = null;
	}

	// 회원 정보 저장
	async function saveUserChanges() {
		if (!selectedUser) return;
		isSaving = true;

		try {
			const userRef = doc(db, 'users', selectedUser.id);
			
			// 업데이트할 필드 정리
			const updates = {
				nickname: selectedUser.nickname,
				image: selectedUser.image,
				job: selectedUser.job,
				age: Number(selectedUser.age),
				gender: selectedUser.gender,
				membership: selectedUser.membership,
				status: selectedUser.status
			};

			await updateDoc(userRef, updates);

			// 로컬 목록 업데이트
			users = users.map(u => u.id === selectedUser.id ? { ...u, ...updates } : u);
			
			alert('회원 정보가 수정되었습니다.');
			closeModal();
		} catch (error) {
			console.error("수정 실패:", error);
			alert("수정 중 오류가 발생했습니다.");
		} finally {
			isSaving = false;
		}
	}

	// 상태 변경 (리스트에서 바로 변경)
	async function toggleStatus(user) {
		const newStatus = user.status === 'active' ? 'suspended' : 'active';
		if (!confirm(`${user.nickname} 님의 상태를 변경하시겠습니까?`)) return;

		try {
			const userRef = doc(db, 'users', user.id);
			await updateDoc(userRef, { status: newStatus });
			users = users.map(u => u.id === user.id ? { ...u, status: newStatus } : u);
		} catch (error) { console.error(error); }
	}

	function formatDate(isoString) {
		if (!isoString) return '-';
		return new Date(isoString).toLocaleDateString('ko-KR');
	}

	// 검색 및 페이지네이션
	$: filteredUsers = users.filter(user => 
		user.nickname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
		user.email?.toLowerCase().includes(searchTerm.toLowerCase())
	);
	$: if (searchTerm) currentPage = 1;
	$: totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
	$: paginatedUsers = filteredUsers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

	function goToPage(page) { if (page >= 1 && page <= totalPages) currentPage = page; }

	onMount(() => { fetchUsers(); });
</script>

<div class="page-header">
	<h2>회원 관리</h2>
	<div class="search-box">
		<Search size={18} color="#718096" />
		<input type="text" placeholder="이름 또는 이메일 검색" bind:value={searchTerm} />
	</div>
</div>

<div class="table-container">
	{#if isLoading}
		<div class="loading">데이터를 불러오는 중...</div>
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
				{#if paginatedUsers.length > 0}
					{#each paginatedUsers as user}
						<tr on:click={() => openEditModal(user)} class="clickable-row">
							<td>
								<div class="avatar">
									{#if user.image}
										<img src={user.image} alt={user.nickname} />
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

		{#if totalPages > 1}
			<div class="pagination">
				<button class="page-btn" disabled={currentPage === 1} on:click={() => goToPage(currentPage - 1)}><ChevronLeft size={16} /></button>
				<span class="page-info">Page <strong>{currentPage}</strong> of {totalPages}</span>
				<button class="page-btn" disabled={currentPage === totalPages} on:click={() => goToPage(currentPage + 1)}><ChevronRight size={16} /></button>
			</div>
		{/if}
	{/if}
</div>

{#if isModalOpen && selectedUser}
	<div 
		class="modal-overlay" 
		on:click={closeModal} 
		on:keydown={(e) => e.key === 'Escape' && closeModal()}
		role="button"
		tabindex="0"
	>
		<div 
			class="modal-content" 
			on:click|stopPropagation 
			on:keydown|stopPropagation
			role="button"
			tabindex="0"
		>
			<div class="modal-header">
				<h3>회원 정보 수정</h3>
				<button class="close-btn" on:click={closeModal}><X size={20} /></button>
			</div>
			
			<div class="modal-body">
				<div class="form-row">
					<div class="profile-edit-section">
						<div class="uploader-wrapper">
							<ImageUploader 
								path="users" 
								bind:imageUrl={selectedUser.image} 
								objectFit="cover"
							/>
						</div>
					</div>
					
					<div class="info-edit-section">
						<div class="form-group">
							<label>
								이메일 (수정불가)
								<input type="text" value={selectedUser.email} disabled class="disabled-input" />
							</label>
						</div>
						<div class="form-group">
							<label>
								닉네임
								<input type="text" bind:value={selectedUser.nickname} />
							</label>
						</div>
						<div class="form-group">
							<label>
								직업
								<input type="text" bind:value={selectedUser.job} />
							</label>
						</div>
					</div>
				</div>

				<div class="form-row three-col">
					<div class="form-group">
						<label>
							나이
							<input type="number" bind:value={selectedUser.age} />
						</label>
					</div>
					<div class="form-group">
						<label>
							성별
							<select bind:value={selectedUser.gender}>
								<option value="M">남성</option>
								<option value="F">여성</option>
							</select>
						</label>
					</div>
					<div class="form-group">
						<label>
							멤버십
							<select bind:value={selectedUser.membership}>
								<option value="Basic">Basic</option>
								<option value="Standard">Standard</option>
								<option value="Pro">Pro</option>
							</select>
						</label>
					</div>
				</div>

				<div class="form-group">
					<span>상태</span>
					<div class="radio-group">
						<label class="radio-label">
							<input type="radio" bind:group={selectedUser.status} value="active" />
							<span class="active">정상 (Active)</span>
						</label>
						<label class="radio-label">
							<input type="radio" bind:group={selectedUser.status} value="suspended" />
							<span class="suspended">정지 (Suspended)</span>
						</label>
						<label class="radio-label">
							<input type="radio" bind:group={selectedUser.status} value="pending" />
							<span class="pending">대기 (Pending)</span>
						</label>
					</div>
				</div>
			</div>

			<div class="modal-footer">
				<button class="cancel-btn" on:click={closeModal}>취소</button>
				<button class="submit-btn" on:click={saveUserChanges} disabled={isSaving}>
					{isSaving ? '저장 중...' : '수정 완료'}
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	/* 기존 스타일 유지 */
	.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
	h2 { margin: 0; font-size: 24px; color: #2d3748; }
	.search-box { display: flex; align-items: center; background: white; padding: 8px 16px; border-radius: 8px; border: 1px solid #e2e8f0; gap: 8px; width: 300px; }
	.search-box input { border: none; outline: none; width: 100%; font-size: 14px; }
	.table-container { background: white; border-radius: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); overflow: hidden; display: flex; flex-direction: column; }
	table { width: 100%; border-collapse: collapse; min-width: 800px; }
	th { text-align: left; padding: 16px 24px; background-color: #f7fafc; color: #718096; font-size: 12px; font-weight: 600; text-transform: uppercase; border-bottom: 1px solid #e2e8f0; }
	td { padding: 16px 24px; border-bottom: 1px solid #edf2f7; vertical-align: middle; font-size: 14px; color: #4a5568; }
	tr:last-child td { border-bottom: none; }
	
	/* 클릭 가능한 행 스타일 */
	.clickable-row { cursor: pointer; transition: background 0.1s; }
	.clickable-row:hover { background-color: #f0f4f8; }

	.pagination { display: flex; align-items: center; justify-content: center; padding: 16px; border-top: 1px solid #e2e8f0; gap: 16px; }
	.page-btn { background: white; border: 1px solid #e2e8f0; border-radius: 4px; padding: 6px; cursor: pointer; display: flex; align-items: center; justify-content: center; }
	.page-btn:hover:not(:disabled) { background-color: #f7fafc; }
	.page-btn:disabled { color: #cbd5e0; cursor: not-allowed; }
	.page-info { font-size: 13px; color: #4a5568; }

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
	.loading, .empty-message { text-align: center; padding: 40px; color: #a0aec0; }

	/* 모달 스타일 */
	.modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.5); z-index: 1000; display: flex; align-items: center; justify-content: center; }
	.modal-content { background: white; width: 600px; max-height: 90vh; border-radius: 12px; display: flex; flex-direction: column; box-shadow: 0 10px 25px rgba(0,0,0,0.2); overflow: hidden; }
	.modal-header { padding: 16px 24px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; }
	.modal-header h3 { margin: 0; font-size: 18px; color: #2d3748; }
	.close-btn { background: none; border: none; cursor: pointer; color: #a0aec0; }
	.modal-body { padding: 24px; display: flex; flex-direction: column; gap: 20px; overflow-y: auto; }
	.modal-footer { padding: 16px 24px; background-color: #f7fafc; display: flex; justify-content: flex-end; gap: 12px; border-top: 1px solid #e2e8f0; }
	
	.form-row { display: flex; gap: 20px; }
	.three-col .form-group { flex: 1; }
	
	.profile-edit-section { width: 120px; flex-shrink: 0; }
	.uploader-wrapper { height: 120px; width: 120px; overflow: hidden; }
	
	.info-edit-section { flex: 1; display: flex; flex-direction: column; gap: 12px; }
	
	.form-group { display: flex; flex-direction: column; gap: 6px; }
	label { font-size: 13px; font-weight: 600; color: #4a5568; }
	input, select { padding: 10px; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 14px; }
	.disabled-input { background-color: #f7fafc; color: #a0aec0; cursor: not-allowed; }

	.radio-group { display: flex; gap: 16px; padding-top: 4px; }
	.radio-label { display: flex; align-items: center; gap: 6px; cursor: pointer; font-size: 14px; }
	.radio-label span { font-weight: 500; }
	.radio-label span.active { color: #48bb78; }
	.radio-label span.suspended { color: #e53e3e; }
	.radio-label span.pending { color: #ed8936; }

	.cancel-btn { background: white; border: 1px solid #e2e8f0; padding: 8px 16px; border-radius: 6px; cursor: pointer; color: #4a5568; font-weight: 500; }
	.submit-btn { background: #3182ce; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; color: white; font-weight: 600; }
	.submit-btn:disabled { background-color: #cbd5e0; cursor: not-allowed; }
</style>