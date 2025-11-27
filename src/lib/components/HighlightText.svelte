<script>
	export let text = '';
	export let term = '';

	// 검색어(term)가 변경될 때마다 텍스트를 분리하여 하이라이트 여부를 결정합니다.
	function getParts(originalText, searchTerm) {
		if (!searchTerm || !searchTerm.trim()) {
			return [{ text: originalText, highlight: false }];
		}

		// 정규식 특수문자 이스케이프 처리
		const escapedTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
		// 대소문자 구분 없이 검색 (gi), 괄호()를 사용하여 분리된 배열에 검색어도 포함되게 함
		const regex = new RegExp(`(${escapedTerm})`, 'gi');
		
		// split 결과 예시: "안녕하세요" 검색어 "안녕" -> ["", "안녕", "하세요"]
		return originalText.split(regex).map(part => ({
			text: part,
			// 분리된 조각이 검색어와 대소문자 무시하고 일치하는지 확인
			highlight: part.toLowerCase() === searchTerm.toLowerCase()
		}));
	}

	$: parts = getParts(text, term);
</script>

<span class="text-wrapper">
	{#each parts as part}
		{#if part.highlight}
			<mark class="highlight">{part.text}</mark>
		{:else}
			{part.text}
		{/if}
	{/each}
</span>

<style>
	.highlight {
		background-color: #fff176; /* 형광펜 색상 (노란색) */
		color: inherit;
		padding: 0;
		border-radius: 2px;
		font-weight: inherit;
	}
	.text-wrapper {
		/* 부모 요소의 스타일을 상속받도록 설정 */
		display: inline;
	}
</style>