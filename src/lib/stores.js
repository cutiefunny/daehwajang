import { writable } from 'svelte/store';
import { auth } from '$lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';

// 사용자 정보를 담을 스토어 (초기값 null)
export const user = writable(null);

// 앱 실행 시 Firebase 인증 상태 감지하여 스토어 업데이트
onAuthStateChanged(auth, (currentUser) => {
	user.set(currentUser);
});