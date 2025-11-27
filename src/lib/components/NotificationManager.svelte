<script>
	import { onMount } from 'svelte';
	import { user } from '$lib/stores';
	import { db, messaging } from '$lib/firebase';
	import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
	import { getToken, onMessage } from 'firebase/messaging';

	// [필수] Firebase Console에서 발급받은 '웹 푸시 인증서(키 쌍)' 값을 넣으세요.
	const VAPID_KEY = "BCfJ0FpjsVAG424zRF0tfAWcmlCCCaZzkrUh6b4dUxOtWGspPGZ3xSQ1SJaL_2551mZtV3AtuDx5Pun7dLMr4v4";

	onMount(async () => {
		if (!messaging || !$user) return;

		try {
			const permission = await Notification.requestPermission();
			
			if (permission === 'granted') {
				const token = await getToken(messaging, { vapidKey: VAPID_KEY });
				
				if (token) {
					console.log('FCM Token:', token);
					await saveTokenToUser($user.uid, token);
				}
			} else {
				console.log('알림 권한이 거부되었습니다.');
			}

			// [중요] 포그라운드 메시지 수신 시 아무것도 하지 않음 (로그만 출력)
			// 이미 +layout.svelte의 Firestore 리스너가 토스트 알림을 보여주고,
			// Cloud Function이 백그라운드 알림을 담당하므로 여기서 Notification을 생성하면 중복됩니다.
			onMessage(messaging, (payload) => {
				console.log('FCM 메시지 수신(Foreground - Silent):', payload);
			});

		} catch (error) {
			console.error('알림 설정 실패:', error);
		}
	});

	async function saveTokenToUser(uid, token) {
		try {
			const userRef = doc(db, 'users', uid);
			// arrayUnion은 이미 DB에 있는 값은 중복 추가하지 않지만,
			// 토큰이 변경되면 계속 쌓일 수 있으므로 Cloud Function에서 중복 제거 로직이 필수입니다.
			await updateDoc(userRef, {
				fcmTokens: arrayUnion(token)
			});
		} catch (e) {
			console.error('토큰 저장 실패:', e);
		}
	}
</script>