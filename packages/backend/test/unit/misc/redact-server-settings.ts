/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { describe, expect, test } from 'vitest';
import {
	REDACTED_CHANGED_VALUE,
	REDACTED_VALUE,
	SENSITIVE_SERVER_SETTING_KEYS,
	redactServerSettingsForLog,
} from '@/misc/redact-server-settings.js';

describe('redactServerSettingsForLog', () => {
	test('replaces every sensitive value and keeps non-sensitive values intact', () => {
		const before: Record<string, unknown> = { name: 'AMIXOF', smtpPass: 'hunter2', objectStorageSecretKey: 'AKIA...', deeplAuthKey: null };
		const after: Record<string, unknown> = { name: 'AMIXOF!', smtpPass: 'hunter2', objectStorageSecretKey: 'rotated', deeplAuthKey: 'new-key' };

		const result = redactServerSettingsForLog(before, after);

		expect(result.before).toEqual({ name: 'AMIXOF', smtpPass: REDACTED_VALUE, objectStorageSecretKey: REDACTED_VALUE, deeplAuthKey: null });
		expect(result.after).toEqual({ name: 'AMIXOF!', smtpPass: REDACTED_VALUE, objectStorageSecretKey: REDACTED_CHANGED_VALUE, deeplAuthKey: REDACTED_CHANGED_VALUE });
	});

	test('never leaks the original secret through either side', () => {
		const secrets = Object.fromEntries(SENSITIVE_SERVER_SETTING_KEYS.map((key, i) => [key, `secret-${i}`]));
		const result = redactServerSettingsForLog({ ...secrets }, { ...secrets, smtpPass: 'rotated-smtp-secret' });
		const serialized = JSON.stringify(result);

		for (const key of SENSITIVE_SERVER_SETTING_KEYS) {
			expect(serialized).not.toContain(secrets[key]);
		}
		expect(serialized).not.toContain('rotated-smtp-secret');
	});

	test('does not mutate its inputs', () => {
		const before = { smtpPass: 'a' };
		const after = { smtpPass: 'b' };
		redactServerSettingsForLog(before, after);
		expect(before.smtpPass).toBe('a');
		expect(after.smtpPass).toBe('b');
	});

	test('tolerates null inputs', () => {
		expect(redactServerSettingsForLog(null, null)).toEqual({ before: null, after: null });
	});
});
