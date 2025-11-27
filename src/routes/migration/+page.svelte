<script>
	import { db } from '$lib/firebase';
	import { collection, getDocs, writeBatch, doc } from 'firebase/firestore';
	import { Database, Play, CheckCircle, AlertCircle, Loader2, FileText } from 'lucide-svelte';

	let status = 'idle'; // idle, running, completed, error
	let logs = [];
	let progress = { current: 0, total: 0 };

	function addLog(msg) {
		logs = [...logs, msg];
		// 로그 스크롤 자동 이동 (선택 사항)
	}

	// [핵심] Bi-gram 키워드 생성 함수
	function generateSearchKeywords(text) {
		if (!text) return [];
		const keywords = [];
		const cleanText = text.replace(/\s/g, '').toLowerCase(); // 공백 제거 및 소문자
		
		// 2글자씩 잘라서 저장
		for (let i = 0; i < cleanText.length - 1; i++) {
			keywords.push(cleanText.substring(i, i + 2));
		}
		return keywords;
	}

	async function runMigration() {
		if (!confirm('전체 데이터에 검색 키워드 필드를 추가합니다. 진행하시겠습니까?')) return;
		
		status = 'running';
		logs = [];
		progress = { current: 0, total: 0 };
		
		try {
			addLog('🚀 마이그레이션 시작...');
			
			// 1. 데이터 로드
			addLog('⏳ 회원 및 모임 데이터 로딩 중...');
			const [usersSnap, meetingsSnap] = await Promise.all([
				getDocs(collection(db, 'users')),
				getDocs(collection(db, 'meetings'))
			]);

			const userDocs = usersSnap.docs;
			const meetingDocs = meetingsSnap.docs;
			
			addLog(`📦 회원 데이터: ${userDocs.length}건`);
			addLog(`📦 모임 데이터: ${meetingDocs.length}건`);

			progress.total = userDocs.length + meetingDocs.length;
			
			// 2. 배치 처리 (Firestore는 한 번에 최대 500개까지만 배치 가능)
			const batchSize = 450; // 여유 있게 450개로 설정
			let batch = writeBatch(db);
			let operationCount = 0;
			let batchCount = 0;

			// --- (1) 회원 데이터 처리 ---
			for (const docSnap of userDocs) {
				const data = docSnap.data();
				const keywords = [
					...generateSearchKeywords(data.nickname),
					...generateSearchKeywords(data.email?.split('@')[0])
				];
				
				// 중복 제거 (Set 활용)
				const uniqueKeywords = [...new Set(keywords)];
				
				const ref = doc(db, 'users', docSnap.id);
				// _searchKeywords 필드만 업데이트 (merge 효과)
				batch.update(ref, { _searchKeywords: uniqueKeywords });
				
				operationCount++;
				progress.current++;
				
				// 배치 제한 도달 시 커밋
				if (operationCount >= batchSize) {
					await batch.commit();
					batchCount++;
					addLog(`✅ 배치 ${batchCount} 저장 완료 (${operationCount}건 처리)`);
					batch = writeBatch(db); // 배치 초기화
					operationCount = 0;
				}
			}

			// --- (2) 모임 데이터 처리 ---
			for (const docSnap of meetingDocs) {
				const data = docSnap.data();
				const keywords = [
					...generateSearchKeywords(data.title),
					...generateSearchKeywords(data.location)
				];
				
				const uniqueKeywords = [...new Set(keywords)];
				
				const ref = doc(db, 'meetings', docSnap.id);
				batch.update(ref, { _searchKeywords: uniqueKeywords });
				
				operationCount++;
				progress.current++;
				
				if (operationCount >= batchSize) {
					await batch.commit();
					batchCount++;
					addLog(`✅ 배치 ${batchCount} 저장 완료 (${operationCount}건 처리)`);
					batch = writeBatch(db);
					operationCount = 0;
				}
			}

			// 남은 배치 커밋
			if (operationCount > 0) {
				await batch.commit();
				addLog(`✅ 마지막 배치 저장 완료 (${operationCount}건 처리)`);
			}

			status = 'completed';
			addLog('✨ 모든 데이터 마이그레이션이 성공적으로 완료되었습니다!');

		} catch (error) {
			console.error(error);
			status = 'error';
			addLog(`❌ 치명적 오류 발생: ${error.message}`);
		}
	}
