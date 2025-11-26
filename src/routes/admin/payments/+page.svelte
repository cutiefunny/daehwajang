<script>
	import { onMount } from 'svelte';
	import { db } from '$lib/firebase';
	import { collection, getDocs, query, orderBy } from 'firebase/firestore';
	import { Search, ChevronLeft, ChevronRight, Filter, Download } from 'lucide-svelte';
	import Skeleton from '$lib/components/Skeleton.svelte';

	let payments = [];
	let isLoading = true;

	// 검색 및 필터 상태
	let searchPayer = '';
	let searchProduct = '';
	let searchMethod = '';

	// 페이지네이션 상태
	let currentPage = 1;
	const itemsPerPage = 10;

	// 결제 내역 불러오기
	async function fetchPayments() {
		isLoading = true;
		try {
			// 결제일시 내림차순 (최신순)
			const q = query(collection(db, 'payments'), orderBy('paymentDate', 'desc'));
			const querySnapshot = await getDocs(q);
			
			payments = querySnapshot.docs.map(doc => {
				const data = doc.data();
				return {
					id: doc.id,
					...data,
					// 데이터가 없을 경우 기본값 처리
					payerName: data.payerName || '알 수 없음',
					productName: data.productName || '-',
					amount: data.amount || 0,
					method: data.method || '수시', // 정기 / 수시
					status: data.status || 'paid'
				};
			});
		} catch (error) {
			console.error("결제 내역 로딩 실패:", error);
			// (테스트용 더미 데이터 - DB가 비어있을 때 확인용)
			if (payments.length === 0) {
				payments = Array.from({ length: 15 }).map((_, i) => ({
					id: `pay_${i}`,
					payerName: `테스트유저${i+1}`,
					productName: i % 2 === 0 ? 'PRO 멤버십' : '프리미엄 모임권',
					amount: i % 2 === 0 ? 9900 : 15000,
					paymentDate: new Date().toISOString(),
					method: i % 3 === 0 ? '정기' : '수시',
					status: 'paid'
				}));
			}
		} finally {
			isLoading = false;
		}
	}

	// 날짜 포맷팅
	function formatDate(isoString) {
		if (!isoString) return '-';
		const date = new Date(isoString);
		return date.toLocaleString('ko-KR', {
			year: 'numeric', month: '2-digit', day: '2-digit',
			hour: '2-digit', minute: '2-digit'
		});
	}

	// 금액 포맷팅
	function formatPrice(price) {
		return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(price);
	}

	// [Derived] 상품 목록 (필터용 중복 제거)
	$: productOptions = [...new Set(payments.map(p => p.productName))].filter(Boolean);

	// [Derived] 필터링된 목록
	$: filteredPayments = payments.filter(p => {
		const matchesPayer = p.payerName.toLowerCase().includes(searchPayer.toLowerCase());
		const matchesProduct = searchProduct ? p.productName === searchProduct : true;
		const matchesMethod = searchMethod ? p.method === searchMethod : true;
		return matchesPayer && matchesProduct && matchesMethod;
	});

	// 필터 변경 시 1페이지로 리셋
	$: if (searchPayer || searchProduct || searchMethod) currentPage = 1;

	// [Derived] 페이지네이션 데이터
	$: totalPages = Math.ceil(filteredPayments.length / itemsPerPage);
	$: paginatedPayments = filteredPayments.slice(
		(currentPage - 1) * itemsPerPage, 
		currentPage * itemsPerPage
	);

	function goToPage(page) {
		if (page >= 1 && page <= totalPages) currentPage = page;
	}

	onMount(() => {
		fetchPayments();
	});
</script>

<div class="page-header">
	<h2>결제 내역</h2>
	</div>

