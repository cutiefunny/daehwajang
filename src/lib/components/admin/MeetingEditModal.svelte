<script>
    import { createEventDispatcher, onMount } from 'svelte';
    import { modal } from '$lib/stores';
    import { db } from '$lib/firebase';
    import { doc, updateDoc, collection, query, where, getDocs, deleteDoc, orderBy } from 'firebase/firestore';
    import { X, Trash2, Star, MessageSquare, Loader2 } from 'lucide-svelte';
    import ImageUploader from '$lib/components/ImageUploader.svelte';

    export let meeting = {};

    const dispatch = createEventDispatcher();
    let isSaving = false;
    
    // 초기 데이터 로드
    let formData = { ...meeting };
    if (formData.price === undefined) formData.price = 0;

    let reviews = [];
    let hosts = [];
    let isLoadingReviews = false;

    // [추가] 호스트 검색 관련 상태
    let hostSearchTerm = '';
    let isHostDropdownOpen = false;

    const categories = ['소셜', '운동', '취미', '독서', '여행', '맛집', '기타'];

    onMount(() => {
        if (formData.date) {
            formData.dateInput = formData.date.slice(0, 16);
        }
        
        // 초기 검색어 설정 (기존 호스트 이름)
        hostSearchTerm = formData.hostName || '';

        Promise.all([
            fetchReviews(),
            fetchHosts()
        ]);
    });

    async function fetchHosts() {
        try {
            const q = query(collection(db, 'users'), orderBy('nickname', 'asc'));
            const snapshot = await getDocs(q);
            hosts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error("호스트 목록 로딩 실패:", error);
        }
    }

    // [추가] 호스트 검색 필터링 (반응형)
    $: filteredHosts = hosts.filter(host => 
        (host.nickname || '').toLowerCase().includes(hostSearchTerm.toLowerCase()) || 
        (host.email || '').toLowerCase().includes(hostSearchTerm.toLowerCase())
    );

    // [추가] 호스트 선택 함수
    function selectHost(host) {
        formData.hostId = host.id;
        formData.hostName = host.nickname;
        hostSearchTerm = host.nickname; // 선택 후 입력창에 이름 표시
        isHostDropdownOpen = false;
    }

    // [추가] 입력창 포커스/블러 핸들러
    function handleHostInputFocus() {
        isHostDropdownOpen = true;
    }
    
    function handleHostInputBlur() {
        // 클릭 이벤트가 발생할 시간을 주기 위해 지연 처리
        setTimeout(() => {
            isHostDropdownOpen = false;
        }, 200);
    }

    function generateSearchKeywords(text) {
        if (!text) return [];
        const keywords = [];
        const cleanText = text.replace(/\s/g, '').toLowerCase();
        for (let i = 0; i < cleanText.length - 1; i++) {
            keywords.push(cleanText.substring(i, i + 2));
        }
        return keywords;
    }

    async function fetchReviews() {
        isLoadingReviews = true;
        try {
            const q = query(
                collection(db, 'meeting_reviews'),
                where('meetingId', '==', meeting.id)
            );
            const snapshot = await getDocs(q);
            
            reviews = snapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() }))
                .sort((a, b) => {
                    const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(0);
                    const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(0);
                    return dateB - dateA;
                });
        } catch (error) {
            console.error("후기 로딩 실패:", error);
        } finally {
            isLoadingReviews = false;
        }
    }

    async function deleteReview(reviewId) {
        if (!await modal.confirm('정말로 이 후기를 삭제하시겠습니까?')) return;

        try {
            await deleteDoc(doc(db, 'meeting_reviews', reviewId));
            reviews = reviews.filter(r => r.id !== reviewId);
            await modal.alert('후기가 삭제되었습니다.');
        } catch (error) {
            console.error("후기 삭제 실패:", error);
            await modal.alert("삭제 중 오류가 발생했습니다.");
        }
    }

    function formatReviewDate(timestamp) {
        if (!timestamp) return '-';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' });
    }

    async function save() {
        isSaving = true;
        try {
            const meetingRef = doc(db, 'meetings', formData.id);
            const isoDate = new Date(formData.dateInput).toISOString();
            
            const updates = {
                title: formData.title,
                image: formData.image,
                category: formData.category,
                date: isoDate,
                location: formData.location,
                description: formData.description || '',
                hostName: formData.hostName,
                hostId: formData.hostId, 
                price: Number(formData.price) || 0,
                _searchKeywords: [
                    ...generateSearchKeywords(formData.title),
                    ...generateSearchKeywords(formData.location)
                ]
            };

            await updateDoc(meetingRef, updates);
            dispatch('save', { ...formData, ...updates, date: isoDate });
            await modal.alert('모임 정보가 수정되었습니다.');
        } catch (error) {
            console.error("수정 실패:", error);
            await modal.alert("수정 중 오류가 발생했습니다.");
        } finally {
            isSaving = false;
        }
    }

    function close() {
        dispatch('close');
    }

    function handleOverlayKeydown(e) {
        if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault(); 
            close();
        }
    }
