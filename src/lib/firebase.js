import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage, ref as storageRef, deleteObject } from 'firebase/storage';
// [추가] 메시징 모듈 임포트
import { getMessaging, isSupported } from 'firebase/messaging';

const firebaseConfig = {
	apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
	authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
	projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
	storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
	messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
	appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// [추가] 메시징 초기화 (브라우저 환경에서만)
export let messaging = null;

if (typeof window !== 'undefined') {
	isSupported().then((supported) => {
		if (supported) {
			messaging = getMessaging(app);
		}
	});
}

export async function deleteFileByUrl(url) {
    // ... (기존 코드 유지)
    if (!url) return;
	try {
		if (url.startsWith('gs://')) {
			await deleteObject(storageRef(storage, url));
			return;
		}
		const oIndex = url.indexOf('/o/');
		if (oIndex !== -1) {
			const pathStart = oIndex + 3;
			const qIndex = url.indexOf('?');
			const encPath = qIndex !== -1 ? url.substring(pathStart, qIndex) : url.substring(pathStart);
			const path = decodeURIComponent(encPath);
			await deleteObject(storageRef(storage, path));
			return;
		}
		const m = url.match(/\/o\/(.*?)($|\?)/);
		if (m && m[1]) {
			const path = decodeURIComponent(m[1]);
			await deleteObject(storageRef(storage, path));
		}
	} catch (e) {
		console.error('deleteFileByUrl 실패:', e);
	}
}