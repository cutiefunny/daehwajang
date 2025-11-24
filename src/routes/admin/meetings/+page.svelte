<script>
	import { onMount } from 'svelte';
	import { db } from '$lib/firebase';
	import { collection, getDocs, query, orderBy, doc, deleteDoc } from 'firebase/firestore';
	// [추가] Users 아이콘 import
	import { Search, MapPin, Calendar, Trash2, ChevronLeft, ChevronRight, Users } from 'lucide-svelte';
	import MeetingEditModal from '$lib/components/admin/MeetingEditModal.svelte';
	// [추가] 신청자 관리 모달 import
	import MeetingApplicantsModal from '$lib/components/admin/MeetingApplicantsModal.svelte';

	let meetings = [];
	let isLoading = true;
	let searchTerm = '';

	// 페이지네이션
	let currentPage = 1;
	const itemsPerPage = 10;

	// 모달 상태
	let isModalOpen = false;
	let selectedMeeting = null;
	
	// [추가] 신청자 관리 모달 상태 변수
	let isApplicantModalOpen = false;
	let meetingForApplicant = null;

	async function fetchMeetings() {
		isLoading = true;
		try {
			const q = query(collection(db, 'meetings'), orderBy('date', 'desc'));
			const querySnapshot = await getDocs(q);
			meetings = querySnapshot.docs.map(doc => {
				const data = doc.data();
				return {
					id: doc.id,
					...data,
					hostName: data.hostName || '관리자', 
					status: getStatus(data.date)
				};
			});
		} catch (error) {
			console.error("모임 목록 로딩 실패:", error);
		} finally {
			isLoading = false;
		}
	}

	function getStatus(dateStr) {
		const now = new Date();
		const meetingDate = new Date(dateStr);
		return meetingDate > now ? 'upcoming' : 'ended';
	}

	// 모달 열기 (정보 수정)
	function openEditModal(meeting) {
		selectedMeeting = meeting;
		isModalOpen = true;
	}
	
	// [추가] 모달 열기 (신청자 관리)
	function openApplicantModal(meeting) {
		meetingForApplicant = meeting;
		isApplicantModalOpen = true;
	}

	// 저장 후 처리
	function handleMeetingSaved(e) {
		const updatedMeeting = e.detail;
		updatedMeeting.status = getStatus(updatedMeeting.date);
		meetings = meetings.map(m => m.id === updatedMeeting.id ? updatedMeeting : m);
		isModalOpen = false;
		selectedMeeting = null;
	}

	async function deleteMeeting(id) {
		if (!confirm('정말로 이 모임을 삭제하시겠습니까?')) return;
		try {
			await deleteDoc(doc(db, 'meetings', id));
			meetings = meetings.filter(m => m.id !== id);
			alert('삭제되었습니다.');
		} catch (error) { console.error(error); }
	}

	function formatDate(isoString) {
		if (!isoString) return '-';
		const date = new Date(isoString);
		return date.toLocaleString('ko-KR', {
			year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false
		});
	}

	$: filteredMeetings = meetings.filter(m => 
		m.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
		m.location?.toLowerCase().includes(searchTerm.toLowerCase())
	);
	$: if (searchTerm) currentPage = 1;
	$: totalPages = Math.ceil(filteredMeetings.length / itemsPerPage);
	$: paginatedMeetings = filteredMeetings.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
	function goToPage(page) { if (page >= 1 && page <= totalPages) currentPage = page; }

	onMount(() => { fetchMeetings(); });
</script>

<div class="page-header">
	<h2>모임 관리</h2>
	<div class="search-box">
		<Search size={18} color="#718096" />
		<input type="text" placeholder="모임명 또는 장소 검색" bind:value={searchTerm} />
	</div>
</div>

