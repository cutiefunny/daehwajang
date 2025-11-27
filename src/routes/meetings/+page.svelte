<script>
    import { onMount, tick } from 'svelte';
    import { goto } from '$app/navigation';
    import { page } from '$app/stores';
    import { db } from '$lib/firebase';
    // [수정] limit, startAfter 추가
    import { collection, getDocs, query, where, orderBy, doc, getDoc, getCountFromServer, limit, startAfter } from 'firebase/firestore';
    import { user } from '$lib/stores';
    import { Search, MapPin, Calendar, Plus, Loader2, Users, Crown, History, ArrowLeft } from 'lucide-svelte';
    import HighlightText from '$lib/components/HighlightText.svelte';

    // --- 상태 변수 ---
    let viewMode = 'upcoming'; // 'upcoming' | 'past'
    
    // 예정된 모임 (기존 로직)
    let meetings = [];
    let filteredMeetings = [];
    let isUpcomingLoading = true;

    // 지난 모임 (신규 로직)
    let pastMeetings = [];
    let isPastLoading = false;
    let isPastFinished = false; // 더 이상 불러올 데이터가 없는지
    let lastPastDoc = null; // 페이지네이션 커서
    let observer; // 무한 스크롤 감지자
    let loadMoreTrigger; // 감지할 DOM 요소

    // 검색 및 필터 상태
    let searchTerm = '';
    let selectedCategory = '전체';
    const categories = ['전체', '소셜', '취미', '운동', '독서', '여행', '기타'];
    
    // URL 쿼리 파라미터 감지
    $: queryParam = $page.url.searchParams.get('q');
    $: if (queryParam !== null && viewMode === 'upcoming') {
        searchTerm = queryParam;
    }

    // 로그인 상태 변경 시 예정된 모임 재정렬
    $: if ($user && meetings.length > 0) {
        sortMeetings();
    }

    // 화면에 보여줄 최종 리스트 결정
    $: displayList = viewMode === 'upcoming' ? filteredMeetings : pastMeetings;

    onMount(async () => {
        await fetchUpcomingMeetings();
    });

    // --- 공통: 모임 데이터 가공 (호스트 정보, 참여인원) ---
    async function enrichMeetingsData(docs) {
        // 내 신청 내역 미리 가져오기 (로그인 시)
        let myApplications = {};
        if ($user) {
            try {
                // 현재 페이지에 있는 모임 ID들만 추려서 쿼리하거나, 
                // 간단하게 전체 내역 중 매칭 (여기서는 개별 조회 최적화 대신 기존 방식 유지하되 배치 처리)
                const myAppsQ = query(
                    collection(db, 'meeting_applications'),
                    where('userId', '==', $user.uid)
                );
                const myAppsSnap = await getDocs(myAppsQ);
                myAppsSnap.forEach(doc => {
                    const data = doc.data();
                    myApplications[data.meetingId] = data.status;
                });
            } catch (e) { console.error(e); }
        }

        return await Promise.all(docs.map(async (docSnap) => {
            const data = docSnap.data();
            
            // 1. 호스트 정보
            if (data.hostId) {
                try {
                    const hostSnap = await getDoc(doc(db, 'users', data.hostId));
                    if (hostSnap.exists()) {
                        data.hostName = hostSnap.data().nickname || data.hostName;
                    }
                } catch (e) { console.error(e); }
            }

            // 2. 참여 인원
            let currentParticipants = 0;
            try {
                const countQ = query(
                    collection(db, 'meeting_applications'),
                    where('meetingId', '==', docSnap.id),
                    where('status', '==', 'accepted')
                );
                const countSnap = await getCountFromServer(countQ);
                currentParticipants = countSnap.data().count;
            } catch (e) { console.error(e); }

            return { 
                id: docSnap.id, 
                ...data,
                currentParticipants,
                maxParticipants: data.maxParticipants || 5,
                myStatus: myApplications[docSnap.id] || null
            };
        }));
    }

    // --- 1. 예정된 모임 로직 ---
    async function fetchUpcomingMeetings() {
        isUpcomingLoading = true;
        try {
            const now = new Date().toISOString();
            const q = query(
                collection(db, 'meetings'),
                where('date', '>=', now),
                orderBy('date', 'asc')
            );
            
            const querySnapshot = await getDocs(q);
            meetings = await enrichMeetingsData(querySnapshot.docs);
            sortMeetings();
            
        } catch (error) {
            console.error("예정된 모임 로딩 실패:", error);
        } finally {
            isUpcomingLoading = false;
        }
    }

    function sortMeetings() {
        if (!$user) {
            filterMeetings();
            return;
        }

        meetings.sort((a, b) => {
            const aIsHost = a.hostId === $user.uid;
            const bIsHost = b.hostId === $user.uid;
            if (aIsHost && !bIsHost) return -1;
            if (!aIsHost && bIsHost) return 1;

            const aIsApplied = (a.myStatus === 'pending' || a.myStatus === 'accepted');
            const bIsApplied = (b.myStatus === 'pending' || b.myStatus === 'accepted');
            if (aIsApplied && !bIsApplied) return -1;
            if (!aIsApplied && bIsApplied) return 1;
            
            return 0; // 날짜순(이미 쿼리에서 정렬됨)
        });
        filterMeetings();
    }

    function filterMeetings() {
        filteredMeetings = meetings.filter(meeting => {
            const matchesSearch = (meeting.title?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                                  (meeting.location?.toLowerCase() || '').includes(searchTerm.toLowerCase());
            const matchesCategory = selectedCategory === '전체' || meeting.category === selectedCategory;
            return matchesSearch && matchesCategory;
        });
    }

    // --- 2. 지난 모임 로직 (페이지네이션) ---
    async function fetchPastMeetings(isInitial = false) {
        if (isPastLoading || (isPastFinished && !isInitial)) return;
        
        isPastLoading = true;
        try {
            const now = new Date().toISOString();
            let q;

            // 쿼리 구성: 날짜 내림차순 (최근 종료된 순), 10개 제한
            if (isInitial) {
                q = query(
                    collection(db, 'meetings'),
                    where('date', '<', now),
                    orderBy('date', 'desc'),
                    limit(10)
                );
            } else if (lastPastDoc) {
                q = query(
                    collection(db, 'meetings'),
                    where('date', '<', now),
                    orderBy('date', 'desc'),
                    startAfter(lastPastDoc),
                    limit(10)
                );
            } else {
                isPastLoading = false;
                return;
            }
            
            const snapshot = await getDocs(q);
            
            if (snapshot.empty) {
                isPastFinished = true;
                if (isInitial) pastMeetings = [];
            } else {
                lastPastDoc = snapshot.docs[snapshot.docs.length - 1];
                const newMeetings = await enrichMeetingsData(snapshot.docs);
                
                if (isInitial) {
                    pastMeetings = newMeetings;
                } else {
                    pastMeetings = [...pastMeetings, ...newMeetings];
                }

                // 10개 미만이면 더 이상 데이터가 없는 것으로 간주
                if (snapshot.docs.length < 10) {
                    isPastFinished = true;
                }
            }
        } catch (error) {
            console.error("지난 모임 로딩 실패:", error);
        } finally {
            isPastLoading = false;
            // 로딩 후 트리거 관찰 재설정 (DOM 업데이트 대기)
            if (!isInitial) await tick();
            setupObserver(); 
        }
    }

    // --- 뷰 모드 전환 ---
    function toggleViewMode() {
        viewMode = viewMode === 'upcoming' ? 'past' : 'upcoming';
        
        if (viewMode === 'past') {
            // 초기화 후 로드
            pastMeetings = [];
            lastPastDoc = null;
            isPastFinished = false;
            fetchPastMeetings(true);
        } else {
            // 예정된 모임은 이미 로드되어 있으므로 별도 조치 불필요 (필요 시 리로드)
            searchTerm = '';
            selectedCategory = '전체';
        }
    }

    // --- 무한 스크롤 옵저버 설정 ---
    function setupObserver() {
        if (observer) observer.disconnect();
        if (!loadMoreTrigger || viewMode !== 'past' || isPastFinished) return;

        observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting && !isPastLoading) {
                fetchPastMeetings(false);
            }
        }, { threshold: 0.1 }); // 10% 보이면 트리거

        observer.observe(loadMoreTrigger);
    }
    
    // loadMoreTrigger 요소가 렌더링될 때 감지하기 위해 reactive statement 사용
    $: if (loadMoreTrigger && viewMode === 'past') {
        setupObserver();
    }

    // --- 기타 유틸 ---
    $: if (searchTerm !== undefined || selectedCategory) {
        if (viewMode === 'upcoming') filterMeetings();
    }

    function getRemainingTime(targetDateStr) {
        const diff = new Date(targetDateStr) - new Date();
        if (diff <= 0) return '마감됨';
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        return days === 0 ? `${hours}시간 남음` : `${days}일 ${hours}시간 남음`;
    }

    function goToCreate() {
        goto('/meetings/new');
    }

    function shouldShowDivider(index) {
        if (!$user || index === 0 || viewMode === 'past') return false;
        const prev = displayList[index - 1];
        const curr = displayList[index];
        return (prev.hostId === $user.uid) && (curr.hostId !== $user.uid);
    }
