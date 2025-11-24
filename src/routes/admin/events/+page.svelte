<script>
	import { onMount } from 'svelte';
	import { db } from '$lib/firebase';
	import { 
		collection, getDocs, query, orderBy, addDoc, deleteDoc, doc, serverTimestamp 
	} from 'firebase/firestore';
	import { 
		Search, Plus, Trash2, Calendar, Image as ImageIcon, X, ChevronLeft, ChevronRight
	} from 'lucide-svelte';
	import ImageUploader from '$lib/components/ImageUploader.svelte';

	let events = [];
	let isLoading = true;
	let searchTerm = '';

	// 페이지네이션
	let currentPage = 1;
	const itemsPerPage = 10;

	// 모달 상태
	let isModalOpen = false;
	let isSubmitting = false;

	// 새 이벤트 폼 데이터
	let newEvent = {
		title: '',
		startDate: '',
		endDate: '',
		image: ''
	};

	// 이벤트 목록 불러오기
	async function fetchEvents() {
		isLoading = true;
		try {
			const q = query(collection(db, 'events'), orderBy('createdAt', 'desc'));
			const querySnapshot = await getDocs(q);
			
			events = querySnapshot.docs.map(doc => ({
				id: doc.id,
				...doc.data()
			}));
		} catch (error) {
			console.error("이벤트 로딩 실패:", error);
		} finally {
			isLoading = false;
		}
	}

	// 모달 열기/닫기
	function openModal() {
		newEvent = { title: '', startDate: '', endDate: '', image: '' };
		isModalOpen = true;
	}
	function closeModal() {
		isModalOpen = false;
	}

	// 이벤트 등록 (Firestore 저장)
	async function submitEvent() {
		if (!newEvent.title || !newEvent.startDate || !newEvent.endDate) {
			return alert('필수 정보를 모두 입력해주세요.');
		}

		isSubmitting = true;
		try {
			await addDoc(collection(db, 'events'), {
				...newEvent,
				createdAt: serverTimestamp(), // 게시일 (서버 시간)
				postedAt: new Date().toISOString() // 화면 표시용 (로컬 시간)
			});
			
			alert('이벤트가 등록되었습니다.');
			closeModal();
			fetchEvents(); // 목록 갱신
		} catch (error) {
			console.error("등록 실패:", error);
			alert("등록 중 오류가 발생했습니다.");
		} finally {
			isSubmitting = false;
		}
	}

	// 이벤트 삭제
	async function deleteEvent(id) {
		if (!confirm('정말로 이 이벤트를 삭제하시겠습니까?')) return;
		try {
			await deleteDoc(doc(db, 'events', id));
			events = events.filter(e => e.id !== id);
			alert('삭제되었습니다.');
		} catch (error) {
			console.error("삭제 실패:", error);
		}
	}

	// 날짜 포맷팅 (YYYY.MM.DD)
	function formatDate(isoString) {
		if (!isoString) return '-';
		return new Date(isoString).toLocaleDateString('ko-KR');
	}

	// 검색 및 페이지네이션
	$: filteredEvents = events.filter(e => e.title.toLowerCase().includes(searchTerm.toLowerCase()));
	$: if (searchTerm) currentPage = 1;
	$: totalPages = Math.ceil(filteredEvents.length / itemsPerPage);
	$: paginatedEvents = filteredEvents.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

	function goToPage(page) {
		if (page >= 1 && page <= totalPages) currentPage = page;
	}

	onMount(() => {
		fetchEvents();
	});
</script>

<div class="page-header">
	<h2>이벤트 관리</h2>
	<div class="header-actions">
		<div class="search-box">
			<Search size={18} color="#718096" />
			<input type="text" placeholder="이벤트명 검색" bind:value={searchTerm} />
		</div>
		<button class="create-btn" on:click={openModal}>
			<Plus size={18} /> 이벤트 작성
		</button>
	</div>
</div>

