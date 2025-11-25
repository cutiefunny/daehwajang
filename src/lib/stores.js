// src/lib/stores.js
import { writable } from 'svelte/store';
import { auth, db } from '$lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';

export const user = writable(null);

export const appSettings = writable({
	logoText: '대화의 장',
	sliderLimit: 5,
	splashImage: '',
	splashBgColor: '#ffffff',
	headerFooterBg: '#ffffff',
	appBg: '#ffffff'
});

// [추가] 전역 모달 스토어
function createModalStore() {
	const { subscribe, set, update } = writable({
		isOpen: false,
		type: 'alert', // 'alert' | 'confirm'
		message: '',
		resolve: null // 사용자의 응답(true/false)을 기다리는 Promise의 resolve 함수
	});

	return {
		subscribe,
		// 알림창 (확인 버튼만 있음)
		alert: (message) => {
			return new Promise((resolve) => {
				set({ isOpen: true, type: 'alert', message, resolve });
			});
		},
		// 확인창 (확인/취소 버튼 있음)
		confirm: (message) => {
			return new Promise((resolve) => {
				set({ isOpen: true, type: 'confirm', message, resolve });
			});
		},
		// 닫기 (내부적으로 사용)
		close: (result = false) => {
			update(state => {
				if (state.resolve) state.resolve(result);
				return { ...state, isOpen: false, resolve: null };
			});
		}
	};
}

export const modal = createModalStore();

// ... 기존 Firebase 인증 및 설정 리스너 코드 유지 ...
onAuthStateChanged(auth, (currentUser) => {
	user.set(currentUser);
});

onSnapshot(doc(db, 'settings', 'global'), (docSnapshot) => {
	if (docSnapshot.exists()) {
		appSettings.set({ 
			logoText: '대화의 장',
			sliderLimit: 5,
			splashImage: '',
			splashBgColor: '#ffffff',
			headerFooterBg: '#ffffff',
			appBg: '#ffffff',
			...docSnapshot.data() 
		});
	}
});