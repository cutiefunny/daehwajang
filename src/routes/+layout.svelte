<script>
	import favicon from '$lib/assets/favicon.svg';
	import { page } from '$app/stores';
	import { user, appSettings } from '$lib/stores';
	import { Search, Home, MessageSquare, User, BookOpen, LogIn } from 'lucide-svelte';
	import ConfirmModal from '$lib/components/ConfirmModal.svelte';
	import ToastContainer from '$lib/components/ToastContainer.svelte'; // [추가]
	import { fade } from 'svelte/transition'; // [추가] 애니메이션용

	let { children } = $props();
	const isActive = (path) => $page.url.pathname === path;
	let isAdminPage = $derived($page.url.pathname.startsWith('/admin'));
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<ConfirmModal />
<ToastContainer /> {#if isAdminPage}
    {@render children()}
{:else}
    <div class="app-container" style="background-color: {$appSettings.appBg ?? '#ffffff'};">
		
		<header class="app-header" style="background-color: {$appSettings.headerFooterBg ?? '#ffffff'};">
			<h1 class="logo">{$appSettings.logoText}</h1>
			<button class="icon-btn" aria-label="검색">
				<Search size={24} />
			</button>
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
		overflow: hidden; /* 애니메이션 시 스크롤바 방지 */
	}

	.app-header {
		height: 60px;
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0 16px;
		border-bottom: 1px solid rgba(0,0,0,0.05);
		flex-shrink: 0;
		z-index: 10; /* 헤더가 콘텐츠 위에 오도록 */
	}

	.logo { font-size: 20px; font-weight: bold; margin: 0; }
	.icon-btn { background: none; border: none; cursor: pointer; padding: 4px; }
	
	.app-content { 
		flex: 1; 
		overflow-y: auto; 
		padding-bottom: 20px; 
		position: relative; /* 절대 위치 자식 요소를 위해 */
	}

	/* [추가] 페이지 전환 래퍼 */
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
	.avatar-placeholder { width: 24px; height: 24px; border-radius: 50%; background-color: #eee; display: flex;
		align-items: center; justify-content: center; overflow: hidden; }
	.user-avatar { width: 100%; height: 100%; object-fit: cover; }
</style>