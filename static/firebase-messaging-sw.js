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
  
  // [수정] payload.notification 대신 payload.data에서 값을 가져옵니다.
  const notificationTitle = payload.data.title;
  const notificationOptions = {
    body: payload.data.body,
    icon: '/pwa-192x192.png', // 설정하신 아이콘 사용
    badge: '/pwa-192x192.png', // 안드로이드 상단 바 아이콘
    data: {
        url: payload.data.url // 클릭 이벤트에서 사용할 URL 전달
    }
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// [추가] 알림 클릭 이벤트 핸들러 (PWA 최적화)
self.addEventListener('notificationclick', function(event) {
  console.log('[firebase-messaging-sw.js] 알림 클릭됨');
  
  event.notification.close(); // 알림 닫기

  const urlToOpen = event.notification.data?.url || '/';

  // 이미 열려있는 창이 있다면 포커스, 없으면 새 창 열기
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(windowClients) {
      // 이미 열린 탭 확인
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url.includes(urlToOpen) && 'focus' in client) {
          return client.focus();
        }
      }
      // 열린 탭이 없으면 새로 열기
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});