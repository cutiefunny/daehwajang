<script>
    import { onMount, onDestroy } from 'svelte';
    import { user, modal } from '$lib/stores';
    import { db, storage } from '$lib/firebase';
    import { 
        collection, 
        query, 
        where, 
        orderBy, 
        onSnapshot, 
        addDoc, 
        serverTimestamp,
        doc,
        updateDoc 
    } from 'firebase/firestore';
    import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
    // [수정] ImageIcon 제거 (사용하지 않음)
    import { Plus, Users, MessageCircle, Loader2 } from 'lucide-svelte';

    let chatRooms = [];
    let unsubscribe = null;

    // 이미지 업로드 관련 상태
    let fileInput;
    let editingRoomId = null;
    let uploadingRoomId = null; // 현재 업로드 중인 방 ID

    // 채팅방 목록 실시간 구독
    function subscribeToChatRooms() {
        const q = query(
            collection(db, 'chatRooms'),
            orderBy('timestamp', 'desc')
        );

        unsubscribe = onSnapshot(q, (snapshot) => {
            chatRooms = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        });
    }

    onMount(() => {
        subscribeToChatRooms();
    });

    onDestroy(() => {
        if (unsubscribe) unsubscribe();
    });

    // 새 채팅방 만들기
    async function createChatRoom() {
        if (!$user) return await modal.alert('로그인이 필요합니다!');
        
        const title = await modal.prompt('새로운 채팅방 이름을 입력하세요:', '자유 대화방');
        if (!title) return;

        try {
            await addDoc(collection(db, 'chatRooms'), {
                title: title,
                hostId: $user.uid,
                hostName: $user.displayName || '익명',
                image: '/images/cafe.png',
                lastMessage: '대화가 시작되었습니다.',
                timestamp: serverTimestamp(),
                participantCount: 1,
                participants: [$user.uid]
            });
        } catch (error) {
            console.error('채팅방 생성 실패:', error);
            await modal.alert('채팅방을 만들지 못했습니다.');
        }
    }

    // 이미지 변경 버튼 클릭 핸들러
    function triggerImageUpload(e, roomId) {
        e.preventDefault(); // 링크 이동 방지
        e.stopPropagation(); // 버블링 방지
        editingRoomId = roomId;
        fileInput.click();
    }

    // 파일 선택 및 업로드 처리
    async function handleFileSelect(e) {
        const file = e.target.files[0];
        if (!file || !editingRoomId) return;

        uploadingRoomId = editingRoomId; // 로딩 시작

        try {
            // 1. 이미지 압축
            const compressedBlob = await compressImage(file);
            
            // 2. Storage에 업로드
            const fileName = file.name.split('.').slice(0, -1).join('.') + '.avif';
            const storageRef = ref(storage, `chatRooms/${editingRoomId}/${Date.now()}_${fileName}`);
            const snapshot = await uploadBytes(storageRef, compressedBlob);
            const url = await getDownloadURL(snapshot.ref);

            // 3. Firestore 업데이트
            const roomRef = doc(db, 'chatRooms', editingRoomId);
            await updateDoc(roomRef, { image: url });

            await modal.alert('채팅방 이미지가 변경되었습니다.');

        } catch (error) {
            console.error('이미지 변경 실패:', error);
            await modal.alert('이미지 변경 중 오류가 발생했습니다.');
        } finally {
            uploadingRoomId = null; // 로딩 종료
            editingRoomId = null;
            if (fileInput) fileInput.value = '';
        }
    }

    // 이미지 압축 함수
    function compressImage(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            const maxWidth = 600; // 썸네일용 적정 사이즈

            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target.result;
                
                img.onload = () => {
                    let width = img.width;
                    let height = img.height;

                    if (width > maxWidth) {
                        height = Math.round((height * maxWidth) / width);
                        width = maxWidth;
                    }

                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;

                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    canvas.toBlob((blob) => {
                        if (blob) resolve(blob);
                        else reject(new Error('Canvas to Blob failed'));
                    }, 'image/avif', 0.8);
                };
                img.onerror = (err) => reject(err);
            };
            reader.onerror = (err) => reject(err);
        });
    }

    function formatTime(timestamp) {
        if (!timestamp) return '';
        const date = timestamp.toDate();
        const now = new Date();
        const diff = (now - date) / 1000;

        if (diff < 60) return '방금 전';
        if (diff < 60 * 60) return `${Math.floor(diff / 60)}분 전`;
        if (diff < 60 * 60 * 24) return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
        return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
    }
</script>

