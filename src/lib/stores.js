import { writable } from 'svelte/store';
import { auth, db } from '$lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';

export const user = writable(null);

// 앱 전역 설정 스토어 (색상 설정 추가)
export const appSettings = writable({
	logoText: '대화의 장',
	sliderLimit: 5,
	splashImage: '',
	splashBgColor: '#ffffff',
	// 새로 추가된 디자인 설정
	headerFooterBg: '#ffffff', // 헤더 & 푸터 배경색 (기본 흰색)
	appBg: '#ffffff'           // 메인 컨텐츠 배경색 (기본 흰색)
});

onAuthStateChanged(auth, (currentUser) => {
	user.set(currentUser);
});

onSnapshot(doc(db, 'settings', 'global'), (docSnapshot) => {
	if (docSnapshot.exists()) {
		appSettings.set({ 
			// DB에 없는 필드가 있을 경우를 대비해 기본값과 병합
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