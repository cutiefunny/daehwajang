<script>
	import { onMount } from 'svelte';
	import { user, toast } from '$lib/stores';
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
					// 4. Firestore에 토큰 저장 (멀티 디바이스 지원을 위해 배열에 추가)
					await saveTokenToUser($user.uid, token);
				}
			} else {
				console.log('알림 권한이 거부되었습니다.');
			}

			// 5. 포그라운드 메시지 수신 대기 (앱을 보고 있을 때)
			onMessage(messaging, (payload) => {
				console.log('포그라운드 메시지 수신:', payload);
				// 기존에 만들어둔 toast 스토어를 활용해 알림 표시
				const title = payload.notification?.title || '알림';
				const body = payload.notification?.body || '새로운 메시지가 도착했습니다.';
				
				toast.send(`${title}: ${body}`, 'info', 4000);
			});

		} catch (error) {
			console.error('알림 설정 실패:', error);
		}
	});

	async function saveTokenToUser(uid, token) {
		try {
			const userRef = doc(db, 'users', uid);
			// arrayUnion을 사용하여 중복 없이 토큰 추가
			await updateDoc(userRef, {
				fcmTokens: arrayUnion(token)
			});
		} catch (e) {
			console.error('토큰 저장 실패:', e);
		}
	}
</script>