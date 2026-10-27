/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

process.env.NODE_ENV = 'test';

import * as assert from 'assert';
import { describe, beforeAll, test, expect } from 'vitest';
import { api, post, relativeFetch, signup } from '../utils.js';
import type * as misskey from 'misskey-js';

// AMIXOF is a standalone network: ActivityPub federation is permanently disabled
// (packages/backend/src/misc/standalone.ts) while every local social feature keeps working.
describe('Standalone mode (federation disabled)', () => {
	let root: misskey.entities.SignupResponse;
	let alice: misskey.entities.SignupResponse;
	let bob: misskey.entities.SignupResponse;

	beforeAll(async () => {
		root = await signup({ username: 'root' });
		alice = await signup({ username: 'alice' });
		bob = await signup({ username: 'bob' });
	}, 1000 * 60 * 2);

	describe('federation cannot be used', () => {
		test('the federation setting cannot be enabled through the admin API', async () => {
			for (const federation of ['all', 'specified'] as const) {
				const res = await api('admin/update-meta', { federation }, root);
				assert.strictEqual(res.status, 204);
				const meta = await api('admin/meta', {}, root);
				assert.strictEqual((meta.body as { federation: string }).federation, 'none');
				const publicMeta = await api('meta', {});
				assert.strictEqual((publicMeta.body as { federation?: string }).federation ?? 'none', 'none');
			}
		});

		test('incoming ActivityPub messages are rejected', async () => {
			const res = await relativeFetch('inbox', {
				method: 'POST',
				headers: { 'Content-Type': 'application/activity+json' },
				body: JSON.stringify({ '@context': 'https://www.w3.org/ns/activitystreams', type: 'Follow', actor: 'https://remote.example/users/x', object: `http://127.0.0.1/users/${alice.id}` }),
			});
			assert.strictEqual(res.status, 403);

			const userInbox = await relativeFetch(`users/${alice.id}/inbox`, { method: 'POST', headers: { 'Content-Type': 'application/activity+json' }, body: '{}' });
			assert.strictEqual(userInbox.status, 403);
		});

		test('actor, note and collection documents are not served as ActivityPub', async () => {
			const note = await post(alice, { text: 'standalone note' });
			for (const path of [`users/${alice.id}`, `users/${alice.id}/outbox`, `users/${alice.id}/followers`, `notes/${note.id}`]) {
				const res = await relativeFetch(path, { headers: { Accept: 'application/activity+json' } });
				assert.strictEqual(res.status, 403, path);
			}
		});

		test('WebFinger, host-meta and NodeInfo discovery are unavailable', async () => {
			for (const path of ['.well-known/webfinger?resource=acct:alice@127.0.0.1', '.well-known/host-meta', '.well-known/host-meta.json', '.well-known/nodeinfo']) {
				const res = await relativeFetch(path);
				assert.strictEqual(res.status, 403, path);
			}
			for (const path of ['nodeinfo/2.0', 'nodeinfo/2.1']) {
				const res = await relativeFetch(path);
				assert.strictEqual(res.status, 404, path);
			}
		});

		test('remote users cannot be discovered or looked up', async () => {
			const byHost = await api('users/show', { username: 'someone', host: 'remote.example' }, alice);
			assert.notStrictEqual(byHost.status, 200);

			const byUri = await api('ap/show', { uri: 'https://remote.example/users/someone' }, alice);
			assert.notStrictEqual(byUri.status, 200);
		});

		test('relays cannot be added', async () => {
			const res = await api('admin/relays/add', { inbox: 'https://relay.example/inbox' }, root);
			assert.notStrictEqual(res.status, 200);
			const list = await api('admin/relays/list', {}, root);
			assert.strictEqual(list.status, 200);
			assert.strictEqual((list.body as unknown[]).length, 0);
		});
	});

	describe('local social features keep working', () => {
		test('account creation and login', async () => {
			const user = await signup({ username: 'carol', password: 'carol-password' });
			assert.strictEqual((await api('i', {}, user)).status, 200);
			const signin = await api('signin-flow', { username: 'carol', password: 'carol-password' });
			assert.strictEqual(signin.status, 200);
			assert.strictEqual((signin.body as { finished: boolean }).finished, true);
		});

		test('posting, following, timelines and notifications', async () => {
			const follow = await api('following/create', { userId: alice.id }, bob);
			assert.strictEqual(follow.status, 200);

			const note = await post(alice, { text: 'hello standalone world' });
			assert.strictEqual(note.text, 'hello standalone world');

			await expect.poll(async () => {
				const tl = await api('notes/timeline', {}, bob);
				return (tl.body as misskey.entities.Note[]).some(n => n.id === note.id);
			}, { timeout: 5000, interval: 50 }).toBe(true);

			await expect.poll(async () => {
				const tl = await api('notes/local-timeline', {}, bob);
				return (tl.body as misskey.entities.Note[]).some(n => n.id === note.id);
			}, { timeout: 5000, interval: 50 }).toBe(true);

			await post(bob, { text: `@${alice.username} hi alice` });
			await expect.poll(async () => {
				const res = await api('i/notifications', {}, alice);
				return (res.body as misskey.entities.Notification[]).map(n => n.type);
			}, { timeout: 5000, interval: 50 }).toEqual(expect.arrayContaining(['follow', 'mention']));
		});
	});
});
