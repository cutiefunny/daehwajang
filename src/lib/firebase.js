import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage, ref as storageRef, deleteObject } from 'firebase/storage'; // [추가] Storage 모듈 임포트

// 개발자님의 Firebase 콘솔 -> 프로젝트 설정 -> 일반 -> 내 앱 -> SDK 설정 및 구성에서 확인 가능
const firebaseConfig = {
	apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
	authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
	projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
	storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
	messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
	appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// 앱이 이미 초기화되었는지 확인 (SSR 환경 중복 초기화 방지)
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app); // [추가] Storage 내보내기

// Deletes a storage object referenced by a download URL or a gs:// URL.
export async function deleteFileByUrl(url) {
	if (!url) return;
	try {
		// gs:// URL can be passed directly to ref
		if (url.startsWith('gs://')) {
			await deleteObject(storageRef(storage, url));
			return;
		}

		// Typical download URL contains '/o/<encodedPath>' before query params
		const oIndex = url.indexOf('/o/');
		if (oIndex !== -1) {
			const pathStart = oIndex + 3; // length of '/o/'
			const qIndex = url.indexOf('?');
			const encPath = qIndex !== -1 ? url.substring(pathStart, qIndex) : url.substring(pathStart);
			const path = decodeURIComponent(encPath);
			await deleteObject(storageRef(storage, path));
			return;
		}

		// Fallback: try to extract between '/o/' via regex
		const m = url.match(/\/o\/(.*?)($|\?)/);
		if (m && m[1]) {
			const path = decodeURIComponent(m[1]);
			await deleteObject(storageRef(storage, path));
		}
	} catch (e) {
		console.error('deleteFileByUrl 실패:', e);
	}
}