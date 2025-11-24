<script>
	import { onMount } from 'svelte';
	import { db } from '$lib/firebase';
	import { collection, getDocs, query, orderBy, doc, deleteDoc, updateDoc } from 'firebase/firestore';
	import { Search, MapPin, Calendar, Trash2, ChevronLeft, ChevronRight, X } from 'lucide-svelte';
	import ImageUploader from '$lib/components/ImageUploader.svelte';

	let meetings = [];
	let isLoading = true;
	let searchTerm = '';

	// 페이지네이션
	let currentPage = 1;
	const itemsPerPage = 10;

	// 모달 상태
	let isModalOpen = false;
	let selectedMeeting = null;
	let isSaving = false;

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

	// 모달 열기/닫기
	function openEditModal(meeting) {
		selectedMeeting = { ...meeting };
		// ISO 날짜 문자열을 input[type="datetime-local"] 형식(YYYY-MM-DDTHH:mm)으로 변환
		if (selectedMeeting.date) {
			selectedMeeting.dateInput = selectedMeeting.date.slice(0, 16);
		}
		isModalOpen = true;
	}

	function closeModal() {
		isModalOpen = false;
		selectedMeeting = null;
	}

	// 모임 수정 저장
	async function saveMeetingChanges() {
		if (!selectedMeeting) return;
		isSaving = true;

		try {
			const meetingRef = doc(db, 'meetings', selectedMeeting.id);
			
			// DB에 저장할 날짜 포맷 (ISO)
			const isoDate = new Date(selectedMeeting.dateInput).toISOString();

			const updates = {
				title: selectedMeeting.title,
				image: selectedMeeting.image,
				category: selectedMeeting.category,
				date: isoDate,
				location: selectedMeeting.location,
				description: selectedMeeting.description || '',
				hostName: selectedMeeting.hostName
			};

			await updateDoc(meetingRef, updates);

			// 로컬 상태 업데이트
			meetings = meetings.map(m => {
				if (m.id === selectedMeeting.id) {
					return { ...m, ...updates, date: isoDate, status: getStatus(isoDate) };
				}
				return m;
			});

			alert('모임 정보가 수정되었습니다.');
			closeModal();
		} catch (error) {
			console.error("수정 실패:", error);
			alert("수정 중 오류가 발생했습니다.");
		} finally {
			isSaving = false;
		}
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
							<td>
								<button class="icon-btn delete" on:click|stopPropagation={() => deleteMeeting(meeting.id)}>
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
	<div class="modal-overlay" on:click={closeModal}>
		<div class="modal-content" on:click|stopPropagation>
			<div class="modal-header">
				<h3>모임 정보 수정</h3>
				<button class="close-btn" on:click={closeModal}><X size={20} /></button>
			</div>
			
			<div class="modal-body">
				<div class="form-group">
					<label>대표 이미지</label>
					<div style="height: 200px;">
						<ImageUploader 
							path="meetings" 
							bind:imageUrl={selectedMeeting.image} 
						/>
					</div>
				</div>

				<div class="form-row">
					<div class="form-group full">
						<label>모임명</label>
						<input type="text" bind:value={selectedMeeting.title} />
					</div>
				</div>

				<div class="form-row">
					<div class="form-group">
						<label>카테고리</label>
						<input type="text" bind:value={selectedMeeting.category} />
					</div>
					<div class="form-group">
						<label>호스트명</label>
						<input type="text" bind:value={selectedMeeting.hostName} />
					</div>
				</div>

				<div class="form-row">
					<div class="form-group">
						<label>일시</label>
						<input type="datetime-local" bind:value={selectedMeeting.dateInput} />
					</div>
					<div class="form-group">
						<label>장소</label>
						<input type="text" bind:value={selectedMeeting.location} />
					</div>
				</div>

				<div class="form-group">
					<label>설명 (상세 내용)</label>
					<textarea bind:value={selectedMeeting.description} rows="4"></textarea>
				</div>
			</div>

			<div class="modal-footer">
				<button class="cancel-btn" on:click={closeModal}>취소</button>
				<button class="submit-btn" on:click={saveMeetingChanges} disabled={isSaving}>
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
	table { width: 100%; border-collapse: collapse; min-width: 900px; }
	th { text-align: left; padding: 16px 24px; background-color: #f7fafc; color: #718096; font-size: 12px; font-weight: 600; text-transform: uppercase; border-bottom: 1px solid #e2e8f0; }
	td { padding: 16px 24px; border-bottom: 1px solid #edf2f7; vertical-align: middle; font-size: 14px; color: #4a5568; }
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
	.icon-btn { background: none; border: none; cursor: pointer; padding: 6px; border-radius: 4px; transition: background 0.2s; color: #a0aec0; }
	.icon-btn:hover { background-color: #edf2f7; color: #4a5568; }
	.icon-btn.delete:hover { background-color: #FED7D7; color: #C53030; }
	.loading, .empty-message { text-align: center; padding: 40px; color: #a0aec0; }

	/* 모달 스타일 */
	.modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.5); z-index: 1000; display: flex; align-items: center; justify-content: center; }
	.modal-content { background: white; width: 600px; max-height: 90vh; border-radius: 12px; display: flex; flex-direction: column; box-shadow: 0 10px 25px rgba(0,0,0,0.2); overflow: hidden; }
	.modal-header { padding: 16px 24px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; }
	.modal-header h3 { margin: 0; font-size: 18px; color: #2d3748; }
	.close-btn { background: none; border: none; cursor: pointer; color: #a0aec0; }
	.modal-body { padding: 24px; display: flex; flex-direction: column; gap: 16px; overflow-y: auto; }
	.modal-footer { padding: 16px 24px; background-color: #f7fafc; display: flex; justify-content: flex-end; gap: 12px; border-top: 1px solid #e2e8f0; }
	
	.form-row { display: flex; gap: 16px; }
	.form-row .form-group { flex: 1; }
	.form-group { display: flex; flex-direction: column; gap: 6px; }
	label { font-size: 13px; font-weight: 600; color: #4a5568; }
	input, textarea { padding: 10px; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 14px; width: 100%; box-sizing: border-box; }
	textarea { resize: vertical; }

	.cancel-btn { background: white; border: 1px solid #e2e8f0; padding: 8px 16px; border-radius: 6px; cursor: pointer; color: #4a5568; font-weight: 500; }
	.submit-btn { background: #3182ce; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; color: white; font-weight: 600; }
	.submit-btn:disabled { background-color: #cbd5e0; cursor: not-allowed; }
</style>