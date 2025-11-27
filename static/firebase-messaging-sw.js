// static/firebase-messaging-sw.js
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js');

// [중요] .env 변수는 서비스 워커에서 직접 사용할 수 없으므로,
// 실제 값을 여기에 붙여넣거나 별도의 빌드 스크립트로 주입해야 합니다.
const firebaseConfig = {
    apiKey: "AIzaSyDU-i_Tx9pDOu6mMn1Lp0zMhviweLJ3bPU",
    authDomain: "daehwajang-7c6a8.firebaseapp.com",
    projectId: "daehwajang-7c6a8",
    storageBucket: "daehwajang-7c6a8.firebasestorage.app",
    messagingSenderId: "346416165614",
    appId: "1:346416165614:web:e895f999d332abaebaf9ff"
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

// 백그라운드 메시지 수신 핸들러
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] 백그라운드 메시지 수신: ', payload);
  
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/pwa-192x192.png', // 아이콘 경로 확인
    badge: '/pwa-192x192.png'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});