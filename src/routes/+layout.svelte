<script>
	import favicon from '$lib/assets/favicon.svg';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { user, appSettings, notifications, toast } from '$lib/stores';
	import { db } from '$lib/firebase';
	import { collection, query, where, orderBy, onSnapshot, limit } from 'firebase/firestore';
	import { onMount, onDestroy } from 'svelte';
	import { Search, Home, MessageSquare, User, BookOpen, LogIn, X, Bell, Trash2 } from 'lucide-svelte';
	import ConfirmModal from '$lib/components/ConfirmModal.svelte';
	import ToastContainer from '$lib/components/ToastContainer.svelte';
	import NotificationManager from '$lib/components/NotificationManager.svelte';
	import { fade, slide } from 'svelte/transition';

	let { children } = $props();

	const isActive = (path) => $page.url.pathname === path;
	let isAdminPage = $derived($page.url.pathname.startsWith('/admin'));

	// Svelte 4 호환 문법
	let isSearchOpen = false;
	let isNotificationOpen = false;
	let globalSearchQuery = '';
	let searchInputRef;
	let notiUnsubscribe = null;

	// Firestore 알림 리스너
	function subscribeToNotifications(userId) {
		if (notiUnsubscribe) notiUnsubscribe();

		const q = query(
			collection(db, 'notifications'),
			where('targetUserId', '==', userId),
			orderBy('timestamp', 'desc'),
			limit(50)
		);

		notiUnsubscribe = onSnapshot(q, (snapshot) => {
			// 1. 새로운 알림 감지 (실시간 알림 효과)
			snapshot.docChanges().forEach((change) => {
				if (change.type === 'added') {
					const data = change.doc.data();
					
					// 타임스탬프 확인 (최근 10초 내에 생성된 알림만 팝업)
					// (페이지 새로고침 시 과거 알림이 우르르 뜨는 것을 방지)
					const notiTime = data.timestamp?.toDate ? data.timestamp.toDate() : new Date(data.timestamp);
					const now = new Date();
					
					// [수정] 브라우저 알림 제거, 토스트만 유지
					if (now - notiTime < 10000) { 
						toast.send(data.title); 
					}
				}
			});

			// 2. 스토어 데이터 동기화
			const loadedNotis = snapshot.docs.map(doc => ({
				id: doc.id,
				...doc.data(),
				timestamp: doc.data().timestamp?.toDate().toISOString() || new Date().toISOString()
			}));
			
			notifications.set(loadedNotis);
		});
	}

	// 로그인 상태 변경 감지 및 리스너 연결
	$effect(() => {
		if (!$user) {
			if (notiUnsubscribe) { notiUnsubscribe(); notiUnsubscribe = null; }
			notifications.clear();
			return;
		}

		subscribeToNotifications($user.uid);

		return () => {
			if (notiUnsubscribe) { notiUnsubscribe(); notiUnsubscribe = null; }
		};
	});

	onDestroy(() => {
		if (notiUnsubscribe) notiUnsubscribe();
	});

	function toggleSearch() {
		isSearchOpen = !isSearchOpen;
		if (isSearchOpen) {
			isNotificationOpen = false;
			setTimeout(() => searchInputRef?.focus(), 100);
		} else {
			globalSearchQuery = '';
		}
	}

	function toggleNotification() {
		isNotificationOpen = !isNotificationOpen;
		if (isNotificationOpen) {
			isSearchOpen = false;
		}
	}

	function handleGlobalSearch() {
		if (!globalSearchQuery.trim()) return;
		goto(`/meetings?q=${encodeURIComponent(globalSearchQuery)}`);
		isSearchOpen = false;
		globalSearchQuery = '';
	}

	function handleKeydown(e) {
		if (e.key === 'Enter') handleGlobalSearch();
		if (e.key === 'Escape') toggleSearch();
	}

	function formatTime(isoString) {
		if (!isoString) return '';
		const date = new Date(isoString);
		const now = new Date();
		const diff = (now - date) / 1000;
		
		if (diff < 60) return '방금 전';
		if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
		if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
		return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
	}
	
	function handleNotificationClick(noti) {
		if (noti.link) {
			goto(noti.link);
			isNotificationOpen = false;
		}
	}
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<ConfirmModal />
<ToastContainer />
{#if $user}
	<NotificationManager />
{/if}

{#if isAdminPage}
	{@render children()}
{:else}
	<div class="app-container" style="background-color: {$appSettings.appBg ?? '#ffffff'};">
		
		<header class="app-header" style="background-color: {$appSettings.headerFooterBg ?? '#ffffff'};">
            <div class="header-top">
				<h1 class="logo">{$appSettings.logoText}</h1>
				
				<div class="header-actions">
					<button class="icon-btn bell-btn" aria-label="알림" on:click={toggleNotification}>
						{#if isNotificationOpen}
							<X size={24} />
						{:else}
							<Bell size={24} />
							{#if $notifications.some(n => !n.read)}
								<span class="badge-dot"></span>
							{/if}
						{/if}
					</button>

					<button class="icon-btn" aria-label="검색" on:click={toggleSearch}>
						{#if isSearchOpen}
							<X size={24} />
						{:else}
							<Search size={24} />
						{/if}
					</button>
				</div>
			</div>

			{#if isNotificationOpen}
				<div class="notification-area" transition:slide={{ duration: 200, axis: 'y' }}>
					<div class="noti-header">
						<span class="noti-label">알림 히스토리</span>
						<button class="clear-btn" on:click={() => notifications.clear()}>
							<Trash2 size={12} /> 전체 삭제
						</button>
					</div>
					
					<div class="noti-list">
						{#if $notifications.length > 0}
							{#each $notifications as noti (noti.id)}
								<div 
									class="noti-item {noti.read ? 'read' : 'unread'}" 
									on:click={() => handleNotificationClick(noti)}
									role="button"
									tabindex="0"
									on:keydown={(e) => e.key === 'Enter' && handleNotificationClick(noti)}
								>
									<div class="noti-content">
										<p class="noti-title">{noti.title}</p>
										<p class="noti-body">{noti.body}</p>
									</div>
									<span class="noti-time">{formatTime(noti.timestamp)}</span>
								</div>
							{/each}
						{:else}
							<div class="empty-noti">
								<Bell size={32} color="#cbd5e0" />
								<p>새로운 알림이 없습니다.</p>
							</div>
						{/if}
					</div>
				</div>
			{/if}

			{#if isSearchOpen}
				<div class="header-search-area" transition:slide={{ duration: 200, axis: 'y' }}>
					<div class="search-input-wrapper">
						<Search size={18} class="search-icon-small" />
						<input 
							type="text" 
							placeholder="모임명, 지역 등을 검색해보세요" 
							bind:this={searchInputRef}
							bind:value={globalSearchQuery}
							on:keydown={handleKeydown}
						/>
					</div>
				</div>
			{/if}
		</header>

		<main class="app-content">
			{#key $page.url.pathname}
				<div class="page-transition-wrapper" in:fade={{ duration: 200, delay: 200 }} out:fade={{ duration: 200 }}>
					{@render children()}
				</div>
			{/key}
		</main>

		<nav class="app-footer" style="background-color: {$appSettings.headerFooterBg ?? '#ffffff'};">
            <a href="/" class="nav-item" class:active={isActive('/')}>
				<Home size={24} />
				<span>홈</span>
			</a>
			<a href="/my-daehwajang" class="nav-item" class:active={isActive('/my-daehwajang')}>
				<BookOpen size={24} />
				<span>내 대화장</span>
			</a>
			<a href="/chat" class="nav-item" class:active={isActive('/chat')}>
				<MessageSquare size={24} />
				<span>대화</span>
			</a>

			{#if $user}
				<a href="/profile" class="nav-item" class:active={isActive('/profile')}>
					<div class="avatar-placeholder">
						{#if $user.photoURL}
							<img src={$user.photoURL} alt="User" class="user-avatar" />
						{:else}
							<User size={24} />
						{/if}
					</div>
					<span>내 프로필</span>
				</a>
			{:else}
				<a href="/login" class="nav-item" class:active={isActive('/login')}>
					<LogIn size={24} />
					<span>로그인</span>
				</a>
			{/if}
		</nav>
	</div>
{/if}

<style>
	:global(body) {
		margin: 0;
		padding: 0;
		box-sizing: border-box;
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
		background-color: #f5f5f5;
	}

	.app-container {
		display: flex;
		flex-direction: column;
		height: 100vh;
		max-width: 600px;
		margin: 0 auto;
		box-shadow: 0 0 20px rgba(0, 0, 0, 0.05);
		overflow: hidden;
	}

	.app-header {
		display: flex;
		flex-direction: column;
		min-height: 60px;
		justify-content: center;
		border-bottom: 1px solid rgba(0,0,0,0.05);
		flex-shrink: 0;
		z-index: 10;
		transition: all 0.2s;
	}

	.header-top {
		height: 60px;
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0 16px;
		width: 100%;
		box-sizing: border-box;
	}

	.logo { font-size: 20px; font-weight: bold; margin: 0; }
	
	.header-actions { display: flex; gap: 4px; align-items: center; }

	.icon-btn { background: none;
		border: none; cursor: pointer; padding: 8px; color: #333;
		display: flex; align-items: center; justify-content: center;
		position: relative;
	}
	
	.badge-dot {
		position: absolute; top: 8px; right: 8px;
		width: 6px; height: 6px; background-color: #e53e3e;
		border-radius: 50%; border: 1px solid white;
	}

	.notification-area {
		background-color: #f9fafb;
		border-top: 1px solid #f0f0f0;
		max-height: 300px;
		overflow-y: auto;
		box-shadow: inset 0 -4px 6px -4px rgba(0,0,0,0.05);
	}
	.noti-header {
		display: flex; justify-content: space-between; align-items: center;
		padding: 12px 16px; border-bottom: 1px solid #eee;
	}
	.noti-label { font-size: 13px; font-weight: bold; color: #4a5568; }
	.clear-btn {
		display: flex; align-items: center; gap: 4px;
		background: none; border: none; color: #a0aec0; font-size: 11px; cursor: pointer;
	}
	.clear-btn:hover { color: #e53e3e; }

	.noti-list { display: flex; flex-direction: column; }
	.noti-item {
		padding: 12px 16px; border-bottom: 1px solid #f0f0f0;
		display: flex; justify-content: space-between; align-items: flex-start; gap: 12px;
		background-color: white; cursor: pointer; transition: background 0.2s;
	}
	.noti-item:hover { background-color: #fafafa; }
	.noti-item:last-child { border-bottom: none; }
	
	.noti-content { flex: 1; }
	.noti-title { font-size: 13px; font-weight: 600; color: #2d3748; margin: 0 0 4px 0; }
	.noti-body { font-size: 12px; color: #718096; margin: 0; line-height: 1.4; }
	.noti-time { font-size: 10px; color: #cbd5e0; flex-shrink: 0; margin-top: 2px; }

	.empty-noti {
		padding: 40px 0; text-align: center; color: #a0aec0;
		display: flex; flex-direction: column; align-items: center; gap: 8px;
	}
	.empty-noti p { margin: 0; font-size: 13px; }

	.header-search-area {
		padding: 0 16px 16px 16px;
		width: 100%;
		box-sizing: border-box;
	}

	.search-input-wrapper {
		background-color: #f5f7fa;
		border-radius: 12px;
		padding: 10px 12px;
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.search-icon-small {
		color: #a0aec0;
	}

	.search-input-wrapper input {
		border: none;
		background: transparent;
		width: 100%;
		font-size: 14px;
		outline: none;
		color: #2d3748;
	}
	
	.app-content { 
		flex: 1; 
		overflow-y: auto;
		padding-bottom: 20px; 
		position: relative;
	}

	.page-transition-wrapper {
		width: 100%;
		min-height: 100%;
	}

	.app-footer {
		height: 64px;
		display: flex;
		justify-content: space-around;
		align-items: center;
		border-top: 1px solid rgba(0,0,0,0.05);
		flex-shrink: 0;
		z-index: 10;
	}

	.nav-item {
		display: flex;
		flex-direction: column;
		align-items: center;
		text-decoration: none;
		color: #999;
		font-size: 12px;
		gap: 4px;
	}

	.nav-item.active { color: #333; font-weight: bold;
	}
	.avatar-placeholder { width: 24px; height: 24px; border-radius: 50%; background-color: #eee;
		display: flex;
		align-items: center; justify-content: center; overflow: hidden;
	}
	.user-avatar { width: 100%; height: 100%; object-fit: cover; }
</style>