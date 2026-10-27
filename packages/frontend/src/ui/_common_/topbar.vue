<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<header :class="$style.root">
	<div :class="$style.inner">
		<MkA to="/" :class="$style.brand" :aria-label="i18n.ts.home">
			<MkAmixofLogo :class="$style.logo" label=""/>
			<span :class="$style.brandName">{{ instance.name ?? host }}</span>
		</MkA>

		<form :class="$style.search" role="search" @submit.prevent="submitSearch">
			<i class="ti ti-search" :class="$style.searchIcon" aria-hidden="true"></i>
			<input
				v-model="query"
				:class="$style.searchInput"
				type="search"
				:placeholder="i18n.ts.search"
				:aria-label="i18n.ts.search"
				autocomplete="off"
				enterkeyhint="search"
			/>
		</form>

		<div :class="$style.actions">
			<MkA v-tooltip.noDelay="i18n.ts.search" to="/search" :class="[$style.iconButton, $style.searchButton]" :aria-label="i18n.ts.search">
				<i class="ti ti-search ti-fw"></i>
			</MkA>
			<button v-tooltip.noDelay="i18n.ts.theme" class="_button" :class="$style.iconButton" :aria-label="i18n.ts.theme" :aria-pressed="store.r.darkMode.value" @click="toggleDarkMode">
				<i v-if="store.r.darkMode.value" class="ti ti-sun ti-fw"></i>
				<i v-else class="ti ti-moon ti-fw"></i>
			</button>
			<MkA v-if="$i" v-tooltip.noDelay="i18n.ts.notifications" to="/my/notifications" :class="$style.iconButton" :aria-label="i18n.ts.notifications">
				<i class="ti ti-bell ti-fw"></i>
				<span v-if="$i.hasUnreadNotification" :class="$style.indicator" class="_blink">
					<span v-if="$i.unreadNotificationsCount > 0" class="_indicateCounter" :class="$style.indicatorCount">{{ $i.unreadNotificationsCount > 99 ? '99+' : $i.unreadNotificationsCount }}</span>
					<i v-else class="_indicatorCircle"></i>
				</span>
			</MkA>
			<button v-if="$i" v-tooltip.noDelay="`${i18n.ts.account}: @${$i.username}`" class="_button" :class="$style.account" :aria-label="`${i18n.ts.account}: @${$i.username}`" @click="openAccountMenu">
				<MkAvatar :user="$i" :class="$style.avatar"/>
			</button>
		</div>
	</div>
</header>
</template>

<script lang="ts" setup>
import { ref } from 'vue';
import { host } from '@@/js/config.js';
import MkAmixofLogo from '@/components/MkAmixofLogo.vue';
import * as os from '@/os.js';
import { i18n } from '@/i18n.js';
import { instance } from '@/instance.js';
import { store } from '@/store.js';
import { prefer } from '@/preferences.js';
import { getAccountMenu } from '@/accounts.js';
import { $i } from '@/i.js';
import { useRouter } from '@/router.js';

const router = useRouter();
const query = ref('');

function submitSearch() {
	const q = query.value.trim();
	if (q === '') return;
	router.push('/search', { query: { q } });
}

// Same behaviour as the "d" hotkey (boot/main-boot.ts): manual switching turns device sync off after confirmation.
async function toggleDarkMode() {
	const value = !store.s.darkMode;
	if (prefer.s.syncDeviceDarkMode) {
		const { canceled } = await os.confirm({
			type: 'question',
			text: i18n.tsx.switchDarkModeManuallyWhenSyncEnabledConfirm({ x: i18n.ts.syncDeviceDarkMode }),
		});
		if (canceled) return;
		prefer.commit('syncDeviceDarkMode', false);
	}
	store.set('darkMode', value);
}

async function openAccountMenu(ev: MouseEvent) {
	const menuItems = await getAccountMenu({ withExtraOperation: true });
	os.popupMenu(menuItems, ev.currentTarget ?? ev.target);
}
</script>

<style lang="scss" module>
.root {
	--topbar-height: 56px;

	flex-shrink: 0;
	height: var(--topbar-height);
	background: var(--MI_THEME-navBg);
	border-bottom: solid 1px var(--MI_THEME-divider);
}

.inner {
	display: flex;
	align-items: center;
	gap: 16px;
	box-sizing: border-box;
	height: 100%;
	max-width: 1380px;
	margin: 0 auto;
	padding: 0 16px;
}

.brand {
	display: flex;
	align-items: center;
	gap: 10px;
	flex-shrink: 0;
	color: var(--MI_THEME-fgHighlighted);
	font-weight: 800;
	letter-spacing: 0.04em;
	text-decoration: none;

	&:focus-visible {
		outline: 2px solid var(--MI_THEME-focus);
		outline-offset: 2px;
		border-radius: 6px;
	}
}

.logo {
	width: 30px;
}

.brandName {
	font-size: 1.05em;
}

.search {
	display: flex;
	align-items: center;
	gap: 8px;
	flex: 1;
	min-width: 0;
	max-width: 520px;
	height: 38px;
	margin: 0 auto;
	padding: 0 14px;
	box-sizing: border-box;
	border-radius: 999px;
	background: var(--MI_THEME-buttonBg);
	color: var(--MI_THEME-fg);

	&:focus-within {
		outline: 2px solid var(--MI_THEME-focus);
	}
}

.searchIcon {
	opacity: 0.7;
}

.searchInput {
	flex: 1;
	min-width: 0;
	border: none;
	background: transparent;
	color: inherit;
	font: inherit;
	outline: none;

	&::placeholder {
		color: var(--MI_THEME-fg);
		opacity: 0.6;
	}
}

.actions {
	display: flex;
	align-items: center;
	gap: 4px;
	flex-shrink: 0;
	margin-left: auto;
}

.iconButton {
	position: relative;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 38px;
	height: 38px;
	border-radius: 999px;
	color: var(--MI_THEME-fg);
	text-decoration: none;

	&:hover {
		background: var(--MI_THEME-buttonBg);
		color: var(--MI_THEME-fgHighlighted);
	}

	&:focus-visible {
		outline: 2px solid var(--MI_THEME-focus);
	}
}

.searchButton {
	display: none;
}

.indicator {
	position: absolute;
	top: 4px;
	right: 4px;
	color: var(--MI_THEME-navIndicator);
	font-size: 8px;
}

.indicatorCount {
	font-size: 8px;
}

.account {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 38px;
	height: 38px;
	margin-left: 4px;
	border-radius: 999px;

	&:focus-visible {
		outline: 2px solid var(--MI_THEME-focus);
	}
}

.avatar {
	width: 32px;
	height: 32px;
}

@media (max-width: 900px) {
	.brandName {
		display: none;
	}
}

@media (max-width: 700px) {
	.search {
		display: none;
	}

	.searchButton {
		display: inline-flex;
	}
}
</style>
