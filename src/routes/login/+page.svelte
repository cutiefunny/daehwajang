<script>
	import { auth } from '$lib/firebase';
	import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
	import { goto } from '$app/navigation';
	import { user } from '$lib/stores'; // 방금 만든 스토어

	// 이미 로그인되어 있다면 홈으로 리다이렉트
	$: if ($user) {
		goto('/');
	}

	async function handleGoogleLogin() {
		try {
			const provider = new GoogleAuthProvider();
			await signInWithPopup(auth, provider);
			// 로그인 성공 시 자동감지되어 스토어가 업데이트되고 홈으로 이동됨
		} catch (error) {
			console.error('로그인 실패:', error);
			alert('로그인 중 오류가 발생했습니다.');
		}
	}
</script>

<div class="login-container">
	<div class="logo-area">
		<div class="logo-icon">💬</div>
		<h1 class="app-name">대화의 장</h1>
		<p class="slogan">좋은 사람들과 나누는<br>따뜻한 대화</p>
	</div>

	<div class="button-area">
		<button class="google-btn" on:click={handleGoogleLogin}>
			<img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" />
			<span>Google 계정으로 시작하기</span>
		</button>
		
		<p class="notice">
			로그인 시 이용약관 및 개인정보처리방침에<br>동의하는 것으로 간주합니다.
		</p>
	</div>
</div>

<style>
	.login-container {
		height: 100%;
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		padding: 60px 24px;
		background-color: white;
		text-align: center;
	}

	.logo-area {
		margin-top: 80px;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 16px;
	}

	.logo-icon {
		font-size: 64px;
		margin-bottom: 10px;
	}

	.app-name {
		font-size: 28px;
		font-weight: 800;
		color: #333;
		margin: 0;
	}

	.slogan {
		font-size: 16px;
		color: #666;
		line-height: 1.5;
		margin: 0;
	}

	.button-area {
		margin-bottom: 40px;
		display: flex;
		flex-direction: column;
		gap: 20px;
	}

	.google-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 12px;
		background-color: white;
		border: 1px solid #ddd;
		border-radius: 12px;
		padding: 14px;
		font-size: 16px;
		font-weight: 600;
		color: #333;
		cursor: pointer;
		transition: background-color 0.2s;
		box-shadow: 0 2px 4px rgba(0,0,0,0.05);
	}

	.google-btn:active {
		background-color: #f5f5f5;
		transform: scale(0.98);
	}

	.google-btn img {
		width: 20px;
		height: 20px;
	}

	.notice {
		font-size: 12px;
		color: #999;
		line-height: 1.4;
	}
</style>