/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

process.env.NODE_ENV = 'test';

import * as assert from 'assert';
import { describe, test } from 'vitest';
import { relativeFetch } from '../utils.js';

// AMIXOF is standalone: NodeInfo is a federation discovery document and is not served.
describe('nodeinfo (standalone: not served)', () => {
	test('nodeinfo 2.1', async () => {
		const res = await relativeFetch('nodeinfo/2.1');
		assert.strictEqual(res.status, 404);
	});

	test('nodeinfo 2.0', async () => {
		const res = await relativeFetch('nodeinfo/2.0');
		assert.strictEqual(res.status, 404);
	});
});
