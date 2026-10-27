/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { describe, expect, test, vi } from 'vitest';
import { FEDERATION_ENABLED, enforceStandalone } from '@/misc/standalone.js';
import { FetchInstanceMetadataService } from '@/core/FetchInstanceMetadataService.js';
import { RelayService } from '@/core/RelayService.js';
import { RemoteUserResolveService } from '@/core/RemoteUserResolveService.js';

// AMIXOF standalone mode: federation is permanently off, whatever the stored setting says.
describe('standalone mode', () => {
	test('federation is disabled', () => {
		expect(FEDERATION_ENABLED).toBe(false);
	});

	test('enforceStandalone overrides every stored federation setting', () => {
		for (const stored of ['all', 'specified', 'none'] as const) {
			expect(enforceStandalone({ federation: stored, other: 1 })).toEqual({ federation: 'none', other: 1 });
		}
	});

	test('instance metadata is never fetched from other servers', async () => {
		const svc = Object.create(FetchInstanceMetadataService.prototype) as FetchInstanceMetadataService;
		const redisSet = vi.fn();
		const fetchOrRegister = vi.fn();
		const getJson = vi.fn();
		Object.assign(svc, { redisClient: { set: redisSet }, federatedInstanceService: { fetchOrRegister }, httpRequestService: { getJson } });

		await svc.fetchInstanceMetadata({ host: 'remote.example' } as any, true);

		expect(redisSet).not.toHaveBeenCalled(); // no lock is taken either
		expect(fetchOrRegister).not.toHaveBeenCalled();
		expect(getJson).not.toHaveBeenCalled();
	});

	test('relays cannot be added', async () => {
		const svc = Object.create(RelayService.prototype) as RelayService;
		const insertOne = vi.fn();
		Object.assign(svc, { relaysRepository: { insertOne } });

		await expect(svc.addRelay('https://relay.example/inbox')).rejects.toThrow('federation is disabled');
		expect(insertOne).not.toHaveBeenCalled();
	});

	test('remote users are never resolved (no WebFinger lookup)', async () => {
		const svc = Object.create(RemoteUserResolveService.prototype) as RemoteUserResolveService;
		const webfinger = vi.fn();
		Object.assign(svc, {
			config: { host: 'amixof.example' },
			utilityService: { toPuny: (h: string) => h },
			webfingerService: { webfinger },
			logger: { info: vi.fn(), warn: vi.fn() },
		});

		await expect(svc.resolveUser('someone', 'remote.example')).rejects.toThrow('federation is disabled');
		expect(webfinger).not.toHaveBeenCalled();
	});
});
