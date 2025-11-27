<script>
	import { onMount } from 'svelte';
	import { modal } from '$lib/stores';
	import { db } from '$lib/firebase';
	import { 
		collection, getDocs, query, orderBy, doc, deleteDoc, getDoc,
		limit, startAfter, startAt, getCountFromServer, where 
	} from 'firebase/firestore';
	import { deleteFileByUrl } from '$lib/firebase';
	import { Search, MapPin, Calendar, Trash2, Users, RotateCcw } from 'lucide-svelte';
	import Pagination from '$lib/components/Pagination.svelte';
	import MeetingEditModal from '$lib/components/admin/MeetingEditModal.svelte';
	import MeetingApplicantsModal from '$lib/components/admin/MeetingApplicantsModal.svelte';
	import Skeleton from '$lib/components/Skeleton.svelte';

	let meetings = [];
	let isLoading = true;
	let searchTerm = '';

	// 페이지네이션 상태
	let currentPage = 1;
	const itemsPerPage = 10;
	let totalItems = 0;
	let lastVisible = null;
	let pageStartDocs = [];
	
	let isModalOpen = false;
	let selectedMeeting = null;
	let isApplicantModalOpen = false;
	let meetingForApplicant = null;

	onMount(() => {
		fetchTotalCount();
		fetchMeetings();
	});

	async function fetchTotalCount() {
		try {
			const snap = await getCountFromServer(collection(db, 'meetings'));
			totalItems = snap.data().count;
		} catch (e) { console.error(e); }
	}

	async function fetchMeetings(direction = 'next') {
		isLoading = true;

		try {
			let q = collection(db, 'meetings');
			const trimmedTerm = searchTerm.trim().replace(/\s/g, '').toLowerCase();

			// 검색 로직 (Bi-gram)
			if (trimmedTerm && trimmedTerm.length >= 2) {
				q = query(
					q, 
					where('_searchKeywords', 'array-contains', trimmedTerm),
					limit(itemsPerPage)
				);
			} else {
				q = query(q, orderBy('date', 'desc'), limit(itemsPerPage));
			}

			// 페이지네이션 커서 적용
			if (direction === 'next' && lastVisible) {
				q = query(q, startAfter(lastVisible));
			} else if (direction === 'prev') {
				// [수정] 1페이지가 아닐 때만 startAt 커서 적용
				if (currentPage > 1 && pageStartDocs[currentPage - 1]) {
					q = query(q, startAt(pageStartDocs[currentPage - 1]));
				}
				// 1페이지면 아무 커서도 적용하지 않음 (처음부터 조회)
			}

			const querySnapshot = await getDocs(q);
			if (!querySnapshot.empty) {
				lastVisible = querySnapshot.docs[querySnapshot.docs.length - 1];
				
				// [수정] 현재 페이지의 첫 번째 문서를 저장 (startAt을 위해)
				if (!pageStartDocs[currentPage - 1]) {
					pageStartDocs[currentPage - 1] = querySnapshot.docs[0];
				}
			}

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

	function openEditModal(meeting) {
		selectedMeeting = meeting;
		isModalOpen = true;
	}
	
	function openApplicantModal(meeting) {
		meetingForApplicant = meeting;
		isApplicantModalOpen = true;
	}

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
			// 0) Try to delete meeting image in Storage (if any)
			try {
				const meetingDoc = await getDoc(doc(db, 'meetings', id));
				const meetingData = meetingDoc.exists() ? meetingDoc.data() : null;
				if (meetingData?.image) await deleteFileByUrl(meetingData.image);
			} catch (e) {
				console.error('모임 이미지 삭제 중 오류:', e);
			}

			// 1) Delete related meeting applications
			try {
				const appsQ = query(collection(db, 'meeting_applications'), where('meetingId', '==', id));
				const appsSnap = await getDocs(appsQ);
				if (!appsSnap.empty) {
					const delAppPromises = appsSnap.docs.map(d => deleteDoc(doc(db, 'meeting_applications', d.id)));
					await Promise.all(delAppPromises);
				}
			} catch (e) {
				console.error('신청 내역 삭제 중 오류:', e);
			}

			// 2) Delete related meeting reviews
			try {
				const reviewsQ = query(collection(db, 'meeting_reviews'), where('meetingId', '==', id));
				const reviewsSnap = await getDocs(reviewsQ);
				if (!reviewsSnap.empty) {
					const delReviewPromises = reviewsSnap.docs.map(d => deleteDoc(doc(db, 'meeting_reviews', d.id)));
					await Promise.all(delReviewPromises);
				}
			} catch (e) {
				console.error('후기 삭제 중 오류:', e);
			}

			// 3) Finally delete the meeting document itself
			await deleteDoc(doc(db, 'meetings', id));
			meetings = meetings.filter(m => m.id !== id);
			totalItems--; 
			await modal.alert('삭제되었습니다. 관련 신청/후기 문서도 함께 삭제했습니다.');
		} catch (error) {
			console.error(error);
			await modal.alert('삭제 중 오류가 발생했습니다. 콘솔을 확인하세요.');
		}
	}

	function formatDate(isoString) {
		if (!isoString) return '-';
		const date = new Date(isoString);
		return date.toLocaleString('ko-KR', {
			year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false
		});
	}

	function handleSearch() {
		if (searchTerm.trim().length === 1) {
			alert('검색어는 2글자 이상 입력해주세요.');
			return;
		}
		currentPage = 1;
		pageStartDocs = [];
		lastVisible = null;
		fetchMeetings();
	}

	function handleReset() {
		searchTerm = '';
		currentPage = 1;
		pageStartDocs = [];
		lastVisible = null;
		fetchTotalCount();
		fetchMeetings();
	}

	function nextPage() {
		if (searchTerm && meetings.length < itemsPerPage) return;
		if (!searchTerm && currentPage >= Math.ceil(totalItems / itemsPerPage)) return;
		currentPage++;
		fetchMeetings('next');
	}

	$: totalPages = Math.ceil(totalItems / itemsPerPage);

	function prevPage() {
		if (currentPage > 1) {
			currentPage--;
			fetchMeetings('prev');
		}
	}

	// Jump to first page
	function goToFirst() {
		currentPage = 1;
		pageStartDocs = [];
		lastVisible = null;
		fetchMeetings();
	}

	// Jump to last page by iterating next (bounded)
	async function goToLast() {
		const target = Math.ceil(totalItems / itemsPerPage) || 1;
		if (target <= 1) return;
		currentPage = 1;
		pageStartDocs = [];
		lastVisible = null;
		const maxIter = Math.min(target, 50);
		for (let p = 2; p <= maxIter; p++) {
			await fetchMeetings('next');
			currentPage = p;
		}
		if (target > maxIter) console.warn('Stopped at iteration cap when jumping to last page');
	}
