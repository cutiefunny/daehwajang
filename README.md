# 💬 대화의 장 (Daehwajang) - 소셜 모임 & 커뮤니티 플랫폼

![SvelteKit](https://img.shields.io/badge/SvelteKit-FF3E00?style=for-the-badge&logo=svelte&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-039BE5?style=for-the-badge&logo=Firebase&logoColor=white)
![PWA](https://img.shields.io/badge/PWA-5A0FC8?style=for-the-badge&logo=pwa&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![screenshot](/static/daehwajang.jpg)

> **"새로운 사람들과의 즐거운 만남, 대화의 장에서 시작하세요!"** > 관심사 기반의 모임 참여, 이벤트 확인, 멤버 추천 기능을 제공하는 **PWA 기반 웹 애플리케이션**입니다.

## ✨ 주요 기능 (Key Features)

### 1. 모임 및 이벤트 탐색
- **모임 슬라이더:** 마감 임박 순으로 정렬된 모임 카드를 **Embla Carousel**을 통해 부드럽게 탐색할 수 있습니다.
- **이벤트 배너:** 진행 중인 이벤트를 자동 슬라이드 배너로 확인할 수 있으며, '오늘 하루 보지 않기' 팝업 기능을 지원합니다.
- **실시간 정보:** 모임의 남은 시간(D-Day/시간)과 현재 참여 인원을 실시간으로 보여줍니다.

### 2. 멤버 추천 및 프로필
- **랜덤 멤버 추천:** Fisher-Yates 셔플 알고리즘을 사용하여 새로운 멤버를 랜덤하게 추천해 줍니다.
- **프로필 모달:** 멤버 카드를 클릭하여 상세 프로필 정보를 확인할 수 있습니다.

### 3. 결제 시스템 (Simulation)
- **가상 결제 모듈:** 카드, 토스페이, 휴대폰 결제 등 다양한 결제 수단을 UI로 구현했습니다.
- **인터랙티브 UX:** 결제 수단 선택 -> 정보 입력 -> 처리 중 -> 결제 완료의 단계별 애니메이션을 제공합니다.

### 4. PWA & 푸시 알림
- **설치형 앱:** `vite-plugin-pwa`를 사용하여 모바일 및 데스크탑에 앱으로 설치가 가능합니다.
- **FCM 푸시 알림:** Firebase Cloud Functions를 통해 알림 생성 시 대상 유저에게 백그라운드 푸시 알림을 전송하고 유효하지 않은 토큰을 자동 관리합니다.

---

## 🛠 기술 스택 (Tech Stack)

| 분류 | 기술 | 설명 |
| :--- | :--- | :--- |
| **Frontend** | **SvelteKit** | 서버 사이드 렌더링(SSR) 및 정적 사이트 생성(SSG) 지원 |
| **Styling** | **CSS (Scoped)** | 컴포넌트별 스타일 캡슐화 및 반응형 디자인 |
| **Icons** | **Lucide Svelte** | 직관적이고 일관된 아이콘 사용 |
| **Carousel** | **Embla Carousel** | 터치 친화적이고 가벼운 슬라이더 구현 |
| **Backend** | **Firebase** | Firestore (DB), Authentication (인증), Cloud Functions (서버리스) |
| **Deployment** | **Vercel / Firebase Hosting** | (배포 환경에 맞춰 수정 가능) |

---

## 📂 프로젝트 구조 (Project Structure)

```bash
daehwajang/
├── functions/              # Firebase Cloud Functions (푸시 알림 등 백엔드 로직)
├── src/
│   ├── lib/
│   │   ├── components/     # 재사용 가능한 UI 컴포넌트
│   │   │   ├── admin/      # 관리자용 컴포넌트
│   │   │   ├── PaymentModal.svelte  # 결제 시뮬레이션 모달
│   │   │   ├── UserProfileModal.svelte
│   │   │   └── ...
│   │   ├── firebase.js     # Firebase 클라이언트 초기화
│   │   └── stores.js       # Svelte Stores (전역 상태 관리)
│   ├── routes/             # 페이지 라우팅
│   │   ├── +page.svelte    # 메인 페이지 (모임/이벤트/추천 목록)
│   │   ├── admin/          # 관리자 페이지 라우트
│   │   ├── meetings/       # 모임 상세 페이지
│   │   └── ...
│   └── app.html
├── static/                 # PWA 아이콘, 매니페스트, 정적 이미지
└── vite.config.js          # Vite 및 PWA 설정
🚀 시작하기 (Getting Started)
이 프로젝트를 로컬 환경에서 실행하려면 다음 단계가 필요합니다.

1. 레포지토리 클론
Bash

git clone [https://github.com/your-username/daehwajang.git](https://github.com/your-username/daehwajang.git)
cd daehwajang
2. 패키지 설치
Bash

npm install
3. 환경 변수 설정 (.env)
프로젝트 루트에 .env 파일을 생성하고 Firebase 설정 값을 입력하세요.

코드 스니펫

VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
4. 개발 서버 실행
Bash

npm run dev
브라우저에서 http://localhost:5173으로 접속하여 확인합니다.

📱 PWA 지원 (Mobile Experience)
이 프로젝트는 Progressive Web App으로 구성되어 있습니다.

manifest.json 설정을 통해 앱 아이콘과 테마 색상이 적용됩니다.

모바일 브라우저에서 "홈 화면에 추가"를 통해 네이티브 앱처럼 사용할 수 있습니다.

오프라인 지원 및 서비스 워커(Service Worker)를 통한 캐싱 전략이 포함되어 있습니다.

📄 라이선스 (License)
This project is licensed under the MIT License.