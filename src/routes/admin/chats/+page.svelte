<script>
	import { onMount } from 'svelte';
	import { db } from '$lib/firebase';
	import { 
		collection, getDocs, query, orderBy, doc, deleteDoc, getCountFromServer, where, documentId 
	} from 'firebase/firestore';
	import { Search, MessageSquare, Trash2, Eye, Users, X, ChevronLeft, ChevronRight } from 'lucide-svelte';

	let chatRooms = [];
	let isLoading = true;
	let searchTerm = '';

	// 페이지네이션
	let currentPage = 1;
	const itemsPerPage = 10;

	// 모달 관련
	let isModalOpen = false;
	let selectedRoomTitle = '';
	let selectedMembers = [];
	let isMemberLoading = false;

	async function fetchChatRooms() {
		isLoading = true;
		try {
			const q = query(collection(db, 'chatRooms'), orderBy('timestamp', 'desc'));
			const querySnapshot = await getDocs(q);
			
			const roomPromises = querySnapshot.docs.map(async (docSnap) => {
				const data = docSnap.data();
				let messageCount = 0;
				try {
					const messagesColl = collection(db, 'chatRooms', docSnap.id, 'messages');
					const countSnap = await getCountFromServer(messagesColl);
					messageCount = countSnap.data().count;
				} catch (e) { console.error(e); }

				return {
					id: docSnap.id,
					...data,
					messageCount,
					hostName: data.hostName || '알 수 없음',
					participants: data.participants || []
				};
			});

			chatRooms = await Promise.all(roomPromises);
		} catch (error) {
			console.error("채팅방 목록 로딩 실패:", error);
		} finally {
			isLoading = false;
		}
	}

	async function openMemberModal(room) {
		selectedRoomTitle = room.title;
		isModalOpen = true;
		isMemberLoading = true;
		selectedMembers = [];

		try {
			const userIds = room.participants;
			if (userIds && userIds.length > 0) {
				const chunkSize = 10;
				const chunks = [];
				for (let i = 0; i < userIds.length; i += chunkSize) {
					const chunk = userIds.slice(i, i + chunkSize);
					if (chunk.length > 0) {
						const q = query(collection(db, 'users'), where(documentId(), 'in', chunk));
						chunks.push(getDocs(q));
					}
				}
				const snapshots = await Promise.all(chunks);
				snapshots.forEach(snap => {
					snap.docs.forEach(doc => selectedMembers.push({ id: doc.id, ...doc.data() }));
				});
				selectedMembers = selectedMembers;
			}
		} catch (error) {
			console.error("멤버 정보 로딩 실패:", error);
		} finally {
			isMemberLoading = false;
		}
	}

	function closeModal() {
		isModalOpen = false;
		selectedMembers = [];
	}

	async function deleteChatRoom(id) {
		if (!confirm('정말로 이 채팅방을 삭제하시겠습니까?')) return;
		try {
			await deleteDoc(doc(db, 'chatRooms', id));
			chatRooms = chatRooms.filter(r => r.id !== id);
			alert('삭제되었습니다.');
		} catch (error) {
			console.error("삭제 실패:", error);
			alert("삭제 중 오류가 발생했습니다.");
		}
	}

	function formatDate(timestamp) {
		if (!timestamp) return '-';
		const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
		return date.toLocaleString('ko-KR', {
			year: '2-digit', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
		});
	}

	$: filteredRooms = chatRooms.filter(r => 
		r.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
		r.hostName?.toLowerCase().includes(searchTerm.toLowerCase())
	);

	$: if (searchTerm) currentPage = 1;

	$: totalPages = Math.ceil(filteredRooms.length / itemsPerPage);
	$: paginatedRooms = filteredRooms.slice(
		(currentPage - 1) * itemsPerPage, 
		currentPage * itemsPerPage
	);

	function goToPage(page) {
		if (page >= 1 && page <= totalPages) currentPage = page;
	}

	onMount(() => {
		fetchChatRooms();
	});
</script>

