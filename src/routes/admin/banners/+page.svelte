<script>
	import { onMount } from 'svelte';
	import { db } from '$lib/firebase';
	import { 
		collection, getDocs, query, orderBy, addDoc, deleteDoc, doc, serverTimestamp, updateDoc 
	} from 'firebase/firestore';
	import { 
		Search, Plus, Trash2, Calendar, Image as ImageIcon, X, Link as LinkIcon, ChevronLeft, ChevronRight
	} from 'lucide-svelte';
	import ImageUploader from '$lib/components/ImageUploader.svelte';

	let banners = [];
	let isLoading = true;
	let searchTerm = '';

	// 페이지네이션
	let currentPage = 1;
	const itemsPerPage = 10;

	// 모달 상태
	let isModalOpen = false;
	let isSubmitting = false;
	let isEditMode = false; // true: 수정, false: 등록

	// 폼 데이터 (생성/수정 공용)
	let formData = {
		id: null,
		link: '',
		startDate: '',
		endDate: '',
		image: ''
	};

	// 배너 목록 불러오기
	async function fetchBanners() {
		isLoading = true;
		try {
			const q = query(collection(db, 'banners'), orderBy('createdAt', 'desc'));
			const querySnapshot = await getDocs(q);
			
			banners = querySnapshot.docs.map(doc => ({
				id: doc.id,
				...doc.data()
			}));
		} catch (error) {
			console.error("배너 로딩 실패:", error);
		} finally {
			isLoading = false;
		}
	}

	// 등록 모달 열기
	function openCreateModal() {
		isEditMode = false;
		formData = { id: null, link: '', startDate: '', endDate: '', image: '' };
		isModalOpen = true;
	}

	// 수정 모달 열기
	function openEditModal(banner) {
		isEditMode = true;
		formData = { ...banner }; // 데이터 복사
		isModalOpen = true;
	}

	function closeModal() {
		isModalOpen = false;
	}

	// 배너 저장 (등록 또는 수정)
	async function submitForm() {
		if (!formData.image || !formData.startDate || !formData.endDate) {
			return alert('이미지와 기간은 필수입니다.');
		}

		isSubmitting = true;
		try {
			if (isEditMode) {
				// 수정 로직
				const bannerRef = doc(db, 'banners', formData.id);
				await updateDoc(bannerRef, {
					link: formData.link,
					startDate: formData.startDate,
					endDate: formData.endDate,
					image: formData.image
				});

				// 로컬 목록 업데이트
				banners = banners.map(b => b.id === formData.id ? { ...b, ...formData } : b);
				alert('배너가 수정되었습니다.');
			} else {
				// 등록 로직
				await addDoc(collection(db, 'banners'), {
					link: formData.link,
					startDate: formData.startDate,
					endDate: formData.endDate,
					image: formData.image,
					createdAt: serverTimestamp(),
					postedAt: new Date().toISOString()
				});
				alert('배너가 등록되었습니다.');
				fetchBanners(); // 목록 새로고침
			}
			closeModal();
		} catch (error) {
			console.error("저장 실패:", error);
			alert("저장 중 오류가 발생했습니다.");
		} finally {
			isSubmitting = false;
		}
	}

	// 배너 삭제
	async function deleteBanner(id) {
		if (!confirm('정말로 이 배너를 삭제하시겠습니까?')) return;
		try {
			await deleteDoc(doc(db, 'banners', id));
			banners = banners.filter(b => b.id !== id);
			alert('삭제되었습니다.');
		} catch (error) {
			console.error("삭제 실패:", error);
		}
	}

	function formatDate(isoString) {
		if (!isoString) return '-';
		return new Date(isoString).toLocaleDateString('ko-KR');
	}

	// 검색 및 페이지네이션
	$: filteredBanners = banners.filter(b => b.link?.toLowerCase().includes(searchTerm.toLowerCase()));
	$: if (searchTerm) currentPage = 1;
	$: totalPages = Math.ceil(filteredBanners.length / itemsPerPage);
	$: paginatedBanners = filteredBanners.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

	function goToPage(page) {
		if (page >= 1 && page <= totalPages) currentPage = page;
	}

	onMount(() => {
		fetchBanners();
	});