<div class="table-container">
	{#if isLoading}
		<div class="loading">데이터를 불러오는 중...</div>
	{:else}
		<table>
			<thead>
				<tr>
					<th>모임 정보</th>
					<th>카테고리</th>
					<th>일시</th>
					<th>장소</th>
					<th>호스트</th>
					<th>상태</th>
					<th>관리</th>
				</tr>
			</thead>
			<tbody>
				{#if paginatedMeetings.length > 0}
					{#each paginatedMeetings as meeting}
						<tr on:click={() => openEditModal(meeting)} class="clickable-row">
							<td>
								<div class="meeting-info">
									<div class="thumb">
										<img src={meeting.image} alt={meeting.title} />
									</div>
									<span class="title">{meeting.title}</span>
								</div>
							</td>
							<td><span class="category-badge">{meeting.category}</span></td>
							<td>
								<div class="date-info">
									<Calendar size={14} color="#718096" />
									<span>{formatDate(meeting.date)}</span>
								</div>
							</td>
							<td class="location-cell" title={meeting.location}>
								<div class="location-info">
									<MapPin size={14} color="#718096" />
									<span>{meeting.location}</span>
								</div>
							</td>
							<td>{meeting.hostName}</td>
							<td>
								{#if meeting.status === 'upcoming'} <span class="status-badge upcoming">모집중</span>
								{:else} <span class="status-badge ended">종료됨</span> {/if}
							</td>
							<td class="actions-cell">
								<button 
									class="icon-btn applicants" 
									title="신청자 관리"
									on:click|stopPropagation={() => openApplicantModal(meeting)}
								>
									<Users size={16} />
								</button>
								<button 
									class="icon-btn delete" 
									title="삭제"
									on:click|stopPropagation={() => deleteMeeting(meeting.id)}
								>
									<Trash2 size={16} />
								</button>
							</td>
						</tr>
					{/each}
				{:else}
					<tr><td colspan="7" class="empty-message">검색 결과가 없습니다.</td></tr>
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

{#if isModalOpen && selectedMeeting}
	<MeetingEditModal 
		meeting={selectedMeeting} 
		on:close={() => isModalOpen = false} 
		on:save={handleMeetingSaved} 
	/>
{/if}

{#if isApplicantModalOpen && meetingForApplicant}
	<MeetingApplicantsModal
		meeting={meetingForApplicant}
		on:close={() => isApplicantModalOpen = false}
	/>
{/if}

<style>
	/* 기존 스타일 유지 */
	.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
	h2 { margin: 0; font-size: 24px; color: #2d3748; }
	.search-box { display: flex; align-items: center; background: white; padding: 8px 16px;
	border-radius: 8px; border: 1px solid #e2e8f0; gap: 8px; width: 300px; }
	.search-box input { border: none; outline: none; width: 100%; font-size: 14px; }

	.table-container { background: white; border-radius: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); overflow: hidden; display: flex; flex-direction: column; }
	table { width: 100%; border-collapse: collapse; min-width: 900px; }
	th { text-align: left; padding: 16px 24px; background-color: #f7fafc; color: #718096;
	font-size: 12px; font-weight: 600; text-transform: uppercase; border-bottom: 1px solid #e2e8f0; }
	td { padding: 16px 24px; border-bottom: 1px solid #edf2f7;
	vertical-align: middle; font-size: 14px; color: #4a5568; }
	tr:last-child td { border-bottom: none; }
	.clickable-row { cursor: pointer; transition: background 0.1s; }
	.clickable-row:hover { background-color: #f0f4f8; }

	.pagination { display: flex; align-items: center; justify-content: center; padding: 16px; border-top: 1px solid #e2e8f0; gap: 16px; }
	.page-btn { background: white; border: 1px solid #e2e8f0; border-radius: 4px; padding: 6px; cursor: pointer; display: flex; align-items: center; justify-content: center; }
	.page-btn:hover:not(:disabled) { background-color: #f7fafc; }
	.page-btn:disabled { color: #cbd5e0; cursor: not-allowed; }
	.page-info { font-size: 13px; color: #4a5568; }

	.meeting-info { display: flex; align-items: center; gap: 12px; }
	.thumb { width: 48px; height: 36px; border-radius: 6px; overflow: hidden; background-color: #edf2f7; flex-shrink: 0; }
	.thumb img { width: 100%; height: 100%; object-fit: cover; }
	.title { font-weight: 600; color: #2d3748; }
	.category-badge { background-color: #edf2f7; color: #4a5568; padding: 4px 8px; border-radius: 6px; font-size: 12px; font-weight: 500; }
	.date-info, .location-info { display: flex; align-items: center; gap: 6px; font-size: 13px; }
	.location-cell { max-width: 200px; }
	.location-info span { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
	.status-badge { padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: 700; }
	.status-badge.upcoming { background-color: #c6f6d5; color: #276749; }
	.status-badge.ended { background-color: #cbd5e0; color: #4a5568; }
	
	/* 버튼 그룹 스타일 */
	.actions-cell { display: flex; gap: 8px; }
	.icon-btn { background: none; border: none; cursor: pointer; padding: 6px; border-radius: 4px; transition: all 0.2s; color: #a0aec0; }
	.icon-btn:hover { background-color: #edf2f7; color: #4a5568; }
	.icon-btn.delete:hover { background-color: #FED7D7; color: #C53030; }
	/* [추가] 신청자 관리 버튼 스타일 */
	.icon-btn.applicants:hover { background-color: #E6FFFA; color: #2C7A7B; }
	
	.loading, .empty-message { text-align: center; padding: 40px; color: #a0aec0; }
</style>