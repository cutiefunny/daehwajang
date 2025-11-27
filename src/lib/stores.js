import { writable } from 'svelte/store';
import { auth, db } from '$lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';

export const user = writable(null);
export const userProfile = writable(null);

export const appSettings = writable({
	logoText: '대화의 장',
	sliderLimit: 5,
	splashImage: '',
	splashBgColor: '#ffffff',
	headerFooterBg: '#ffffff',
	appBg: '#ffffff'
});

// 토스트 알림 스토어
function createToastStore() {
	const { subscribe, update } = writable([]);

	return {
		subscribe,
		send: (message, type = 'info', duration = 3000) => {
			const id = Math.random().toString(36).substr(2, 9);
			update((toasts) => [...toasts, { id, message, type }]);

			setTimeout(() => {
				update((toasts) => toasts.filter((t) => t.id !== id));
			}, duration);
		},
		remove: (id) => {
			update((toasts) => toasts.filter((t) => t.id !== id));
		}
	};
}

export const toast = createToastStore();

// [수정] 알림 히스토리 스토어
// Firestore 실시간 리스너가 데이터를 set()하므로, set과 update를 노출하는 기본 writable 형태로 변경합니다.
function createNotificationStore() {
	const { subscribe, set, update } = writable([]);

	return {
		subscribe,
		set,
		update,
		add: (notification) => update(n => [notification, ...n]),
		clear: () => set([])
	};
}

export const notifications = createNotificationStore();

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