</script>

<div class="migration-container">
	<div class="card">
		<div class="header">
			<Database size={32} class="icon" />
			<h1>검색 인덱싱 마이그레이션</h1>
		</div>
		
		<p class="desc">
			기존 회원(users) 및 모임(meetings) 데이터에 
			<strong>Bi-gram 검색 키워드(_searchKeywords)</strong>를 생성하여 추가합니다.<br/>
			이 작업은 데이터 양에 따라 시간이 소요될 수 있습니다.
		</p>

		<div class="status-box">
			<div class="progress-bar">
				<div 
					class="fill {status}" 
					style="width: {progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%"
				></div>
			</div>
			<span class="progress-text">
				{progress.current} / {progress.total} 완료
			</span>
		</div>

		<div class="log-window">
			{#each logs as log}
				<div class="log-item">{log}</div>
			{/each}
			{#if logs.length === 0}
				<div class="log-placeholder">대기 중...</div>
			{/if}
		</div>

		<div class="actions">
			{#if status === 'running'}
				<button class="btn running" disabled>
					<Loader2 size={18} class="spin" /> 처리 중...
				</button>
			{:else}
				<button class="btn start" on:click={runMigration}>
					<Play size={18} /> 마이그레이션 시작
				</button>
			{/if}
		</div>
	</div>
</div>

<style>
	.migration-container {
		min-height: 100vh;
		background-color: #f5f7fa;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 20px;
	}

	.card {
		background: white;
		width: 100%;
		max-width: 500px;
		padding: 32px;
		border-radius: 16px;
		box-shadow: 0 4px 20px rgba(0,0,0,0.05);
	}

	.header {
		display: flex;
		align-items: center;
		gap: 12px;
		margin-bottom: 16px;
		color: #2d3748;
	}
	.header h1 { margin: 0; font-size: 22px; font-weight: bold; }
	.icon { color: #3182ce; }

	.desc {
		color: #718096;
		font-size: 14px;
		line-height: 1.6;
		margin-bottom: 24px;
		background-color: #ebf8ff;
		padding: 12px;
		border-radius: 8px;
		border-left: 4px solid #3182ce;
	}

	.status-box { margin-bottom: 20px; }
	.progress-bar {
		height: 8px;
		background-color: #edf2f7;
		border-radius: 4px;
		overflow: hidden;
		margin-bottom: 8px;
	}
	.fill {
		height: 100%;
		background-color: #3182ce;
		transition: width 0.3s ease;
	}
	.fill.error { background-color: #e53e3e; }
	.fill.completed { background-color: #48bb78; }
	
	.progress-text { font-size: 12px; color: #718096; font-weight: 600; float: right; }

	.log-window {
		background-color: #1a202c;
		border-radius: 8px;
		height: 200px;
		overflow-y: auto;
		padding: 12px;
		font-family: monospace;
		font-size: 12px;
		color: #a0aec0;
		margin-bottom: 24px;
		display: flex;
		flex-direction: column;
		gap: 4px;
	}
	.log-item { color: #e2e8f0; border-bottom: 1px solid #2d3748; padding-bottom: 2px; }
	.log-placeholder { color: #4a5568; font-style: italic; }

	.actions { display: flex; justify-content: flex-end; }
	.btn {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 12px 24px;
		border-radius: 8px;
		font-weight: bold;
		font-size: 15px;
		border: none;
		cursor: pointer;
		transition: all 0.2s;
	}
	.btn.start { background-color: #3182ce; color: white; }
	.btn.start:hover { background-color: #2b6cb0; }
	.btn.running { background-color: #cbd5e0; color: #718096; cursor: not-allowed; }

	.spin { animation: spin 1s linear infinite; }
	@keyframes spin { 100% { transform: rotate(360deg); } }
</style>