<div class="table-container">
	{#if isLoading}
		<div class="loading">데이터를 불러오는 중...</div>
	{:else}
		<table>
			<thead>
				<tr>
					<th>이미지</th>
					<th>이벤트명</th>
					<th>게시일</th>
					<th>기간</th>
					<th>관리</th>
				</tr>
			</thead>
			<tbody>
				{#if paginatedEvents.length > 0}
					{#each paginatedEvents as event}
						<tr>
							<td>
								<div class="event-thumb">
									{#if event.image}
										<img src={event.image} alt={event.title} />
									{:else}
										<div class="no-img"><ImageIcon size={16} /></div>
									{/if}
								</div>
							</td>
							<td class="title-cell">{event.title}</td>
							<td>{formatDate(event.postedAt)}</td>
							<td>
								<div class="period-badge">
									{formatDate(event.startDate)} ~ {formatDate(event.endDate)}
								</div>
							</td>
							<td>
								<button class="icon-btn delete" on:click={() => deleteEvent(event.id)}>
									<Trash2 size={16} />
								</button>
							</td>
						</tr>
					{/each}
				{:else}
					<tr><td colspan="5" class="empty-message">등록된 이벤트가 없습니다.</td></tr>
				{/if}
			</tbody>
		</table>

		{#if totalPages > 1}
			<div class="pagination">
				<button class="page-btn" disabled={currentPage === 1} on:click={() => goToPage(currentPage - 1)}>
					<ChevronLeft size={16} />
				</button>
				<span class="page-info">Page <strong>{currentPage}</strong> of {totalPages}</span>
				<button class="page-btn" disabled={currentPage === totalPages} on:click={() => goToPage(currentPage + 1)}>
					<ChevronRight size={16} />
				</button>
			</div>
		{/if}
	{/if}
</div>

{#if isModalOpen}
	<div class="modal-overlay" on:click={closeModal}>
		<div class="modal-content" on:click|stopPropagation>
			<div class="modal-header">
				<h3>새 이벤트 작성</h3>
				<button class="close-btn" on:click={closeModal}><X size={20} /></button>
			</div>
			
			<div class="modal-body">
				<div class="form-group">
					<label for="title">이벤트명</label>
					<input type="text" id="title" bind:value={newEvent.title} placeholder="이벤트 제목을 입력하세요" />
				</div>

				<div class="form-row">
					<div class="form-group">
						<label for="startDate">시작일</label>
						<input type="date" id="startDate" bind:value={newEvent.startDate} />
					</div>
					<div class="form-group">
						<label for="endDate">종료일</label>
						<input type="date" id="endDate" bind:value={newEvent.endDate} />
					</div>
				</div>

				<div class="form-group">
					<label>대표 이미지</label>
					<div style="height: 200px;">
						<ImageUploader 
							path="events" 
							bind:imageUrl={newEvent.image} 
						/>
					</div>
				</div>
			</div>

			<div class="modal-footer">
				<button class="cancel-btn" on:click={closeModal}>취소</button>
				<button class="submit-btn" on:click={submitEvent} disabled={isSubmitting}>
					{isSubmitting ? '저장 중...' : '등록하기'}
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
	h2 { margin: 0; font-size: 24px; color: #2d3748; }
	.header-actions { display: flex; gap: 12px; }
	
	.search-box { display: flex; align-items: center; background: white; padding: 8px 16px; border-radius: 8px; border: 1px solid #e2e8f0; gap: 8px; width: 240px; }
	.search-box input { border: none; outline: none; width: 100%; font-size: 14px; }

	.create-btn { display: flex; align-items: center; gap: 6px; background-color: #3182ce; color: white; border: none; padding: 8px 16px; border-radius: 8px; font-weight: 600; font-size: 14px; cursor: pointer; transition: background 0.2s; }
	.create-btn:hover { background-color: #2b6cb0; }

	.table-container { background: white; border-radius: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); overflow: hidden; display: flex; flex-direction: column; }
	table { width: 100%; border-collapse: collapse; min-width: 800px; }
	th { text-align: left; padding: 16px 24px; background-color: #f7fafc; color: #718096; font-size: 12px; font-weight: 600; text-transform: uppercase; border-bottom: 1px solid #e2e8f0; }
	td { padding: 16px 24px; border-bottom: 1px solid #edf2f7; vertical-align: middle; font-size: 14px; color: #4a5568; }
	tr:hover { background-color: #fafafa; }

	.event-thumb { width: 60px; height: 40px; border-radius: 6px; overflow: hidden; background-color: #edf2f7; display: flex; align-items: center; justify-content: center; }
	.event-thumb img { width: 100%; height: 100%; object-fit: cover; }
	.no-img { color: #cbd5e0; }
	.title-cell { font-weight: 600; color: #2d3748; }
	.period-badge { display: inline-block; background-color: #ebf8ff; color: #2c5282; padding: 4px 8px; border-radius: 6px; font-size: 12px; font-weight: 500; }

	.icon-btn { background: none; border: none; cursor: pointer; padding: 6px; border-radius: 4px; transition: background 0.2s; color: #a0aec0; }
	.icon-btn:hover { background-color: #edf2f7; color: #4a5568; }
	.icon-btn.delete:hover { background-color: #FED7D7; color: #C53030; }

	.pagination { display: flex; align-items: center; justify-content: center; padding: 16px; border-top: 1px solid #e2e8f0; gap: 16px; }
	.page-btn { background: white; border: 1px solid #e2e8f0; border-radius: 4px; padding: 6px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
	.page-btn:hover:not(:disabled) { background-color: #f7fafc; }
	.page-btn:disabled { color: #cbd5e0; cursor: not-allowed; }
	.page-info { font-size: 13px; color: #4a5568; }
	.loading, .empty-message { text-align: center; padding: 40px; color: #a0aec0; }

	/* 모달 스타일 */
	.modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.5); z-index: 1000; display: flex; align-items: center; justify-content: center; }
	.modal-content { background: white; width: 500px; border-radius: 12px; display: flex; flex-direction: column; box-shadow: 0 10px 25px rgba(0,0,0,0.2); overflow: hidden; }
	.modal-header { padding: 16px 24px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; }
	.modal-header h3 { margin: 0; font-size: 18px; color: #2d3748; }
	.close-btn { background: none; border: none; cursor: pointer; color: #a0aec0; }
	.close-btn:hover { color: #4a5568; }

	.modal-body { padding: 24px; display: flex; flex-direction: column; gap: 16px; }
	.form-group { display: flex; flex-direction: column; gap: 6px; }
	.form-row { display: flex; gap: 16px; }
	.form-row .form-group { flex: 1; }
	label { font-size: 13px; font-weight: 600; color: #4a5568; }
	input { padding: 10px; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 14px; }
	
	.modal-footer { padding: 16px 24px; background-color: #f7fafc; display: flex; justify-content: flex-end; gap: 12px; border-top: 1px solid #e2e8f0; }
	.cancel-btn { background: white; border: 1px solid #e2e8f0; padding: 8px 16px; border-radius: 6px; cursor: pointer; color: #4a5568; font-weight: 500; }
	.submit-btn { background: #3182ce; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; color: white; font-weight: 600; }
	.submit-btn:disabled { background-color: #cbd5e0; cursor: not-allowed; }
</style>