</script>

<div class="page-header">
	<h2>모임 관리 <span class="count">({totalItems}개)</span></h2>
	<div class="search-box">
		<Search size={18} color="#718096" />
		<input 
			type="text" 
			placeholder="2글자 이상 입력 (모임명/장소)" 
			bind:value={searchTerm} 
			on:keydown={(e) => e.key === 'Enter' && handleSearch()}
		/>
		{#if searchTerm}
			<button class="reset-btn" on:click={handleReset}><RotateCcw size={14} /></button>
		{/if}
	</div>
</div>

<div class="table-container">
	{#if isLoading}
		<Skeleton />
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
				{#if meetings.length > 0}
					{#each meetings as meeting}
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

		<Pagination {currentPage} totalPages={totalPages} on:first={goToFirst} on:prev={prevPage} on:next={nextPage} on:last={goToLast} />
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
	h2 { margin: 0; font-size: 24px; color: #2d3748; display: flex; align-items: center; gap: 8px; }
	.count { font-size: 16px; color: #718096; font-weight: normal; }
	.search-box { display: flex; align-items: center; background: white; padding: 8px 16px; border-radius: 8px; border: 1px solid #e2e8f0; gap: 8px; width: 300px; }
	.search-box input { border: none; outline: none; width: 100%; font-size: 14px; }
	.reset-btn { background: none; border: none; cursor: pointer; color: #a0aec0; padding: 0; display: flex; align-items: center; }
	.reset-btn:hover { color: #4a5568; }

    .table-container { background: white; border-radius: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); overflow: hidden; display: flex; flex-direction: column; }
	table { width: 100%; border-collapse: collapse; min-width: 900px; }
	th { text-align: left; padding: 16px 24px; background-color: #f7fafc; color: #718096; font-size: 12px; font-weight: 600; text-transform: uppercase; border-bottom: 1px solid #e2e8f0; }
	td { padding: 16px 24px; border-bottom: 1px solid #edf2f7; vertical-align: middle; font-size: 14px; color: #4a5568; }
	tr:last-child td { border-bottom: none; }
	.clickable-row { cursor: pointer; transition: background 0.1s; }
	.clickable-row:hover { background-color: #f0f4f8; }

	/* pagination styles provided by shared Pagination component */

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
	
	.actions-cell { display: flex; gap: 8px; }
	.icon-btn { background: none; border: none; cursor: pointer; padding: 6px; border-radius: 4px; transition: all 0.2s; color: #a0aec0; }
	.icon-btn:hover { background-color: #edf2f7; color: #4a5568; }
	.icon-btn.delete:hover { background-color: #FED7D7; color: #C53030; }
	.icon-btn.applicants:hover { background-color: #E6FFFA; color: #2C7A7B; }
	
	.empty-message { text-align: center; padding: 40px; color: #a0aec0; }
</style>