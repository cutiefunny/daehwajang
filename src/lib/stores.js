import { writable } from 'svelte/store';
import { auth, db } from '$lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';

export const user = writable(null);
export const userProfile = writable(null); // [추가] Firestore 유저 프로필 스토어

export const appSettings = writable({
	logoText: '대화의 장',
	sliderLimit: 5,
	splashImage: '',
	splashBgColor: '#ffffff',
	headerFooterBg: '#ffffff',
	appBg: '#ffffff'
});

// 모달 스토어
function createModalStore() {
	const { subscribe, set, update } = writable({
		isOpen: false,
		type: 'alert',
		message: '',
		value: '',
		placeholder: '',
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
		updateValue: (val) => {
			update(state => ({ ...state, value: val }));
		}
	};
}

export const modal = createModalStore();

// 인증 상태 및 유저 프로필 동기화
onAuthStateChanged(auth, (currentUser) => {
	user.set(currentUser);

	if (currentUser) {
		// [추가] 로그인 시 Firestore 유저 정보 실시간 구독
		onSnapshot(doc(db, 'users', currentUser.uid), (docSnap) => {
			if (docSnap.exists()) {
				userProfile.set(docSnap.data());
			} else {
				userProfile.set(null);
			}
		});
	} else {
		userProfile.set(null);
	}
});

// 앱 설정 동기화
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