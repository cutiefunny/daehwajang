<script>
	import favicon from '$lib/assets/favicon.svg';
	import { page } from '$app/stores';
	import { Search, Home, MessageSquare, User, BookOpen } from 'lucide-svelte';

	let { children } = $props();

	// 현재 활성화된 탭인지 확인하는 헬퍼 함수
	const isActive = (path) => $page.url.pathname === path;
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="app-container">
	<header class="app-header">
		<h1 class="logo">대화의 장</h1>
		<button class="icon-btn" aria-label="검색">
			<Search size={24} />
		</button>
	</header>

	<main class="app-content">
		{@render children()}
	</main>

	<nav class="app-footer">
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
		<a href="/profile" class="nav-item" class:active={isActive('/profile')}>
			<div class="avatar-placeholder">
				<User size={24} />
			</div>
			<span>내 프로필</span>
		</a>
	</nav>
</div>

<style>
	/* 앱 전체 레이아웃 */
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
		max-width: 600px; /* 모바일 뷰 제한 */
		margin: 0 auto;
		background-color: white;
		box-shadow: 0 0 20px rgba(0, 0, 0, 0.05);
	}

	/* 헤더 스타일 */
	.app-header {
		height: 60px;
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0 16px;
		border-bottom: 1px solid #eee;
		background-color: white;
		flex-shrink: 0;
	}

	.logo {
		font-size: 20px;
		font-weight: bold;
		margin: 0;
	}

	.icon-btn {
		background: none;
		border: none;
		cursor: pointer;
		padding: 4px;
	}

	/* 콘텐츠 영역 (스크롤 가능) */
	.app-content {
		flex: 1;
		overflow-y: auto;
		padding-bottom: 20px; /* 푸터 공간 확보 필요 없음 (flex 구조라 자동 처리됨) */
	}

	/* 푸터 스타일 */
	.app-footer {
		height: 64px;
		display: flex;
		justify-content: space-around;
		align-items: center;
		border-top: 1px solid #eee;
		background-color: white;
		flex-shrink: 0;
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

	.nav-item.active {
		color: #333;
		font-weight: bold;
	}

	.avatar-placeholder {
		width: 24px;
		height: 24px;
		border-radius: 50%;
		background-color: #eee;
		display: flex;
		align-items: center;
		justify-content: center;
		overflow: hidden;
	}
</style>