<div class="page-header">
	<h2>채팅방 관리</h2>
	<div class="search-box">
		<Search size={18} color="#718096" />
		<input 
			type="text" 
			placeholder="방 제목 또는 호스트 검색" 
			bind:value={searchTerm} 
		/>
	</div>
</div>

<div class="table-container">
	{#if isLoading}
		<div class="loading">데이터를 불러오는 중...</div>
	{:else}
		<table>
			<thead>
				<tr>
					<th>대화방 이름</th>
					<th>생성일</th>
					<th>호스트</th>
					<th>멤버 수</th>
					<th>대화 수</th>
					<th>모니터링</th>
					<th>관리</th>
				</tr>
			</thead>
			<tbody>
				{#if paginatedRooms.length > 0}
					{#each paginatedRooms as room}
						<tr>
							<td>
								<div class="room-info">
									<div class="thumb">
										<img src={room.image} alt={room.title} />
									</div>
									<span class="room-title">{room.title}</span>
								</div>
							</td>
							<td>{formatDate(room.timestamp)}</td>
							<td>{room.hostName}</td>
							<td>
								<button class="member-btn" on:click={() => openMemberModal(room)}>
									<Users size={14} />
									<span>{room.participants?.length || 0}명</span>
								</button>
							</td>
							<td><span class="msg-count">{room.messageCount.toLocaleString()}</span></td>
							<td>
								<a href="/chat/{room.id}" class="monitor-btn" target="_blank">
									<Eye size={16} /> 모니터링
								</a>
							</td>
							<td>
								<button 
									class="icon-btn delete" 
									title="삭제"
									on:click={() => deleteChatRoom(room.id)}
								>
									<Trash2 size={16} />
								</button>
							</td>
						</tr>
					{/each}
				{:else}
					<tr>
						<td colspan="7" class="empty-message">개설된 채팅방이 없습니다.</td>
					</tr>
				{/if}
			</tbody>
		</table>

		{#if totalPages > 1}
			<div class="pagination">
				<button 
					class="page-btn" 
					disabled={currentPage === 1} 
					on:click={() => goToPage(currentPage - 1)}
				>
					<ChevronLeft size={16} />
				</button>
				
				<span class="page-info">
					Page <strong>{currentPage}</strong> of {totalPages}
				</span>

				<button 
					class="page-btn" 
					disabled={currentPage === totalPages} 
					on:click={() => goToPage(currentPage + 1)}
				>
					<ChevronRight size={16} />
				</button>
			</div>
		{/if}
	{/if}
</div>

{#if isModalOpen}
	<div class="modal-overlay" on:click={closeModal}>
		<div class="modal-content" on:click|stopPropagation>
			<div class="modal-header">
				<h3>참여 멤버 목록 <span class="sub-title">({selectedRoomTitle})</span></h3>
				<button class="close-btn" on:click={closeModal}><X size={20} /></button>
			</div>
			<div class="modal-body">
				{#if isMemberLoading}
					<div class="modal-loading">로딩 중...</div>
				{:else if selectedMembers.length > 0}
					<ul class="member-list">
						{#each selectedMembers as member}
							<li class="member-item">
								<div class="member-avatar">
									{#if member.image}
										<img src={member.image} alt={member.nickname} />
									{:else}
										<span>{member.nickname?.[0] || 'U'}</span>
									{/if}
								</div>
								<div class="member-info">
									<span class="name">{member.nickname}</span>
									<span class="email">{member.email}</span>
								</div>
							</li>
						{/each}
					</ul>
				{:else}
					<div class="empty-modal">정보를 불러올 수 없습니다.</div>
				{/if}
			</div>
		</div>
	</div>
{/if}

<style>
	/* 기존 스타일 유지 */
	.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
	h2 { margin: 0; font-size: 24px; color: #2d3748; }
	.search-box { display: flex; align-items: center; background: white; padding: 8px 16px; border-radius: 8px; border: 1px solid #e2e8f0; gap: 8px; width: 300px; }
	.search-box input { border: none; outline: none; width: 100%; font-size: 14px; }
	.table-container { background: white; border-radius: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); overflow: hidden; display: flex; flex-direction: column; }
	table { width: 100%; border-collapse: collapse; min-width: 900px; }
	th { text-align: left; padding: 16px 24px; background-color: #f7fafc; color: #718096; font-size: 12px; font-weight: 600; text-transform: uppercase; border-bottom: 1px solid #e2e8f0; }
	td { padding: 16px 24px; border-bottom: 1px solid #edf2f7; vertical-align: middle; font-size: 14px; color: #4a5568; }
	tr:hover { background-color: #fafafa; }

	/* 페이지네이션 */
	.pagination { display: flex; align-items: center; justify-content: center; padding: 16px; border-top: 1px solid #e2e8f0; gap: 16px; }
	.page-btn { background: white; border: 1px solid #e2e8f0; border-radius: 4px; padding: 6px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
	.page-btn:hover:not(:disabled) { background-color: #f7fafc; }
	.page-btn:disabled { color: #cbd5e0; cursor: not-allowed; }
	.page-info { font-size: 13px; color: #4a5568; }

	.room-info { display: flex; align-items: center; gap: 12px; }
	.thumb { width: 40px; height: 40px; border-radius: 8px; overflow: hidden; background-color: #edf2f7; flex-shrink: 0; }
	.thumb img { width: 100%; height: 100%; object-fit: cover; }
	.room-title { font-weight: 600; color: #2d3748; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
	.member-btn { display: flex; align-items: center; gap: 6px; padding: 4px 10px; background-color: #ebf8ff; color: #3182ce; border: none; border-radius: 12px; font-size: 12px; font-weight: 600; cursor: pointer; transition: background 0.2s; }
	.member-btn:hover { background-color: #bee3f8; }
	.msg-count { font-weight: bold; color: #4a5568; }
	.monitor-btn { display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; border: 1px solid #e2e8f0; background: white; border-radius: 6px; font-size: 12px; text-decoration: none; color: #4a5568; transition: all 0.2s; }
	.monitor-btn:hover { background-color: #f7fafc; border-color: #cbd5e0; }
	.icon-btn { background: none; border: none; cursor: pointer; padding: 6px; border-radius: 4px; color: #a0aec0; transition: color 0.2s; }
	.icon-btn.delete:hover { color: #e53e3e; background-color: #fff5f5; }
	.loading, .empty-message { text-align: center; padding: 40px; color: #a0aec0; }

	.modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.5); z-index: 1000; display: flex; align-items: center; justify-content: center; }
	.modal-content { background: white; width: 400px; max-height: 80vh; border-radius: 12px; display: flex; flex-direction: column; box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
	.modal-header { padding: 16px 20px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; }
	.modal-header h3 { margin: 0; font-size: 16px; color: #2d3748; }
	.sub-title { font-weight: normal; color: #718096; font-size: 14px; }
	.close-btn { background: none; border: none; cursor: pointer; color: #a0aec0; padding: 4px; }
	.close-btn:hover { color: #4a5568; }
	.modal-body { padding: 0; overflow-y: auto; }
	.modal-loading, .empty-modal { padding: 40px; text-align: center; color: #a0aec0; font-size: 14px; }
	.member-list { list-style: none; padding: 0; margin: 0; }
	.member-item { display: flex; align-items: center; gap: 12px; padding: 12px 20px; border-bottom: 1px solid #f7fafc; }
	.member-item:last-child { border-bottom: none; }
	.member-avatar { width: 36px; height: 36px; border-radius: 50%; background-color: #edf2f7; overflow: hidden; display: flex; align-items: center; justify-content: center; color: #718096; font-size: 12px; font-weight: bold; }
	.member-avatar img { width: 100%; height: 100%; object-fit: cover; }
	.member-info { display: flex; flex-direction: column; }
	.member-info .name { font-size: 14px; font-weight: 600; color: #2d3748; }
	.member-info .email { font-size: 12px; color: #a0aec0; }
</style>