</script>

<div 
    class="modal-overlay" 
    role="button" 
    tabindex="0" 
    on:click={close} 
    on:keydown={handleOverlayKeydown}
>
    <div 
        class="modal-content" 
        role="dialog" 
        aria-modal="true" 
        tabindex="0" 
        on:keydown={(e) => e.key === 'Escape' && close()} 
        on:click|stopPropagation
    >
        <div class="modal-header">
            <h3>모임 정보 수정</h3>
            <button class="close-btn" on:click={close}><X size={20} /></button>
        </div>
        
        <div class="modal-body">
            <div class="form-section">
                <div class="form-group">
                    <div class="form-label">대표 이미지</div>
                    <div style="height: 200px;">
                        <ImageUploader 
                            path="meetings" 
                            bind:imageUrl={formData.image} 
                            objectFit="cover" 
                        />
                    </div>
                </div>

                <div class="form-group">
                    <label for="meeting-title">모임명</label>
                    <input id="meeting-title" type="text" bind:value={formData.title} />
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label for="meeting-category">카테고리</label>
                        <select id="meeting-category" bind:value={formData.category}>
                            {#each categories as category}
                                <option value={category}>{category}</option>
                            {/each}
                        </select>
                    </div>

                    <div class="form-group">
                        <label for="meeting-price">참가비 (원)</label>
                        <input id="meeting-price" type="number" bind:value={formData.price} placeholder="0" min="0" step="1000" />
                    </div>

                    <div class="form-group dropdown-container">
                        <label for="meeting-host">호스트</label>
                        <input 
                            id="meeting-host"
                            type="text" 
                            bind:value={hostSearchTerm}
                            on:focus={handleHostInputFocus}
                            on:blur={handleHostInputBlur}
                            on:input={() => isHostDropdownOpen = true}
                            placeholder="닉네임 또는 이메일 검색"
                            autocomplete="off"
                        />
                        
                        {#if isHostDropdownOpen}
                            <div class="dropdown-list">
                                {#if filteredHosts.length > 0}
                                    {#each filteredHosts as host}
                                        <li on:mousedown={() => selectHost(host)}>
                                            <span class="host-name">{host.nickname}</span>
                                            <span class="host-email">{host.email}</span>
                                        </li>
                                    {/each}
                                {:else}
                                    <li class="no-result">검색 결과가 없습니다.</li>
                                {/if}
                            </div>
                        {/if}
                    </div>
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label for="meeting-date">일시</label>
                        <input id="meeting-date" type="datetime-local" bind:value={formData.dateInput} />
                    </div>
                    <div class="form-group">
                        <label for="meeting-location">장소</label>
                        <input id="meeting-location" type="text" bind:value={formData.location} />
                    </div>
                </div>

                <div class="form-group">
                    <label for="meeting-description">설명</label>
                    <textarea id="meeting-description" bind:value={formData.description} rows="3"></textarea>
                </div>
            </div>

            <div class="review-section">
                <div class="section-header">
                    <h4>모임 후기 ({reviews.length})</h4>
                </div>

                {#if isLoadingReviews}
                    <div class="loading-state">
                        <Loader2 size={20} class="spin" /> <span>로딩 중...</span>
                    </div>
                {:else if reviews.length > 0}
                    <div class="review-list">
                        {#each reviews as review (review.id)}
                            <div class="review-item">
                                <div class="review-header">
                                    <div class="reviewer-info">
                                        <span class="name">{review.reviewerName}</span>
                                        <div class="rating">
                                            <Star size={10} fill="#FFD700" color="#FFD700" />
                                            <span>{review.rating}</span>
                                        </div>
                                    </div>
                                    <span class="date">{formatReviewDate(review.createdAt)}</span>
                                </div>
                                <div class="review-content">{review.content}</div>
                                <button class="delete-review-btn" on:click={() => deleteReview(review.id)}>
                                    <Trash2 size={12} /> 삭제
                                </button>
                            </div>
                        {/each}
                    </div>
                {:else}
                    <div class="empty-state">
                        <MessageSquare size={24} color="#cbd5e0" />
                        <p>등록된 후기가 없습니다.</p>
                    </div>
                {/if}
            </div>
        </div>

        <div class="modal-footer">
            <button class="cancel-btn" on:click={close}>취소</button>
            <button class="submit-btn" on:click={save} disabled={isSaving}>
                {isSaving ? '저장 중...' : '수정 완료'}
            </button>
        </div>
    </div>
</div>

<style>
    .modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background-color: rgba(0,0,0,0.5); z-index: 9999; display: flex; align-items: center; justify-content: center; }
    .modal-content { background: white; width: 600px; max-height: 90vh; border-radius: 12px;
        display: flex; flex-direction: column; box-shadow: 0 10px 25px rgba(0,0,0,0.2); overflow: hidden; }
    .modal-header { padding: 16px 24px; border-bottom: 1px solid #e2e8f0;
        display: flex; justify-content: space-between; align-items: center; flex-shrink: 0; }
    .modal-header h3 { margin: 0; font-size: 18px; color: #2d3748;
    }
    .close-btn { background: none; border: none; cursor: pointer; color: #a0aec0; }
    
    .modal-body { padding: 24px; display: flex; flex-direction: column; gap: 32px;
        overflow-y: auto; flex: 1; }
    .modal-footer { padding: 16px 24px; background-color: #f7fafc; display: flex; justify-content: flex-end; gap: 12px;
        border-top: 1px solid #e2e8f0; flex-shrink: 0; }
    
    .form-section { display: flex; flex-direction: column; gap: 16px;
    }
    .form-row { display: flex; gap: 16px; }
    .form-row .form-group { flex: 1; }
    .form-group { display: flex; flex-direction: column; gap: 6px;
    }
    label { font-size: 13px; font-weight: 600; color: #4a5568; }
    input, textarea, select { padding: 10px; border: 1px solid #e2e8f0; border-radius: 6px;
        font-size: 14px; width: 100%; box-sizing: border-box; }
    textarea { resize: vertical; }

    /* 드롭다운 스타일 */
    .dropdown-container { position: relative; }
    .dropdown-list {
        position: absolute;
        top: 100%; left: 0; right: 0;
        background: white;
        border: 1px solid #e2e8f0;
        border-radius: 6px;
        max-height: 200px;
        overflow-y: auto;
        z-index: 10;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        list-style: none;
        margin: 4px 0 0 0;
    }
    .dropdown-list li {
        padding: 8px 12px;
        cursor: pointer;
        display: flex; flex-direction: column;
        gap: 2px;
        border-bottom: 1px solid #f7fafc;
    }
    .dropdown-list li:hover { background-color: #f7fafc; }
    .dropdown-list li:last-child { border-bottom: none; }
    .dropdown-list .no-result { padding: 12px; color: #a0aec0; text-align: center; cursor: default; }
    
    .host-name { font-weight: 600; font-size: 13px; color: #2d3748; }
    .host-email { font-size: 11px; color: #718096; }

    .review-section {
        border-top: 1px solid #e2e8f0;
        padding-top: 20px;
    }
    .section-header h4 { margin: 0 0 12px 0; font-size: 15px; color: #2d3748; }
    
    .review-list { display: flex; flex-direction: column;
        gap: 8px; }
    .review-item {
        background-color: #f9fafb;
        border: 1px solid #edf2f7;
        border-radius: 8px;
        padding: 12px;
        font-size: 13px;
    }
    .review-header { display: flex;
        justify-content: space-between; align-items: center; margin-bottom: 6px; }
    .reviewer-info { display: flex; align-items: center; gap: 6px; }
    .name { font-weight: 600; color: #2d3748;
    }
    .rating { display: flex; align-items: center; gap: 2px; font-size: 11px; color: #b7791f; font-weight: bold; }
    .date { color: #a0aec0; font-size: 11px;
    }
    .review-content { color: #4a5568; line-height: 1.4; margin-bottom: 8px; }
    
    .delete-review-btn {
        display: flex; align-items: center; gap: 4px;
        background: none;
        border: 1px solid #feb2b2; border-radius: 4px;
        padding: 4px 8px; font-size: 11px; color: #c53030; background-color: #fff5f5;
        cursor: pointer; margin-left: auto;
    }
    .delete-review-btn:hover { background-color: #fed7d7; }

    .loading-state, .empty-state { text-align: center; padding: 20px; color: #a0aec0; display: flex; flex-direction: column; align-items: center;
        gap: 8px; font-size: 13px; }
    .spin { animation: spin 1s linear infinite; }
    @keyframes spin { 100% { transform: rotate(360deg);
    } }

    .cancel-btn { background: white; border: 1px solid #e2e8f0; padding: 8px 16px; border-radius: 6px; cursor: pointer; color: #4a5568; font-weight: 500;
    }
    .submit-btn { background: #3182ce; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; color: white; font-weight: 600;
    }
    .submit-btn:disabled { background-color: #cbd5e0; cursor: not-allowed; }
</style>