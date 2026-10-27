/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { describe, expect, test, vi } from 'vitest';
import { QueueService } from '@/core/QueueService.js';

// Standalone mode: outgoing ActivityPub deliveries must never be scheduled.
describe('QueueService (standalone)', () => {
	const makeService = () => {
		const svc = Object.create(QueueService.prototype) as QueueService;
		const add = vi.fn();
		const addBulk = vi.fn();
		Object.assign(svc, { deliverQueue: { add, addBulk }, config: { deliverJobMaxAttempts: 3 } });
		return { svc, add, addBulk };
	};
	const user = { id: 'u1' } as any;
	const activity = { '@context': 'https://www.w3.org/ns/activitystreams', type: 'Create', id: 'x' } as any;

	test('deliver does not enqueue anything', async () => {
		const { svc, add, addBulk } = makeService();
		expect(await svc.deliver(user, activity, 'https://remote.example/inbox', false)).toBeNull();
		expect(add).not.toHaveBeenCalled();
		expect(addBulk).not.toHaveBeenCalled();
	});

	test('deliverMany does not enqueue anything', async () => {
		const { svc, add, addBulk } = makeService();
		const inboxes = new Map([['https://remote.example/inbox', false], ['https://other.example/inbox', true]]);
		expect(await svc.deliverMany(user, activity, inboxes)).toBeNull();
		expect(add).not.toHaveBeenCalled();
		expect(addBulk).not.toHaveBeenCalled();
	});
});
