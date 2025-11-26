<script>
	export let width = '100%';
	export let height = '20px';
	export let borderRadius = '4px';
	export let style = '';
</script>

<div 
	class="skeleton" 
	style="width: {width}; height: {height}; border-radius: {borderRadius}; {style}"
></div>

<style>
	.skeleton {
		background-color: #f0f0f0;
		background-image: linear-gradient(
			90deg,
			#f0f0f0 0px,
			#f8f8f8 40px,
			#f0f0f0 80px
		);
		background-size: 200px 100%;
		background-repeat: no-repeat;
		display: inline-block;
		animation: skeleton-loading 1.5s infinite ease-in-out;
	}

	@keyframes skeleton-loading {
		0% {
			background-position: -200px 0;
		}
		100% {
			background-position: calc(100% + 200px) 0;
		}
	}
</style>