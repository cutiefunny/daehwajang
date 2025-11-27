<script>
    import { onMount } from 'svelte';
    import { page } from '$app/stores';
    import { user, modal } from '$lib/stores';
    import { db } from '$lib/firebase';
    // [수정] deleteDoc 제거, updateDoc 추가
    import { doc, getDoc, addDoc, collection, query, where, getDocs, serverTimestamp, updateDoc, orderBy, limit } from 'firebase/firestore';
    import { ArrowLeft, Calendar, MapPin, User, CheckCircle, AlertCircle, Star, Crown, XCircle, Ban } from 'lucide-svelte';
    import Skeleton from '$lib/components/Skeleton.svelte';

    const NAVER_CLIENT_ID = import.meta.env.VITE_NAVER_MAPS_CLIENT_ID;
    const meetingId = $page.params.id;

    let meeting = null;
    let reviews = [];
    let isLoading = true;
    let isApplying = false;
    
    let applicationStatus = null; 
    let applicationId = null;
    let isMeetingPast = false;

    let mapElement;

    // 유저 정보가 로드되면 즉시 상태 확인
    $: if ($user && meetingId) {
        checkApplicationStatus();
    }

    onMount(async () => {
        await fetchMeeting();
        await fetchReviews();
    });

    async function fetchMeeting() {
        try {
            const docRef = doc(db, 'meetings', meetingId);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                let data = docSnap.data();
                if (data.hostId) {
                    try {
                        const hostSnap = await getDoc(doc(db, 'users', data.hostId));
                        if (hostSnap.exists()) {
                            const hostData = hostSnap.data();
                            data.hostName = hostData.nickname || data.hostName;
                            data.hostImage = hostData.image || data.hostImage;
                        }
                    } catch (e) {
                        console.error("호스트 정보 갱신 실패:", e);
                    }
                }

                meeting = { id: docSnap.id, ...data };
                
                const meetingDate = new Date(meeting.date);
                const now = new Date();
                isMeetingPast = meetingDate < now;
                
                setTimeout(() => initMap(meeting.location), 100);
            } else {
                await modal.alert('존재하지 않는 모임입니다.');
                history.back();
            }
        } catch (error) {
            console.error('모임 로딩 실패:', error);
        } finally {
            isLoading = false;
        }
    }

    async function fetchReviews() {
        try {
            const q = query(
                collection(db, 'meeting_reviews'),
                where('meetingId', '==', meetingId)
            );
            const snapshot = await getDocs(q);
            
            const reviewsData = await Promise.all(snapshot.docs.map(async (docSnap) => {
                const data = docSnap.data();
                let currentReviewerName = data.reviewerName;

                if (data.reviewerId) {
                    try {
                        const userSnap = await getDoc(doc(db, 'users', data.reviewerId));
                        if (userSnap.exists()) {
                            const userData = userSnap.data();
                            if (userData.nickname) {
                                currentReviewerName = userData.nickname;
                            }
                        }
                    } catch (e) {
                        console.error("리뷰어 정보 로딩 실패:", e);
                    }
                }

                return {
                    id: docSnap.id,
                    ...data,
                    reviewerName: currentReviewerName
                };
            }));
            
            reviews = reviewsData.sort((a, b) => {
                const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
                const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
                return dateB - dateA;
            });
        } catch (error) {
            console.error('후기 로딩 실패:', error);
        }
    }

    async function checkApplicationStatus() {
        if (!$user) return;

        try {
            const q = query(
                collection(db, 'meeting_applications'),
                where('meetingId', '==', meetingId),
                where('userId', '==', $user.uid),
                orderBy('appliedAt', 'desc'),
                limit(1)
            );
            const snapshot = await getDocs(q);
            
            if (!snapshot.empty) {
                const docData = snapshot.docs[0];
                const data = docData.data();
                
                applicationStatus = data.status || 'pending';
                applicationId = docData.id;
            } else {
                applicationStatus = null;
                applicationId = null;
            }
        } catch (error) {
            console.error('신청 상태 확인 실패:', error);
        }
    }

    async function applyForMeeting() {
        if (!$user) return await modal.alert('로그인이 필요한 서비스입니다.');
        if (isApplying) return;
        
        // [추가] 취소된 상태인 경우 신청 차단
        if (applicationStatus === 'canceled') {
            await modal.alert('신청을 취소한 모임은 다시 신청할 수 없습니다.');
            return;
        }

        if (applicationStatus === 'rejected') {
             if (!(await modal.confirm('이전에 거절된 내역이 있습니다. 다시 신청하시겠습니까?'))) return;
        } else {
             if (!(await modal.confirm('이 모임에 참여 신청하시겠습니까?'))) return;
        }

        isApplying = true;
        try {
            const docRef = await addDoc(collection(db, 'meeting_applications'), {
                meetingId: meetingId,
                meetingTitle: meeting.title, 
                meetingDate: meeting.date,   
                userId: $user.uid,
                userName: $user.displayName || '익명',
                userEmail: $user.email,
                userImage: $user.photoURL,
                status: 'pending', 
                appliedAt: serverTimestamp()
            });
            
            applicationId = docRef.id;

            if (meeting.hostId && meeting.hostId !== $user.uid) {
                try {
                    const hostRef = doc(db, 'users', meeting.hostId);
                    const hostSnap = await getDoc(hostRef);
                    if (hostSnap.exists()) {
                        const hostData = hostSnap.data();
                        const settings = hostData.notificationSettings || {};
                        const isEnabled = (settings.enabled !== false) && (settings.hostApplication !== false);

                        if (isEnabled) {
                            await addDoc(collection(db, 'notifications'), {
                                targetUserId: meeting.hostId,
                                type: 'application',
                                title: '새로운 참가 신청 👋',
                                body: `'${meeting.title}' 모임에 ${$user.displayName || '누군가'}님이 참가 신청을 했습니다.`,
                                link: `/my-daehwajang?meetingId=${meeting.id}&view=applicants`,
                                read: false,
                                timestamp: serverTimestamp()
                            });
                        }
                    }
                } catch (notiError) {
                    console.error('알림 전송 실패:', notiError);
                }
            }

            applicationStatus = 'pending';
            await modal.alert('신청이 완료되었습니다! 호스트의 승인을 기다려주세요.');
        } catch (error) {
            console.error('신청 실패:', error);
            await modal.alert('신청 중 오류가 발생했습니다.');
        } finally {
            isApplying = false;
        }
    }

    // [수정] 신청 취소 함수 (문서 유치 + 상태 변경)
    async function cancelApplication() {
        if (!applicationId) return;
        
        // [수정] 컨펌 메시지 변경
        if (!(await modal.confirm('취소 시 이 모임을 다시 신청할 수 없습니다. 취소하시겠습니까?'))) return;

        try {
            // [수정] deleteDoc 대신 updateDoc 사용
            await updateDoc(doc(db, 'meeting_applications', applicationId), {
                status: 'canceled'
            });
            
            applicationStatus = 'canceled';
            // applicationId는 유지됨 (문서가 남아있으므로)
            await modal.alert('신청이 취소되었습니다.');
        } catch (error) {
            console.error('취소 실패:', error);
            await modal.alert('취소 처리 중 오류가 발생했습니다.');
        }
    }

    function initMap(address) {
        if (!window.naver || !mapElement) return;
        window.naver.maps.Service.geocode({ query: address }, async (status, response) => {
            if (status !== window.naver.maps.Service.Status.OK) return;

            const result = response.v2.addresses[0];
            if (!result) return;

            const item = result; 
            const point = new window.naver.maps.LatLng(item.y, item.x);

            const map = new window.naver.maps.Map(mapElement, {
                center: point,
                zoom: 15
            });
            
            new window.naver.maps.Marker({
                position: point,
                map: map
            });
        });
    }

    function goBack() {
        history.back();
    }

    function formatDate(isoString) {
        if (!isoString) return '';
        const date = new Date(isoString);
        return date.toLocaleString('ko-KR', {
            year: 'numeric', month: 'long', day: 'numeric',
            weekday: 'short', hour: '2-digit', minute: '2-digit'
        });
    }
