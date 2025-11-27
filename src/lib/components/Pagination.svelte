<script>
	import { createEventDispatcher } from 'svelte';
	// [수정] 아이콘 추가 임포트
	import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-svelte';

	export let currentPage = 1;
	export let totalPages = null; // 전체 페이지 수 (클라이언트 페이징 시 사용)
	export let hasNext = true;    // 다음 페이지 존재 여부 (서버 사이드 커서 페이징 시 사용)

	const dispatch = createEventDispatcher();

	// 첫 페이지인지 확인
	$: isFirstPage = currentPage === 1;
	
	// 마지막 페이지인지 확인 (totalPages가 있으면 그것으로, 없으면 hasNext로 판단)
	$: isLastPage = totalPages ? currentPage >= totalPages : !hasNext;

	function handlePrev() {
		if (!isFirstPage) dispatch('prev');
	}

	function handleNext() {
		if (!isLastPage) dispatch('next');
	}

	// [추가] 첫 페이지 핸들러
	function handleFirst() {
		if (!isFirstPage) dispatch('first');
	}

	// [추가] 마지막 페이지 핸들러
	function handleLast() {
		if (!isLastPage && totalPages) dispatch('last');
	}
</script>

<div class="pagination-container">
	<button class="page-btn" disabled={isFirstPage} on:click={handleFirst} title="첫 페이지">
		<ChevronsLeft size={16} />
	</button>

	<button class="page-btn" disabled={isFirstPage} on:click={handlePrev} title="이전 페이지">
		<ChevronLeft size={16} />
	</button>
	
	<span class="page-info">
		Page <strong>{currentPage}</strong>
		{#if totalPages}
			of {totalPages}
		{/if}
	</span>

	<button class="page-btn" disabled={isLastPage} on:click={handleNext} title="다음 페이지">
		<ChevronRight size={16} />
	</button>

	{#if totalPages}
		<button class="page-btn" disabled={isLastPage} on:click={handleLast} title="마지막 페이지">
			<ChevronsRight size={16} />
		</button>
	{/if}
</div>

<style>
	.pagination-container {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 16px;
		border-top: 1px solid #e2e8f0;
		gap: 8px; /* 간격 조정 */
	}

	.page-btn {
		background: white;
		border: 1px solid #e2e8f0;
		border-radius: 4px;
		padding: 6px;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.2s;
		color: #4a5568;
	}

	.page-btn:hover:not(:disabled) {
		background-color: #f7fafc;
	}

	.page-btn:disabled {
		color: #cbd5e0;
		cursor: not-allowed;
		background-color: #fafafa;
	}

	.page-info {
		font-size: 13px;
		color: #4a5568;
		margin: 0 8px;
	}
</style>