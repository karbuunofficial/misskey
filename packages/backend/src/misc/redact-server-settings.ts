/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

/**
 * Server-setting (MiMeta) keys whose values are credentials and must never be
 * written into the moderation log or any other secondary store.
 */
export const SENSITIVE_SERVER_SETTING_KEYS = [
	'hcaptchaSecretKey',
	'mcaptchaSecretKey',
	'recaptchaSecretKey',
	'turnstileSecretKey',
	'sensitiveMediaDetectionApiKey',
	'smtpPass',
	'swPrivateKey',
	'deeplAuthKey',
	'objectStorageAccessKey',
	'objectStorageSecretKey',
	'verifymailAuthKey',
	'truemailAuthKey',
] as const;

export const REDACTED_VALUE = '[REDACTED]';
export const REDACTED_CHANGED_VALUE = '[REDACTED (changed)]';

type Settings = object | null | undefined;

function isSet(value: unknown): boolean {
	return value != null && value !== '';
}

/**
 * Returns copies of `before` / `after` server settings in which every sensitive
 * value is replaced by a placeholder. The placeholder still records whether a
 * secret was changed so the log remains useful for auditing, without exposing
 * the secret itself.
 */
export function redactServerSettingsForLog<T extends Settings>(before: T, after: T): { before: T; after: T } {
	const redactedBefore = before == null ? null : { ...before } as Record<string, unknown>;
	const redactedAfter = after == null ? null : { ...after } as Record<string, unknown>;

	for (const key of SENSITIVE_SERVER_SETTING_KEYS) {
		const beforeValue = redactedBefore?.[key];
		const afterValue = redactedAfter?.[key];

		if (redactedBefore != null && key in redactedBefore) {
			redactedBefore[key] = isSet(beforeValue) ? REDACTED_VALUE : beforeValue;
		}

		if (redactedAfter != null && key in redactedAfter) {
			if (!isSet(afterValue)) {
				redactedAfter[key] = afterValue;
			} else if (beforeValue === afterValue) {
				redactedAfter[key] = REDACTED_VALUE;
			} else {
				redactedAfter[key] = REDACTED_CHANGED_VALUE;
			}
		}
	}

	return { before: (redactedBefore ?? before) as T, after: (redactedAfter ?? after) as T };
}
