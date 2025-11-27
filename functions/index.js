// functions/index.js
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");
const { setGlobalOptions } = require("firebase-functions/v2");

admin.initializeApp();

// (선택사항) 서울 리전(asia-northeast3)
setGlobalOptions({ region: "asia-northeast3" });

exports.sendPushNotification = onDocumentCreated("notifications/{notificationId}", async (event) => {
    const snapshot = event.data;
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

        // [수정 포인트] notification 필드를 제거하고 data 필드에 모든 정보를 담음
        // 이렇게 해야 브라우저가 자동으로 띄우는 기본 알림(중복)을 막을 수 있음
        const message = {
            data: {
                title: notiData.title || "알림",
                body: notiData.body || "새로운 알림이 도착했습니다.",
                url: notiData.link || "/", // 클릭 시 이동할 URL
                notificationId: event.params.notificationId
            },
            tokens: userData.fcmTokens,
        };

        // 3. 푸시 전송
        const response = await admin.messaging().sendEachForMulticast(message);
        console.log(response.successCount + " messages were sent successfully");

        // 4. 유효하지 않은 토큰 제거
        if (response.failureCount > 0) {
            const failedTokens = [];
            response.responses.forEach((resp, idx) => {
                if (!resp.success) {
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