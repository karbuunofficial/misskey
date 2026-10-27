/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { describe, expect, test } from 'vitest';
import { CONTENT_SECURITY_POLICY_REPORT_ONLY } from '@/server/web/csp.js';

describe('CONTENT_SECURITY_POLICY_REPORT_ONLY', () => {
	const directives = new Map(CONTENT_SECURITY_POLICY_REPORT_ONLY.split('; ').map(d => {
		const [name, ...values] = d.split(' ');
		return [name, values] as const;
	}));

	test('keeps scripts strict so inline scripts and eval are reported', () => {
		const scriptSrc = directives.get('script-src')!;
		expect(scriptSrc).toContain('\'self\'');
		expect(scriptSrc).not.toContain('\'unsafe-inline\'');
		expect(scriptSrc).not.toContain('\'unsafe-eval\'');
	});

	test('disallows plugins and restricts base / form targets', () => {
		expect(directives.get('object-src')).toEqual(['\'none\'']);
		expect(directives.get('base-uri')).toEqual(['\'self\'']);
		expect(directives.get('form-action')).toEqual(['\'self\'']);
	});

	test('allows the streaming WebSocket, media and workers the client needs', () => {
		expect(directives.get('connect-src')).toEqual(expect.arrayContaining(['ws:', 'wss:']));
		expect(directives.get('media-src')).toEqual(expect.arrayContaining(['blob:']));
		expect(directives.get('worker-src')).toEqual(expect.arrayContaining(['blob:']));
	});
});