</script>

<svelte:head>
    <script type="text/javascript" src="https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId={NAVER_CLIENT_ID}&submodules=geocoder"></script>
</svelte:head>

<div class="page-container">
    {#if isLoading}
        <Skeleton />
    {:else if meeting}
        <div class="hero-header">
            <button class="back-btn" on:click={goBack}>
                <ArrowLeft size={24} color="white" />
            </button>
            <img src={meeting.image} alt={meeting.title} class="hero-image" />
            <div class="hero-overlay"></div>
        </div>

        <div class="content-body">
            <div class="section info-header">
                <span class="category-badge">{meeting.category}</span>
                <h1 class="title">{meeting.title}</h1>
                <div class="host-info">
                    <div class="host-avatar">
                        {#if meeting.hostImage}
                            <img src={meeting.hostImage} alt={meeting.hostName} />
                        {:else}
                            <User size={16} />
                        {/if}
                    </div>
                    <span class="host-name">호스트: {meeting.hostName}</span>
                </div>
            </div>

            <div class="divider"></div>

            <div class="section details">
                <div class="detail-row">
                    <div class="icon-box"><Calendar size={20} /></div>
                    <div class="detail-text">
                        <span class="label">일시</span>
                        <span class="value">{formatDate(meeting.date)}</span>
                    </div>
                </div>
                <div class="detail-row">
                    <div class="icon-box"><MapPin size={20} /></div>
                    <div class="detail-text">
                        <span class="label">장소</span>
                        <span class="value">{meeting.location}</span>
                    </div>
                </div>
                <div class="map-wrapper">
                    <div bind:this={mapElement} id="map" class="map-view"></div>
                </div>
            </div>

            <div class="divider"></div>

            <div class="section description">
                <h3>모임 소개</h3>
                <p>{meeting.description || '상세 설명이 없습니다.'}</p>
            </div>

            <div class="divider"></div>

            <div class="section reviews">
                <h3>모임 후기 <span class="review-count">({reviews.length})</span></h3>
                
                {#if reviews.length > 0}
                    <div class="review-list">
                        {#each reviews as review}
                            <div class="review-card">
                                <div class="review-header">
                                    <span class="reviewer-name">{review.reviewerName}</span>
                                    <div class="stars">
                                        {#each Array(5) as _, i}
                                            <Star 
                                                size={12} 
                                                fill={i < review.rating ? "#FFD700" : "#eee"} 
                                                color={i < review.rating ? "#FFD700" : "#eee"} 
                                            />
                                        {/each}
                                    </div>
                                </div>
                                <p class="review-content">{review.content}</p>
                            </div>
                        {/each}
                    </div>
                {:else}
                    <div class="empty-reviews">
                        <p>아직 등록된 후기가 없습니다.</p>
                    </div>
                {/if}
            </div>
        </div>

        <div class="bottom-bar">
            {#if $user && meeting.hostId === $user.uid}
                <button class="action-btn disabled" disabled>
                    <Crown size={18} /> 호스트
                </button>
            {:else if isMeetingPast}
                <button class="action-btn disabled" disabled>
                    종료된 모임입니다
                </button>
            {:else if applicationStatus === 'pending'}
                <button class="action-btn disabled" disabled>
                    <AlertCircle size={18} /> 승인 대기중
                </button>
            {:else if applicationStatus === 'accepted'}
                <button class="action-btn cancel" on:click={cancelApplication}>
                    <XCircle size={18} /> 신청 취소
                </button>
            {:else if applicationStatus === 'canceled'}
                <button class="action-btn disabled" disabled>
                    <Ban size={18} /> 신청 취소됨 (재신청 불가)
                </button>
            {:else if applicationStatus === 'rejected'}
                <button class="action-btn primary" on:click={applyForMeeting} disabled={isApplying}>
                     <Ban size={18} /> 참여 재신청하기
                </button>
            {:else}
                <button class="action-btn primary" on:click={applyForMeeting} disabled={isApplying}>
                    {isApplying ? '처리 중...' : '참여 신청하기'}
                </button>
            {/if}
        </div>
    {/if}
</div>

<style>
    .page-container {
        background-color: #fff;
        min-height: 100vh;
        padding-bottom: 80px;
    }

    .hero-header {
        position: relative;
        height: 240px;
        width: 100%;
        background-color: #eee;
    }
    .hero-image {
        width: 100%;
        height: 100%;
        object-fit: cover;
    }
    .hero-overlay {
        position: absolute;
        top: 0; left: 0; right: 0;
        bottom: 0;
        background: linear-gradient(to bottom, rgba(0,0,0,0.3), transparent 40%);
    }
    .back-btn {
        position: absolute;
        top: 16px;
        left: 16px;
        background: rgba(0, 0, 0, 0.2);
        border: none;
        border-radius: 50%;
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        z-index: 10;
        backdrop-filter: blur(4px);
    }

    .content-body {
        border-top-left-radius: 24px;
        border-top-right-radius: 24px;
        background-color: white;
        margin-top: -24px;
        position: relative;
        z-index: 5;
        padding-top: 24px;
    }

    .section {
        padding: 0 20px 20px 20px;
    }

    .category-badge {
        display: inline-block;
        font-size: 12px;
        color: #666;
        background-color: #f0f0f0;
        padding: 4px 8px;
        border-radius: 4px;
        margin-bottom: 8px;
    }
    .title {
        font-size: 22px;
        font-weight: 800;
        margin: 0 0 12px 0;
        color: #1a1a1a;
        line-height: 1.3;
    }
    .host-info {
        display: flex;
        align-items: center;
        gap: 8px;
        color: #666;
        font-size: 13px;
    }
    .host-avatar {
        width: 24px;
        height: 24px;
        border-radius: 50%;
        background-color: #eee;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
    }
    .host-avatar img {
        width: 100%;
        height: 100%;
        object-fit: cover;
    }

    .divider {
        height: 8px;
        background-color: #f5f7fa;
        margin-bottom: 24px;
    }

    .detail-row {
        display: flex;
        gap: 16px;
        margin-bottom: 20px;
    }
    .icon-box {
        width: 40px;
        height: 40px;
        border-radius: 12px;
        background-color: #f0f4ff;
        color: #3182ce;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
    }
    .detail-text {
        display: flex;
        flex-direction: column;
        justify-content: center;
    }
    .detail-text .label {
        font-size: 12px;
        color: #888;
        margin-bottom: 2px;
    }
    .detail-text .value {
        font-size: 15px;
        color: #333;
        font-weight: 500;
    }

    .map-wrapper {
        margin-top: 16px;
        border-radius: 12px;
        overflow: hidden;
        border: 1px solid #eee;
    }
    .map-view {
        width: 100%;
        height: 200px;
        background-color: #f0f0f0;
    }

    .description h3 {
        font-size: 18px;
        font-weight: bold;
        margin: 0 0 12px 0;
    }
    .description p {
        font-size: 15px;
        line-height: 1.6;
        color: #4a4a4a;
        white-space: pre-wrap;
    }

    .reviews h3 {
        font-size: 18px;
        font-weight: bold;
        margin: 0 0 16px 0;
    }
    .review-count {
        color: #3182ce;
        font-weight: normal;
    }
    .review-list {
        display: flex;
        flex-direction: column;
        gap: 12px;
    }
    .review-card {
        background-color: #f9fafb;
        padding: 16px;
        border-radius: 12px;
    }
    .review-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
    }
    .reviewer-name {
        font-weight: 600;
        font-size: 14px;
        color: #2d3748;
    }
    .stars { display: flex;
        gap: 2px; }
    .review-content {
        font-size: 14px;
        color: #4a5568;
        margin: 0;
        line-height: 1.5;
    }
    .empty-reviews {
        text-align: center;
        padding: 20px;
        color: #a0aec0;
        font-size: 14px;
        background-color: #f9fafb;
        border-radius: 12px;
    }

    .bottom-bar {
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        max-width: 600px;
        margin: 0 auto;
        background-color: white;
        padding: 16px 20px;
        border-top: 1px solid #f0f0f0;
        z-index: 50;
    }
    .action-btn {
        width: 100%;
        padding: 16px;
        border-radius: 12px;
        font-size: 16px;
        font-weight: bold;
        border: none;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        transition: background-color 0.2s;
    }
    .action-btn.primary {
        background-color: #3182ce;
        color: white;
    }
    .action-btn.primary:hover {
        background-color: #2b6cb0;
    }
    .action-btn.disabled {
        background-color: #edf2f7;
        color: #718096;
        cursor: not-allowed;
    }
    .action-btn.success {
        background-color: #e6fffa;
        color: #2c7a7b;
        border: 1px solid #b2f5ea;
    }
    .action-btn.cancel {
        background-color: #FFF5F5;
        color: #C53030;
        border: 1px solid #FEB2B2;
    }
    .action-btn.cancel:hover {
        background-color: #FED7D7;
    }
</style>