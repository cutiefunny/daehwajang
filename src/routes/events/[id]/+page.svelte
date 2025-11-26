<script>
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { db } from '$lib/firebase';
	import { doc, getDoc } from 'firebase/firestore';
	import { ArrowLeft, Calendar, Link as LinkIcon } from 'lucide-svelte';
	import Skeleton from '$lib/components/Skeleton.svelte';

	const eventId = $page.params.id;
	let event = null;
	let isLoading = true;

	onMount(async () => {
		try {
			const docRef = doc(db, 'events', eventId);
			const docSnap = await getDoc(docRef);
			if (docSnap.exists()) {
				event = { id: docSnap.id, ...docSnap.data() };
			}
		} catch (error) {
			console.error("이벤트 로딩 실패:", error);
		} finally {
			isLoading = false;
		}
	});

	function goBack() {
		history.back();
	}

	function formatDate(dateStr) {
		if (!dateStr) return '';
		return new Date(dateStr).toLocaleDateString('ko-KR', {
			year: 'numeric', month: 'long', day: 'numeric'
		});
	}
</script>

<div class="page-container">
	<header class="header">
		<button class="back-btn" on:click={goBack}>
			<ArrowLeft size={24} />
		</button>
		<h1 class="title">이벤트 상세</h1>
		<div class="spacer"></div>
	</header>

	{#if isLoading}
		<Skeleton />
	{:else if event}
		<div class="content">
			<div class="image-wrapper">
				{#if event.image}
					<img src={event.image} alt={event.title} />
				{:else}
					<div class="no-image">이미지 없음</div>
				{/if}
			</div>

			<div class="info-section">
				<h2 class="event-title">{event.title}</h2>
				
				<div class="period-box">
					<Calendar size={16} />
					<span>{formatDate(event.startDate)} ~ {formatDate(event.endDate)}</span>
				</div>

				{#if event.description}
					<div class="description">
						{event.description}
					</div>
				{/if}
			</div>
		</div>

		{#if event.link}
			<div class="bottom-action">
				<a href={event.link} target="_blank" class="action-btn">
					자세히 보기 <LinkIcon size={16} />
				</a>
			</div>
		{/if}
	{:else}
		<div class="error">존재하지 않거나 삭제된 이벤트입니다.</div>
	{/if}
</div>

<style>
	.page-container { display: flex; flex-direction: column; height: 100vh; background: #fff; }
	
	.header {
		height: 56px; display: flex; align-items: center; justify-content: space-between;
		padding: 0 16px; border-bottom: 1px solid #f0f0f0; flex-shrink: 0;
	}
	.back-btn { background: none; border: none; cursor: pointer; padding: 4px; }
	.title { font-size: 18px; font-weight: bold; margin: 0; }
	.spacer { width: 32px; }

	.content { flex: 1; overflow-y: auto; padding-bottom: 80px; }
	
	.image-wrapper { width: 100%; aspect-ratio: 16/9; background: #f5f5f5; overflow: hidden; }
	.image-wrapper img { width: 100%; height: 100%; object-fit: cover; }
	.no-image { display: flex; align-items: center; justify-content: center; height: 100%; color: #999; }

	.info-section { padding: 24px 20px; }
	.event-title { font-size: 22px; font-weight: bold; margin: 0 0 12px 0; color: #1a1a1a; }
	
	.period-box {
		display: inline-flex; align-items: center; gap: 6px;
		background: #f7fafc; padding: 8px 12px; border-radius: 8px;
		color: #4a5568; font-size: 14px; font-weight: 500; margin-bottom: 24px;
	}

	.description {
		font-size: 15px; line-height: 1.6; color: #4a4a4a;
		white-space: pre-wrap; /* 줄바꿈 보존 */
	}

	.bottom-action {
		position: fixed; bottom: 0; left: 0; right: 0;
		padding: 16px 20px; background: white; border-top: 1px solid #f0f0f0;
		/* 모바일 레이아웃 max-width 대응 */
		max-width: 600px; margin: 0 auto; 
	}
	.action-btn {
		display: flex; align-items: center; justify-content: center; gap: 8px;
		width: 100%; padding: 14px; background: #3182ce; color: white;
		border-radius: 12px; font-weight: bold; text-decoration: none;
		transition: background 0.2s;
	}
	.action-btn:hover { background: #2b6cb0; }

	.error { padding: 40px; text-align: center; color: #999; }
</style>