<div class="filter-bar">
	<div class="search-group">
		<div class="search-box">
			<Search size={16} color="#718096" />
			<input 
				type="text" 
				placeholder="결제자 이름 검색" 
				bind:value={searchPayer} 
			/>
		</div>
	</div>

	<div class="filter-group">
		<div class="select-box">
			<Filter size={14} color="#718096" />
			<select bind:value={searchProduct}>
				<option value="">전체 상품</option>
				{#each productOptions as product}
					<option value={product}>{product}</option>
				{/each}
			</select>
		</div>

		<div class="select-box">
			<select bind:value={searchMethod}>
				<option value="">전체 결제방법</option>
				<option value="정기">정기결제</option>
				<option value="수시">수시결제</option>
			</select>
		</div>
	</div>
</div>

<div class="table-container">
	{#if isLoading}
		<Skeleton />
	{:else}
		<table>
			<thead>
				<tr>
					<th>결제일시</th>
					<th>결제자</th>
					<th>결제상품</th>
					<th>금액</th>
					<th>결제방법</th>
					<th>상태</th>
				</tr>
			</thead>
			<tbody>
				{#if paginatedPayments.length > 0}
					{#each paginatedPayments as payment}
						<tr>
							<td class="date">{formatDate(payment.paymentDate)}</td>
							<td><strong>{payment.payerName}</strong></td>
							<td>
								<span class="product-badge">{payment.productName}</span>
							</td>
							<td class="amount">{formatPrice(payment.amount)}</td>
							<td>
								<span class="method-badge {payment.method === '정기' ? 'regular' : 'adhoc'}">
									{payment.method}
								</span>
							</td>
							<td>
								<span class="status-badge {payment.status}">
									{payment.status === 'paid' ? '결제완료' : payment.status}
								</span>
							</td>
						</tr>
					{/each}
				{:else}
					<tr>
						<td colspan="6" class="empty-message">검색된 결제 내역이 없습니다.</td>
					</tr>
				{/if}
			</tbody>
		</table>

		{#if totalPages > 1}
			<div class="pagination">
				<button 
					class="page-btn" 
					disabled={currentPage === 1} 
					on:click={() => goToPage(currentPage - 1)}
				>
					<ChevronLeft size={16} />
				</button>
				
				<span class="page-info">
					Page <strong>{currentPage}</strong> of {totalPages}
				</span>

				<button 
					class="page-btn" 
					disabled={currentPage === totalPages} 
					on:click={() => goToPage(currentPage + 1)}
				>
					<ChevronRight size={16} />
				</button>
			</div>
		{/if}
	{/if}
</div>

<style>
	.page-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 16px;
	}
	h2 { margin: 0; font-size: 24px; color: #2d3748; }

	/* 필터 바 스타일 */
	.filter-bar {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 20px;
		gap: 12px;
		flex-wrap: wrap;
	}

	.search-box {
		display: flex;
		align-items: center;
		background: white;
		padding: 8px 12px;
		border-radius: 8px;
		border: 1px solid #e2e8f0;
		gap: 8px;
		width: 240px;
	}
	.search-box input { border: none; outline: none; width: 100%; font-size: 14px; }

	.filter-group { display: flex; gap: 10px; }

	.select-box {
		display: flex;
		align-items: center;
		background: white;
		padding: 0 12px;
		border-radius: 8px;
		border: 1px solid #e2e8f0;
		gap: 6px;
		height: 38px;
	}
	.select-box select {
		border: none;
		outline: none;
		font-size: 13px;
		color: #4a5568;
		background: transparent;
		cursor: pointer;
	}

	/* 테이블 스타일 */
	.table-container {
		background: white;
		border-radius: 12px;
		box-shadow: 0 2px 4px rgba(0,0,0,0.05);
		overflow: hidden;
		display: flex;
		flex-direction: column;
	}
	table { width: 100%; border-collapse: collapse; min-width: 800px; }
	th {
		text-align: left; padding: 16px 24px;
		background-color: #f7fafc; color: #718096;
		font-size: 12px; font-weight: 600; text-transform: uppercase;
		border-bottom: 1px solid #e2e8f0;
	}
	td {
		padding: 16px 24px; border-bottom: 1px solid #edf2f7;
		vertical-align: middle; font-size: 14px; color: #4a5568;
	}
	tr:last-child td { border-bottom: none; }
	tr:hover { background-color: #fafafa; }

	.date { font-size: 13px; color: #718096; font-family: monospace; }
	.amount { font-weight: bold; color: #2d3748; }

	/* 배지 스타일 */
	.product-badge {
		background-color: #edf2f7; color: #4a5568;
		padding: 4px 8px; border-radius: 6px; font-size: 12px;
	}
	.method-badge {
		padding: 4px 8px; border-radius: 12px; font-size: 11px; font-weight: 600;
	}
	.method-badge.regular { background-color: #e9d8fd; color: #6b46c1; } /* 정기: 보라색 */
	.method-badge.adhoc { background-color: #bee3f8; color: #2b6cb0; }   /* 수시: 파란색 */

	.status-badge {
		padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 600;
	}
	.status-badge.paid { color: #276749; background-color: #f0fff4; } /* 초록색 배경 */

	/* 페이지네이션 */
	.pagination {
		display: flex; align-items: center; justify-content: center;
		padding: 16px; border-top: 1px solid #e2e8f0; gap: 16px;
	}
	.page-btn {
		background: white; border: 1px solid #e2e8f0; border-radius: 4px;
		padding: 6px; cursor: pointer; display: flex; align-items: center; justify-content: center;
		transition: all 0.2s;
	}
	.page-btn:hover:not(:disabled) { background-color: #f7fafc; }
	.page-btn:disabled { color: #cbd5e0; cursor: not-allowed; }
	.page-info { font-size: 13px; color: #4a5568; }

	.empty-message { text-align: center; padding: 40px; color: #a0aec0; }
</style>