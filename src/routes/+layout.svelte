<script>
	import favicon from '$lib/assets/favicon.svg';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { user, appSettings } from '$lib/stores';
	import { Search, Home, MessageSquare, User, BookOpen, LogIn, X } from 'lucide-svelte';
	import ConfirmModal from '$lib/components/ConfirmModal.svelte';
	import ToastContainer from '$lib/components/ToastContainer.svelte';
	// [추가] NotificationManager 임포트
	import NotificationManager from '$lib/components/NotificationManager.svelte'; 
	import { fade, slide } from 'svelte/transition';

	let { children } = $props();
	const isActive = (path) => $page.url.pathname === path;
	let isAdminPage = $derived($page.url.pathname.startsWith('/admin'));

	// Svelte 5 Runes 문법($state) 적용
	let isSearchOpen = $state(false);
	let globalSearchQuery = $state('');
	let searchInputRef;

	function toggleSearch() {
		isSearchOpen = !isSearchOpen;
		if (isSearchOpen) {
			// 열릴 때 포커스
			setTimeout(() => searchInputRef?.focus(), 100);
		} else {
			globalSearchQuery = '';
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
				<button class="icon-btn" aria-label="검색" on:click={toggleSearch}>
					{#if isSearchOpen}
						<X size={24} />
					{:else}
						<Search size={24} />
					{/if}
				</button>
			</div>

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
    /* 스타일은 기존 그대로 유지 */
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

	.logo { font-size: 20px; font-weight: bold; margin: 0; }
	.icon-btn { background: none;
		border: none; cursor: pointer; padding: 4px; color: #333; display: flex; align-items: center; justify-content: center;}
	
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

	.nav-item.active { color: #333; font-weight: bold; }
	.avatar-placeholder { width: 24px; height: 24px; border-radius: 50%; background-color: #eee;
		display: flex;
		align-items: center; justify-content: center; overflow: hidden; }
	.user-avatar { width: 100%; height: 100%; object-fit: cover; }
</style>