</script>

<div class="page-header">
	<h2>배너 관리</h2>
	<div class="header-actions">
		<div class="search-box">
			<Search size={18} color="#718096" />
			<input type="text" placeholder="링크 URL 검색" bind:value={searchTerm} />
		</div>
		<button class="create-btn" on:click={openCreateModal}>
			<Plus size={18} /> 배너 작성
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
					<th style="width: 120px;">이미지</th>
					<th>링크 URL</th>
					<th>게시일</th>
					<th>게시 기간</th>
					<th>관리</th>
				</tr>
			</thead>
			<tbody>
				{#if paginatedBanners.length > 0}
					{#each paginatedBanners as banner}
						<tr on:click={() => openEditModal(banner)} class="clickable-row">
							<td>
								<div class="banner-thumb">
									{#if banner.image}
										<img src={banner.image} alt="Banner" />
									{:else}
										<div class="no-img"><ImageIcon size={16} /></div>
									{/if}
								</div>
							</td>
							<td class="link-cell">
								{#if banner.link}
									<a 
										href={banner.link} 
										target="_blank" 
										class="link-text"
										on:click|stopPropagation
									>
										<LinkIcon size={12} /> {banner.link}
									</a>
								{:else}
									<span class="no-link">-</span>
								{/if}
							</td>
							<td>{formatDate(banner.postedAt)}</td>
							<td>
								<div class="period-badge">
									{formatDate(banner.startDate)} ~ {formatDate(banner.endDate)}
								</div>
							</td>
							<td>
								<button 
									class="icon-btn delete" 
									on:click|stopPropagation={() => deleteBanner(banner.id)}
								>
									<Trash2 size={16} />
								</button>
							</td>
						</tr>
					{/each}
				{:else}
					<tr><td colspan="5" class="empty-message">등록된 배너가 없습니다.</td></tr>
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
				<h3>{isEditMode ? '배너 수정' : '새 배너 작성'}</h3>
				<button class="close-btn" on:click={closeModal}><X size={20} /></button>
			</div>
			
			<div class="modal-body">
				<div class="form-group">
					<label>배너 이미지 (필수)</label>
					<div style="height: 180px;">
						<ImageUploader 
							path="banners" 
							bind:imageUrl={formData.image} 
							objectFit="cover"
						/>
					</div>
				</div>

				<div class="form-group">
					<label for="link">링크 URL</label>
					<input type="text" id="link" bind:value={formData.link} placeholder="예: https://google.com" />
				</div>

				<div class="form-row">
					<div class="form-group">
						<label for="startDate">시작일</label>
						<input type="date" id="startDate" bind:value={formData.startDate} />
					</div>
					<div class="form-group">
						<label for="endDate">종료일</label>
						<input type="date" id="endDate" bind:value={formData.endDate} />
					</div>
				</div>
			</div>

			<div class="modal-footer">
				<button class="cancel-btn" on:click={closeModal}>취소</button>
				<button class="submit-btn" on:click={submitForm} disabled={isSubmitting}>
					{isSubmitting ? '저장 중...' : (isEditMode ? '수정 완료' : '등록하기')}
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
	tr:last-child td { border-bottom: none; }
	
	/* 클릭 가능한 행 스타일 */
	.clickable-row { cursor: pointer; transition: background 0.1s; }
	.clickable-row:hover { background-color: #f0f4f8; }

	.banner-thumb { width: 100px; height: 50px; border-radius: 6px; overflow: hidden; background-color: #edf2f7; display: flex; align-items: center; justify-content: center; }
	.banner-thumb img { width: 100%; height: 100%; object-fit: cover; }
	.no-img { color: #cbd5e0; }
	
	.link-cell { max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
	.link-text { color: #3182ce; text-decoration: none; display: inline-flex; align-items: center; gap: 4px; }
	.link-text:hover { text-decoration: underline; }
	.no-link { color: #a0aec0; }

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