</script>

<div class="page-container">
    <div class="header-area">
        <div class="title-row">
            <h2 class="page-title">모임 찾기</h2>
            <button class="toggle-mode-btn" on:click={toggleViewMode}>
                {#if viewMode === 'upcoming'}
                    <History size={14} /> 지난 모임 보기
                {:else}
                    <ArrowLeft size={14} /> 예정된 모임 보기
                {/if}
            </button>
        </div>
        
        {#if viewMode === 'upcoming'}
            <div class="search-bar">
                <Search size={20} class="search-icon" />
                <input 
                    type="text" 
                    placeholder="모임명, 지역 검색" 
                    bind:value={searchTerm}
                />
            </div>

            <div class="category-scroll">
                {#each categories as category}
                    <button 
                        class="chip {selectedCategory === category ? 'active' : ''}"
                        on:click={() => selectedCategory = category}
                    >
                        {category}
                    </button>
                {/each}
            </div>
        {:else}
            <div class="past-mode-info">
                이미 종료된 모임들을 최신순으로 보여줍니다.
            </div>
        {/if}
    </div>

    <div class="meeting-list">
        {#if viewMode === 'upcoming' && isUpcomingLoading}
            <div class="loading-state">
                <Loader2 size={32} class="spin" />
                <p>모임을 불러오고 있습니다...</p>
            </div>
        {:else if viewMode === 'past' && isPastLoading && pastMeetings.length === 0}
            <div class="loading-state">
                <Loader2 size={32} class="spin" />
                <p>지난 모임을 불러오고 있습니다...</p>
            </div>
        {:else if displayList.length > 0}
            {#each displayList as meeting, index (meeting.id)}
                {#if shouldShowDivider(index)}
                    <div class="list-divider">
                        <div class="divider-line"></div>
                        <span class="divider-text">다른 모임 둘러보기</span>
                        <div class="divider-line"></div>
                    </div>
                {/if}

                <a href="/meetings/{meeting.id}" class="meeting-card {viewMode === 'past' ? 'past-card' : ''}">
                    <div class="image-wrapper {viewMode === 'past' ? 'grayscale' : ''}">
                        <img src={meeting.image} alt={meeting.title} />
                        {#if viewMode === 'upcoming'}
                            <div class="time-badge">{getRemainingTime(meeting.date)}</div>
                        {:else}
                            <div class="time-badge closed">종료됨</div>
                        {/if}
                    </div>
                    <div class="content">
                        <div class="top-row">
                            <div class="badge-group">
                                <span class="category-label">{meeting.category}</span>
                                {#if meeting.hostId !== $user?.uid}
                                    {#if meeting.myStatus === 'pending'}
                                        <span class="status-pill pending">요청 중</span>
                                    {:else if meeting.myStatus === 'accepted'}
                                        <span class="status-pill accepted">참여 함</span>
                                    {/if}
                                {/if}
                            </div>
                            
                            <div class="host-wrapper">
                                {#if $user && $user.uid === meeting.hostId}
                                    <span class="host-badge">
                                        <Crown size={10} /> HOST
                                    </span>
                                {/if}
                                <span class="host-name">by {meeting.hostName}</span>
                            </div>
                        </div>

                        <h3 class="title">
                            {#if viewMode === 'upcoming'}
                                <HighlightText text={meeting.title} term={searchTerm} />
                            {:else}
                                {meeting.title}
                            {/if}
                        </h3>
                        
                        <div class="info-row">
                            <div class="info-group">
                                <div class="info-item">
                                    <Calendar size={14} /> 
                                    <span>{new Date(meeting.date).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                                <div class="info-item participants">
                                    <Users size={14} />
                                    <span>{meeting.currentParticipants}/{meeting.maxParticipants}명</span>
                                </div>
                            </div>
                            <div class="info-item location">
                                <MapPin size={14} />
                                <span>
                                    {#if viewMode === 'upcoming'}
                                        <HighlightText text={meeting.location} term={searchTerm} />
                                    {:else}
                                        {meeting.location}
                                    {/if}
                                </span>
                            </div>
                        </div>
                    </div>
                </a>
            {/each}

            {#if viewMode === 'past'}
                {#if isPastLoading}
                    <div class="more-loading">
                        <Loader2 size={24} class="spin" />
                        <span>불러오는 중...</span>
                    </div>
                {:else if !isPastFinished}
                    <div bind:this={loadMoreTrigger} class="load-trigger"></div>
                {:else}
                    <div class="end-message">모든 지난 모임을 불러왔습니다.</div>
                {/if}
            {/if}

        {:else}
            <div class="empty-state">
                <p>
                    {viewMode === 'upcoming' 
                        ? '조건에 맞는 모임이 없습니다 😢' 
                        : '지난 모임 내역이 없습니다.'}
                </p>
                {#if viewMode === 'upcoming' && (searchTerm || selectedCategory !== '전체')}
                    <button class="reset-btn" on:click={() => { searchTerm = ''; selectedCategory = '전체'; goto('/meetings'); }}>
                        필터 초기화
                    </button>
                {/if}
            </div>
        {/if}
    </div>

    <button class="fab" on:click={goToCreate} aria-label="새 모임 만들기">
        <Plus size={24} />
    </button>
</div>

<style>
    .page-container {
        background-color: #fff;
        min-height: 100vh;
        padding-bottom: 80px;
    }

    .header-area {
        position: sticky;
        top: 0;
        background-color: #fff;
        z-index: 10;
        padding: 20px 16px 10px 16px;
        border-bottom: 1px solid #f0f0f0;
    }

    .title-row {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 16px;
    }

    .page-title {
        font-size: 24px;
        font-weight: 800;
        margin: 0;
        color: #1a1a1a;
    }

    .toggle-mode-btn {
        background: none;
        border: none;
        color: #718096;
        font-size: 13px;
        display: flex;
        align-items: center;
        gap: 4px;
        cursor: pointer;
        padding: 4px 8px;
        border-radius: 6px;
        transition: background-color 0.2s;
    }
    .toggle-mode-btn:hover {
        background-color: #f7fafc;
        color: #2d3748;
    }

    .past-mode-info {
        font-size: 13px;
        color: #718096;
        padding-bottom: 8px;
        text-align: center;
    }

    .search-bar {
        display: flex;
        align-items: center;
        background-color: #f5f7fa;
        border-radius: 12px;
        padding: 12px 16px;
        margin-bottom: 16px;
    }

    .search-icon {
        color: #999;
        margin-right: 8px;
    }

    .search-bar input {
        flex: 1;
        border: none;
        background: transparent;
        font-size: 15px;
        outline: none;
    }

    .category-scroll {
        display: flex;
        gap: 8px;
        overflow-x: auto;
        padding-bottom: 8px;
        -ms-overflow-style: none;
        scrollbar-width: none;
    }
    .category-scroll::-webkit-scrollbar {
        display: none;
    }

    .chip {
        white-space: nowrap;
        padding: 8px 16px;
        border-radius: 20px;
        font-size: 14px;
        font-weight: 600;
        border: 1px solid #eee;
        background-color: #fff;
        color: #666;
        cursor: pointer;
        transition: all 0.2s;
    }

    .chip.active {
        background-color: #333;
        color: #fff;
        border-color: #333;
    }

    .meeting-list {
        padding: 16px;
        display: flex;
        flex-direction: column;
        gap: 16px;
    }

    .list-divider {
        display: flex;
        align-items: center;
        gap: 12px;
        margin: 8px 0;
        color: #a0aec0;
        font-size: 13px;
        font-weight: 500;
    }
    .divider-line {
        flex: 1;
        height: 1px;
        background-color: #e2e8f0;
    }
    .divider-text {
        color: #718096;
    }

    .meeting-card {
        display: flex;
        background-color: white;
        border-radius: 16px;
        overflow: hidden;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
        border: 1px solid #f0f0f0;
        text-decoration: none;
        color: inherit;
        transition: transform 0.2s;
        height: 120px;
    }
    
    .meeting-card:active {
        transform: scale(0.98);
    }

    .past-card {
        background-color: #fafafa;
    }

    .image-wrapper {
        width: 120px;
        height: 100%;
        position: relative;
        flex-shrink: 0;
    }

    .image-wrapper img {
        width: 100%;
        height: 100%;
        object-fit: cover;
    }
    
    .image-wrapper.grayscale img {
        filter: grayscale(100%);
        opacity: 0.8;
    }

    .time-badge {
        position: absolute;
        top: 8px;
        left: 8px;
        background-color: rgba(0, 0, 0, 0.6);
        color: white;
        font-size: 10px;
        font-weight: bold;
        padding: 4px 6px;
        border-radius: 4px;
        backdrop-filter: blur(4px);
    }
    .time-badge.closed {
        background-color: rgba(50, 50, 50, 0.8);
    }

    .content {
        flex: 1;
        padding: 12px 16px;
        display: flex;
        flex-direction: column;
        justify-content: center;
        min-width: 0;
    }

    .top-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 6px;
    }

    .badge-group {
        display: flex;
        align-items: center;
        gap: 6px;
    }

    .category-label {
        font-size: 11px;
        color: #3182ce;
        background-color: #ebf8ff;
        padding: 2px 6px;
        border-radius: 4px;
        font-weight: bold;
    }

    .status-pill {
        font-size: 10px;
        padding: 2px 6px;
        border-radius: 4px;
        font-weight: bold;
    }
    .status-pill.pending {
        background-color: #fffaf0;
        color: #dd6b20;
        border: 1px solid #fbd38d;
    }
    .status-pill.accepted {
        background-color: #f0fff4;
        color: #38a169;
        border: 1px solid #9ae6b4;
    }

    .host-wrapper {
        display: flex;
        align-items: center;
        gap: 6px;
    }

    .host-badge {
        display: inline-flex;
        align-items: center;
        gap: 2px;
        font-size: 10px;
        padding: 2px 5px;
        background-color: #FEFCBF;
        color: #B7791F;
        border-radius: 4px;
        font-weight: 800;
        border: 1px solid #F6E05E;
    }

    .host-name {
        font-size: 12px;
        color: #999;
    }

    .title {
        font-size: 16px;
        font-weight: bold;
        margin: 0 0 8px 0;
        color: #2d3748;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .info-row {
        display: flex;
        flex-direction: column;
        gap: 4px;
    }

    .info-group {
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .info-item {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 12px;
        color: #718096;
    }
    
    .info-item.participants {
        font-weight: 600;
        color: #4a5568;
    }
    
    .info-item.location span {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 180px;
    }

    .loading-state, .empty-state {
        padding: 60px 0;
        text-align: center;
        color: #999;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 12px;
    }

    .more-loading {
        text-align: center;
        padding: 20px;
        color: #718096;
        font-size: 13px;
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 8px;
    }

    .load-trigger {
        height: 20px;
        margin-top: 10px;
    }

    .end-message {
        text-align: center;
        color: #a0aec0;
        font-size: 12px;
        padding: 20px 0;
    }

    .spin { animation: spin 1s linear infinite; }
    @keyframes spin { 100% { transform: rotate(360deg); } }

    .reset-btn {
        margin-top: 8px;
        background-color: #edf2f7;
        border: none;
        padding: 8px 16px;
        border-radius: 8px;
        color: #4a5568;
        font-weight: 600;
        cursor: pointer;
    }

    .fab {
        position: fixed;
        bottom: 80px;
        right: 20px;
        width: 56px;
        height: 56px;
        border-radius: 50%;
        background-color: #333;
        color: white;
        border: none;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        z-index: 100;
        transition: transform 0.2s;
    }

    .fab:active { transform: scale(0.95); }
</style>