<div class="page-container">
    <div class="header-row">
        <h2 class="page-title">대화</h2>
        <span class="room-count">개설 {chatRooms.length}</span>
    </div>

    <div class="chat-list">
        {#if chatRooms.length > 0}
            {#each chatRooms as room (room.id)}
                <a href="/chat/{room.id}" class="chat-item">
                    <div class="image-wrapper">
                        <img src={room.image} alt={room.title} />
                    </div>
                    <div class="content">
                        <div class="top-row">
                            <h3 class="title">{room.title}</h3>
                            <span class="time">{formatTime(room.timestamp)}</span>
                        </div>
                        <div class="bottom-row">
                            <p class="message">{room.lastMessage}</p>
                        </div>
                        <div class="meta-row">
                            <div class="meta-item">
                                <Users size={12} />
                                <span>{room.participants ? room.participants.length : 0}명</span>
                            </div>
                            {#if room.hostId === $user?.uid}
                                <div class="host-controls">
                                    <div class="meta-item host-badge">
                                        <span>HOST</span>
                                    </div>
                                    <button 
                                        class="edit-img-btn" 
                                        on:click={(e) => triggerImageUpload(e, room.id)}
                                        disabled={uploadingRoomId === room.id}
                                    >
                                        {#if uploadingRoomId === room.id}
                                            <div class="spin-wrapper">
                                                <Loader2 size={11} />
                                                <span>변경 중...</span>
                                            </div>
                                        {:else}
                                            <span>썸네일 이미지 변경</span>
                                        {/if}
                                    </button>
                                </div>
                            {/if}
                        </div>
                    </div>
                </a>
            {/each}
        {:else}
            <div class="empty-state">
                <MessageCircle size={48} color="#ddd" />
                <p>개설한 대화방이 없습니다.<br />새로운 모임을 만들어보세요!</p>
            </div>
        {/if}
    </div>

    <button class="fab" aria-label="새 대화방 개설" on:click={createChatRoom}>
        <Plus size={24} />
    </button>
    
    <input 
        type="file" 
        bind:this={fileInput} 
        on:change={handleFileSelect} 
        accept="image/*" 
        hidden 
    />
</div>

<style>
    .page-container {
        padding: 20px 16px;
        position: relative;
        min-height: 100%;
        padding-bottom: 80px; 
    }

    .header-row {
        display: flex;
        align-items: baseline;
        gap: 8px;
        margin-bottom: 20px;
    }

    .page-title {
        font-size: 22px;
        font-weight: bold;
        margin: 0;
    }

    .room-count {
        font-size: 14px;
        color: #888;
        font-weight: 500;
    }

    .chat-list {
        display: flex;
        flex-direction: column;
        gap: 16px;
    }

    .chat-item {
        display: flex;
        gap: 12px;
        text-decoration: none;
        color: inherit;
        background-color: white;
    }

    .chat-item:active { opacity: 0.7; }

    .image-wrapper {
        width: 56px;
        height: 56px;
        border-radius: 20px;
        overflow: hidden;
        flex-shrink: 0;
        background-color: #f0f0f0;
        border: 1px solid #eee;
    }

    .image-wrapper img {
        width: 100%;
        height: 100%;
        object-fit: cover;
    }

    .content {
        flex: 1;
        display: flex;
        flex-direction: column;
        justify-content: center;
        min-width: 0;
        padding-bottom: 12px;
        border-bottom: 1px solid #f5f5f5;
    }

    .chat-item:last-child .content { border-bottom: none; }

    .top-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 4px;
    }

    .title {
        font-size: 16px;
        font-weight: bold;
        margin: 0;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        color: #333;
    }

    .time {
        font-size: 11px;
        color: #999;
        flex-shrink: 0;
        margin-left: 8px;
    }

    .bottom-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 6px;
    }

    .message {
        font-size: 13px;
        color: #666;
        margin: 0;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        flex: 1;
        margin-right: 8px;
    }

    .meta-row {
        display: flex;
        align-items: center;
        gap: 8px;
    }

    .meta-item {
        display: flex;
        align-items: center;
        gap: 2px;
        font-size: 11px;
        color: #999;
    }
    
    .host-controls {
        display: flex;
        align-items: center;
        gap: 6px; /* 뱃지와 버튼 사이 간격 */
    }

    .host-badge {
        color: #4285F4;
        font-weight: bold;
        background-color: #e8f0fe;
        padding: 2px 6px;
        border-radius: 4px;
    }
    
    /* [수정] 텍스트 버튼 스타일로 변경 */
    .edit-img-btn {
        background: none;
        border: 1px solid #e2e8f0;
        border-radius: 4px;
        padding: 2px 8px;
        font-size: 10px;
        color: #718096;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;
        height: auto;
        white-space: nowrap; /* 텍스트 줄바꿈 방지 */
    }
    
    .edit-img-btn:hover {
        background-color: #f7fafc;
        color: #2d3748;
        border-color: #cbd5e0;
    }

    .spin-wrapper {
        display: flex;
        align-items: center;
        gap: 4px;
    }
    
    .spin-wrapper :global(svg) {
        animation: spin 1s linear infinite;
    }
    
    @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

    .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 60px 0;
        gap: 16px;
        color: #ccc;
        text-align: center;
    }

    .empty-state p {
        margin: 0;
        font-size: 14px;
        color: #999;
        line-height: 1.5;
    }

    .fab {
        position: fixed;
        bottom: 80px;
        right: 20px;
        width: 56px;
        height: 56px;
        border-radius: 28px;
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