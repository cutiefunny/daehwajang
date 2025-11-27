// functions/index.js
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");
const { setGlobalOptions } = require("firebase-functions/v2");

admin.initializeApp();

// (선택사항) 서울 리전(asia-northeast3)을 사용하려면 아래 주석을 해제하세요.
// setGlobalOptions({ region: "asia-northeast3" });

exports.sendPushNotification = onDocumentCreated("notifications/{notificationId}", async (event) => {
    // v2에서는 event.data가 snapshot 역할을 합니다.
    const snapshot = event.data;
    
    // 문서가 생성된 것이 아니라면(삭제 등) 종료
    if (!snapshot) return;

    const notiData = snapshot.data();
    const targetUserId = notiData.targetUserId;

    if (!targetUserId) {
        console.log("No targetUserId found in notification");
        return;
    }

    try {
        const db = admin.firestore();
        
        // 1. 수신 유저의 FCM 토큰 조회
        const userDoc = await db.collection("users").doc(targetUserId).get();
        
        if (!userDoc.exists) {
            console.log("User not found:", targetUserId);
            return;
        }

        const userData = userDoc.data();
        if (!userData || !userData.fcmTokens || userData.fcmTokens.length === 0) {
            console.log("No FCM tokens available for user:", targetUserId);
            return;
        }

        // 2. 메시지 페이로드 구성
        const message = {
            notification: {
                title: notiData.title || "알림",
                body: notiData.body || "새로운 알림이 도착했습니다.",
            },
            data: {
                // 클릭 시 이동할 URL (앱/웹 핸들링용)
                url: notiData.link || "/",
                notificationId: event.params.notificationId
            },
            tokens: userData.fcmTokens, // 다중 디바이스 전송
        };

        // 3. 푸시 전송 (sendEachForMulticast 사용)
        const response = await admin.messaging().sendEachForMulticast(message);
        console.log(response.successCount + " messages were sent successfully");

        // 4. 유효하지 않은 토큰 제거 (Clean-up)
        if (response.failureCount > 0) {
            const failedTokens = [];
            response.responses.forEach((resp, idx) => {
                if (!resp.success) {
                    // 에러 코드를 확인하여 토큰이 만료되었거나 유효하지 않으면 제거 대상에 추가
                    failedTokens.push(userData.fcmTokens[idx]);
                }
            });
            
            if (failedTokens.length > 0) {
                await db.collection("users").doc(targetUserId).update({
                    fcmTokens: admin.firestore.FieldValue.arrayRemove(...failedTokens)
                });
                console.log("Removed invalid tokens:", failedTokens);
            }
        }
    } catch (error) {
        console.error("Error sending notification:", error);
    }
});