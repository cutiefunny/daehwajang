<script>
	import { createEventDispatcher } from 'svelte';
	import { X, Briefcase, MessageSquare } from 'lucide-svelte';

	export let user = {}; // 모달에 표시할 유저 정보

	const dispatch = createEventDispatcher();

	function close() {
		dispatch('close');
	}

	function getGenderText(code) {
		if (code === 'M') return '남성';
		if (code === 'F') return '여성';
		return '';
	}
</script>

<div class="modal-overlay" on:click={close}>
	<div class="modal-content" on:click|stopPropagation>
		<button class="close-btn" on:click={close}>
			<X size={24} />
		</button>

		<div class="profile-header">
			<div class="avatar-wrapper">
				<img src={user.image || 'https://placehold.co/200x200/333/fff?text=U'} alt={user.nickname} />
			</div>
			<h3 class="nickname">
				{user.nickname}
				<span class="meta">
					{user.age ? `${user.age}세` : ''}
					{user.gender ? ` · ${getGenderText(user.gender)}` : ''}
				</span>
			</h3>
			{#if user.job}
				<div class="job-badge">
					<Briefcase size={12} /> {user.job}
				</div>
			{/if}
		</div>

		<div class="profile-body">
			{#if user.intro}
				<div class="section intro-box">
					<MessageSquare size={16} class="icon" />
					<p>"{user.intro}"</p>
				</div>
			{/if}

			{#if user.interests && user.interests.length > 0}
				<div class="section">
					<h4 class="section-title">관심사</h4>
					<div class="tags">
						{#each user.interests as interest}
							<span class="tag-chip">#{interest}</span>
						{/each}
					</div>
				</div>
			{/if}

			{#if user.peopleMet > 0}
				<div class="section stats">
					<div class="stat-item">
						<span class="label">만난 사람들</span>
						<span class="value">{user.peopleMet}명</span>
					</div>
				</div>
			{/if}
		</div>
	</div>
</div>

<style>
	.modal-overlay {
		position: fixed; top: 0; left: 0; width: 100%; height: 100%;
		background-color: rgba(0, 0, 0, 0.6); z-index: 2000;
		display: flex; align-items: center; justify-content: center;
		padding: 20px;
		backdrop-filter: blur(2px);
	}

	.modal-content {
		background: white; width: 100%; max-width: 340px;
		border-radius: 20px; overflow: hidden;
		box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
		position: relative;
		animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
	}

	@keyframes slideUp {
		from { transform: translateY(20px); opacity: 0; }
		to { transform: translateY(0); opacity: 1; }
	}

	.close-btn {
		position: absolute; top: 16px; right: 16px;
		background: rgba(0,0,0,0.05); border: none; border-radius: 50%;
		width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;
		cursor: pointer; color: #333; z-index: 10;
	}

	.profile-header {
		display: flex; flex-direction: column; align-items: center;
		padding: 32px 20px 20px; background-color: #fdfdfd;
		border-bottom: 1px solid #f0f0f0;
	}

	.avatar-wrapper {
		width: 90px; height: 90px; border-radius: 50%;
		overflow: hidden; border: 4px solid white;
		box-shadow: 0 4px 12px rgba(0,0,0,0.1);
		margin-bottom: 12px;
	}
	.avatar-wrapper img { width: 100%; height: 100%; object-fit: cover; }

	.nickname { font-size: 20px; font-weight: 800; color: #1a1a1a; margin: 0 0 6px; display: flex; align-items: center; gap: 6px; }
	.meta { font-size: 14px; font-weight: normal; color: #888; }

	.job-badge {
		display: inline-flex; align-items: center; gap: 4px;
		background-color: #f0f4ff; color: #3182ce;
		padding: 4px 10px; border-radius: 12px;
		font-size: 12px; font-weight: 600;
	}

	.profile-body { padding: 20px; display: flex; flex-direction: column; gap: 20px; }

	.intro-box {
		background-color: #f8f9fa; padding: 16px; border-radius: 12px;
		display: flex; gap: 10px; align-items: flex-start;
	}
	.intro-box .icon { color: #cbd5e0; flex-shrink: 0; margin-top: 2px; }
	.intro-box p { margin: 0; font-size: 14px; line-height: 1.5; color: #4a5568; font-style: italic; }

	.section-title { font-size: 13px; font-weight: 700; color: #a0aec0; margin: 0 0 10px; text-transform: uppercase; letter-spacing: 0.5px; }

	.tags { display: flex; flex-wrap: wrap; gap: 6px; }
	.tag-chip {
		background-color: white; border: 1px solid #e2e8f0;
		padding: 6px 12px; border-radius: 20px;
		font-size: 13px; color: #4a5568;
	}

	.stats { border-top: 1px solid #f0f0f0; padding-top: 16px; display: flex; justify-content: center; }
	.stat-item { display: flex; flex-direction: column; align-items: center; }
	.stat-item .label { font-size: 11px; color: #a0aec0; margin-bottom: 2px; }
	.stat-item .value { font-size: 16px; font-weight: 800; color: #2d3748; }
</style>