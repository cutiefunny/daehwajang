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
		type: 'alert', // 'alert' | 'confirm' | 'prompt'
		message: '',
		value: '',     // prompt 입력값
		placeholder: '', // prompt placeholder
		resolve: null
	});

	return {
		subscribe,
		alert: (message) => {
			return new Promise((resolve) => {
				set({ isOpen: true, type: 'alert', message, resolve });
			});
		},
		confirm: (message) => {
			return new Promise((resolve) => {
				set({ isOpen: true, type: 'confirm', message, resolve });
			});
		},
		// [추가] 입력창 (확인 시 입력값 반환, 취소 시 null 반환)
		prompt: (message, defaultValue = '', placeholder = '') => {
			return new Promise((resolve) => {
				set({ 
					isOpen: true, 
					type: 'prompt', 
					message, 
					value: defaultValue, 
					placeholder, 
					resolve 
				});
			});
		},
		close: (result) => {
			update(state => {
				if (state.resolve) state.resolve(result);
				return { ...state, isOpen: false, resolve: null };
			});
		},
		// 입력값 업데이트용 (컴포넌트에서 사용)
		updateValue: (val) => {
			update(state => ({ ...state, value: val }));
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