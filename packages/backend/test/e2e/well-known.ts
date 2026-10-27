/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

process.env.NODE_ENV = 'test';

import * as assert from 'assert';
import { beforeAll, describe, test } from 'vitest';
import { host, origin, relativeFetch, signup } from '../utils.js';
import type * as misskey from 'misskey-js';

// AMIXOF is standalone: federation discovery documents are refused, local OAuth discovery still works.
describe('.well-known', () => {
	let alice: misskey.entities.User;

	beforeAll(async () => {
		alice = await signup({ username: 'alice' });
	}, 1000 * 60 * 2);

	test('nodeinfo link document is refused', async () => {
		const res = await relativeFetch('.well-known/nodeinfo');
		assert.strictEqual(res.status, 403);
	});

	test('webfinger is refused', async () => {
		const res = await relativeFetch(`.well-known/webfinger?resource=acct:${alice.username}@${host}`);
		assert.strictEqual(res.status, 403);
	});

	test('host-meta is refused', async () => {
		const res = await relativeFetch('.well-known/host-meta');
		assert.strictEqual(res.status, 403);
	});

	test('host-meta.json is refused', async () => {
		const res = await relativeFetch('.well-known/host-meta.json');
		assert.strictEqual(res.status, 403);
	});

	test('oauth-authorization-server still works', async () => {
		const res = await relativeFetch('.well-known/oauth-authorization-server');
		assert.ok(res.ok);
		assert.strictEqual(res.headers.get('Access-Control-Allow-Origin'), '*');

		const serverInfo = await res.json() as any;
		assert.strictEqual(serverInfo.issuer, origin);
		assert.strictEqual(serverInfo.authorization_endpoint, `${origin}/oauth/authorize`);
		assert.strictEqual(serverInfo.token_endpoint, `${origin}/oauth/token`);
	});
});
