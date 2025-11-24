<script>
	import { page } from '$app/stores';
	import { 
		LayoutDashboard, 
		Settings, 
		Users, 
		Calendar, 
		MessageSquare, 
		CreditCard, 
		Gift, 
		Image as ImageIcon,
		LogOut
	} from 'lucide-svelte';

	let { children } = $props();

	// 요청하신 카테고리별 메뉴 구성
	const menuItems = [
		{ path: '/admin', label: '대시보드', icon: LayoutDashboard },
		{ path: '/admin/settings', label: '일반 설정', icon: Settings },
		{ path: '/admin/users', label: '회원 관리', icon: Users },
		{ path: '/admin/meetings', label: '모임 관리', icon: Calendar },
		{ path: '/admin/chats', label: '채팅방 관리', icon: MessageSquare },
		{ path: '/admin/payments', label: '결제 내역', icon: CreditCard },
		{ path: '/admin/events', label: '이벤트 관리', icon: Gift },
		{ path: '/admin/banners', label: '배너 관리', icon: ImageIcon },
	];

	const isActive = (path) => {
		if (path === '/admin') return $page.url.pathname === '/admin';
		return $page.url.pathname.startsWith(path);
	};
</script>

<div class="admin-container">
	<aside class="sidebar">
		<div class="sidebar-header">
			<h2>Admin</h2>
			<span class="badge">MASTER</span>
		</div>
		
		<nav class="nav-menu">
			{#each menuItems as item}
				<a 
					href={item.path} 
					class="nav-item" 
					class:active={isActive(item.path)}
				>
					<item.icon size={20} />
					<span>{item.label}</span>
				</a>
			{/each}
		</nav>

		<div class="sidebar-footer">
			<a href="/" class="nav-item logout">
				<LogOut size={20} />
				<span>앱으로 돌아가기</span>
			</a>
		</div>
	</aside>

	<main class="main-content">
		<header class="top-bar">
			<h1 class="page-title">
				{menuItems.find(i => isActive(i.path))?.label || '관리자 페이지'}
			</h1>
			<div class="profile">
				<span>관리자님</span>
				<div class="avatar">A</div>
			</div>
		</header>
		
		<div class="content-area">
			{@render children()}
		</div>
	</main>
</div>

<style>
	/* 어드민 전체 컨테이너: 100% 너비 사용 */
	.admin-container {
		display: flex;
		height: 100vh;
		background-color: #f5f7fa;
		width: 100vw; /* 전체 너비 사용 */
	}

	.sidebar {
		width: 240px;
		background-color: #1a1c23;
		color: #a0aec0;
		display: flex;
		flex-direction: column;
		flex-shrink: 0;
	}

	.sidebar-header {
		padding: 24px;
		display: flex;
		align-items: center;
		gap: 8px;
		border-bottom: 1px solid #2d3748;
	}

	.sidebar-header h2 { color: white; margin: 0; font-size: 20px; }

	.badge {
		background-color: #4299e1;
		color: white;
		font-size: 10px;
		padding: 2px 6px;
		border-radius: 4px;
		font-weight: bold;
	}

	.nav-menu { flex: 1; padding: 20px 0; overflow-y: auto; }

	.nav-item {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 12px 24px;
		color: inherit;
		text-decoration: none;
		transition: all 0.2s;
		font-size: 14px;
	}

	.nav-item:hover { background-color: #2d3748; color: white; }

	.nav-item.active {
		background-color: #2d3748;
		color: #63b3ed;
		border-right: 3px solid #63b3ed;
	}

	.sidebar-footer { padding: 20px 0; border-top: 1px solid #2d3748; }

	.main-content {
		flex: 1;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.top-bar {
		height: 60px;
		background-color: white;
		border-bottom: 1px solid #e2e8f0;
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0 32px;
	}

	.page-title { font-size: 18px; font-weight: bold; color: #2d3748; margin: 0; }

	.profile { display: flex; align-items: center; gap: 12px; font-size: 14px; color: #4a5568; }

	.avatar {
		width: 32px; height: 32px; background-color: #cbd5e0;
		border-radius: 50%; display: flex; align-items: center; justify-content: center;
		font-weight: bold; color: white;
	}

	.content-area { flex: 1; padding: 32px; overflow-y: auto; }
</style>