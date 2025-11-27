<script>
	import { page } from '$app/stores';
	import { user, modal } from '$lib/stores';
	// [추가] Firebase Auth 관련 임포트
	import { auth } from '$lib/firebase';
	import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
	
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

	// [추가] 관리자 페이지 전용 로그인 핸들러
	async function handleAdminLogin() {
		try {
			const provider = new GoogleAuthProvider();
			await signInWithPopup(auth, provider);
			// 로그인 성공 시 반응형 변수($user)가 업데이트되어 자동으로 화면이 전환됩니다.
		} catch (error) {
			console.error('관리자 로그인 실패:', error);
			await modal.alert('로그인에 실패했습니다.');
		}
	}
</script>

{#if $user}
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
{:else}
	<div class="admin-login-container">
		<div class="login-card">
			<div class="icon-wrapper">
				<LayoutDashboard size={48} color="#3182ce" />
			</div>
			<h2>관리자 로그인</h2>
			<p>관리자 페이지에 접근하려면 로그인이 필요합니다.</p>
			
			<button class="login-btn" on:click={handleAdminLogin}>
				<img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" />
				<span>Google 계정으로 계속하기</span>
			</button>
			
			<a href="/" class="back-link">메인으로 돌아가기</a>
		</div>
	</div>
{/if}

<style>
	/* 어드민 전체 컨테이너: 100% 너비 사용 */
	.admin-container {
		display: flex;
		height: 100vh;
		background-color: #f5f7fa;
		width: 100vw;
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

	/* [추가] 관리자 로그인 화면 스타일 */
	.admin-login-container {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 100vh;
		background-color: #f5f7fa;
		width: 100vw;
	}
	
	.login-card {
		background: white;
		padding: 40px;
		border-radius: 16px;
		box-shadow: 0 4px 20px rgba(0,0,0,0.05);
		text-align: center;
		width: 100%;
		max-width: 360px;
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.icon-wrapper {
		margin-bottom: 24px;
		background-color: #ebf8ff;
		width: 80px;
		height: 80px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.login-card h2 { margin: 0 0 12px 0; color: #2d3748; font-size: 24px; font-weight: 800; }
	.login-card p { margin: 0 0 32px 0; color: #718096; font-size: 14px; }

	.login-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 12px;
		background-color: white;
		border: 1px solid #e2e8f0;
		border-radius: 12px;
		padding: 12px 20px;
		font-size: 15px;
		font-weight: 600;
		color: #2d3748;
		cursor: pointer;
		transition: all 0.2s;
		width: 100%;
		margin-bottom: 20px;
	}

	.login-btn:hover { background-color: #f7fafc; border-color: #cbd5e0; }
	.login-btn img { width: 20px; height: 20px; }

	.back-link {
		font-size: 13px;
		color: #a0aec0;
		text-decoration: underline;
		transition: color 0.2s;
	}
	.back-link:hover { color: #718096; }
</style>