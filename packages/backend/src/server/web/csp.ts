/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

/**
 * Content-Security-Policy applied to HTML documents in REPORT-ONLY mode.
 *
 * It is deliberately strict about scripts (no 'unsafe-inline' / 'unsafe-eval') so that the
 * browser console reveals every inline script and eval the client still depends on. The
 * policy is NOT enforced; see docs/audit/CSP_REPORT_ONLY.md for the findings and the plan
 * for enforcing it.
 */
export const CONTENT_SECURITY_POLICY_REPORT_ONLY = [
	'default-src \'self\'',
	// Captcha providers are loaded dynamically by MkCaptcha.vue.
	'script-src \'self\' https://challenges.cloudflare.com https://js.hcaptcha.com https://*.hcaptcha.com https://www.recaptcha.net https://www.gstatic.com',
	// Vue renders many inline style attributes; styles are far lower risk than scripts.
	'style-src \'self\' \'unsafe-inline\'',
	// Remote avatars, emoji, media proxy, user-supplied images.
	'img-src * data: blob:',
	'media-src * data: blob:',
	'font-src \'self\' data:',
	// API, streaming (ws/wss) and external services (captcha, URL previews, translation).
	'connect-src \'self\' ws: wss: https:',
	// Captcha iframes and embedded players (YouTube, Spotify, ...).
	'frame-src \'self\' https:',
	'worker-src \'self\' blob:',
	'manifest-src \'self\'',
	'object-src \'none\'',
	'base-uri \'self\'',
	'form-action \'self\'',
].join('; ');
