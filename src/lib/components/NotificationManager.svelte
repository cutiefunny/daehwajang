<script>
	import { onMount } from 'svelte';
	import { user } from '$lib/stores';
	import { db, messaging } from '$lib/firebase';
	import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
	import { getToken, onMessage } from 'firebase/messaging';

	// [필수] Firebase Console에서 발급받은 '웹 푸시 인증서(키 쌍)' 값을 넣으세요.
	const VAPID_KEY = "BCfJ0FpjsVAG424zRF0tfAWcmlCCCaZzkrUh6b4dUxOtWGspPGZ3xSQ1SJaL_2551mZtV3AtuDx5Pun7dLMr4v4";

	onMount(async () => {
		// 1. 메시징 지원 여부 및 로그인 체크
		if (!messaging || !$user) return;

		try {
			// 2. 알림 권한 요청
			const permission = await Notification.requestPermission();
			
			if (permission === 'granted') {
				// 3. FCM 토큰 발급
				const token = await getToken(messaging, { vapidKey: VAPID_KEY });
				
				if (token) {
					console.log('FCM Token:', token);
					// 4. Firestore에 토큰 저장
					await saveTokenToUser($user.uid, token);
				}
			} else {
				console.log('알림 권한이 거부되었습니다.');
			}

			// 5. 포그라운드 메시지 수신 대기
			// (앱이 켜져 있을 때도 FCM 메시지는 오지만, UI 처리는 +layout.svelte의 Firestore 리스너가 담당하므로
			//  여기서는 별도의 toast나 store update를 하지 않아 중복을 방지합니다.)
			onMessage(messaging, (payload) => {
				console.log('FCM 메시지 수신(Foreground):', payload);
			});

		} catch (error) {
			console.error('알림 설정 실패:', error);
		}
	});

	async function saveTokenToUser(uid, token) {
		try {
			const userRef = doc(db, 'users', uid);
			await updateDoc(userRef, {
				fcmTokens: arrayUnion(token)
			});
		} catch (e) {
			console.error('토큰 저장 실패:', e);
		}
	}
</script>