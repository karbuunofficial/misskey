/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

/**
 * AMIXOF runs as a standalone social network: ActivityPub federation is always off.
 *
 * Instead of removing the federation code (see docs/audit/PHASE_2_READINESS.md), the existing
 * `federation: 'none'` kill switch is made permanent. Every loaded copy of the server settings is
 * passed through this function, so a database value of `all` / `specified` (an upgraded
 * instance, a restored backup) cannot re-enable federation.
 */
export const FEDERATION_ENABLED = false;

export function enforceStandalone<T extends { federation: 'all' | 'specified' | 'none' }>(meta: T): T {
	if (!FEDERATION_ENABLED) meta.federation = 'none';
	return meta;
}
