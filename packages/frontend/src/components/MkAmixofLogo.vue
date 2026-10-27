<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<!-- Both official variants are rendered; CSS shows the one matching the active theme (html[data-color-scheme]). -->
<span :class="[$style.root, scheme === 'light' && $style.forceLight, scheme === 'dark' && $style.forceDark]" role="img" :aria-label="label">
	<img :class="$style.light" :src="logoLight" alt="" draggable="false" decoding="async"/>
	<img :class="$style.dark" :src="logoDark" alt="" draggable="false" decoding="async"/>
</span>
</template>

<script lang="ts" setup>
import logoLight from '/client-assets/amixof-logo-light.webp';
import logoDark from '/client-assets/amixof-logo-dark.webp';

withDefaults(defineProps<{
	label?: string;
	/**
	 * 'auto' follows the active theme. 'light' always shows the coral artwork (for light backgrounds),
	 * 'dark' always shows the white artwork (for dark or photographic backgrounds).
	 */
	scheme?: 'auto' | 'light' | 'dark';
}>(), {
	label: 'AMIXOF',
	scheme: 'auto',
});
</script>

<style lang="scss" module>
.root {
	display: inline-block;
	line-height: 0;
}

.light,
.dark {
	display: block;
	width: 100%;
	height: auto;
}

.dark {
	display: none;
}

:global(html[data-color-scheme=dark]) .root:not(.forceLight),
.forceDark {
	.light {
		display: none;
	}

	.dark {
		display: block;
	}
}

.forceLight {
	.light {
		display: block;
	}

	.dark {
		display: none;
	}
}
</style>
