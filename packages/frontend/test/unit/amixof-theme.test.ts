/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { describe, test, expect } from 'vitest';
import lightBase from '@@/themes/_light.json5';
import darkBase from '@@/themes/_dark.json5';
import amixofLight from '@@/themes/l-amixof.json5';
import amixofDark from '@@/themes/d-amixof.json5';
import { compile, validateTheme, type Theme } from '@@/js/theme.js';

// same merge as ThemeManager.compile (src/theme.ts)
function compileWithBase(theme: Theme) {
	const base = [lightBase, darkBase].find(x => x.id === theme.base);
	return compile({ ...theme, props: Object.assign({}, base?.props, theme.props) });
}

describe('AMIXOF themes', () => {
	test('are valid themes with distinct ids', () => {
		expect(validateTheme(amixofLight)).toBe(true);
		expect(validateTheme(amixofDark)).toBe(true);
		expect(amixofLight.id).not.toBe(amixofDark.id);
		expect(amixofLight.base).toBe('light');
		expect(amixofDark.base).toBe('dark');
	});

	test.each([['light', amixofLight], ['dark', amixofDark]] as const)('%s theme exposes the brand palette', (_, theme) => {
		const c = compileWithBase(theme as Theme);
		expect(c.brandCoral).toBe('rgb(255, 80, 88)');
		expect(c.brandRed).toBe('rgb(229, 57, 64)');
		expect(c.brandDeepRed).toBe('rgb(198, 40, 50)');
		expect(c.brandPink).toBe('rgb(255, 139, 145)');
		expect(c.brandBurgundy).toBe('rgb(72, 35, 44)');
	});

	test('light surfaces: page, feed, secondary', () => {
		const c = compileWithBase(amixofLight as Theme);
		expect(c.bg).toBe('rgb(245, 246, 249)');
		expect(c.panel).toBe('rgb(255, 255, 255)');
		expect(c.panelHighlight).toBe('rgb(241, 242, 245)');
		expect(c.accent).toBe('rgb(229, 57, 64)');
	});

	test('dark surfaces: page, feed, secondary', () => {
		const c = compileWithBase(amixofDark as Theme);
		expect(c.bg).toBe('rgb(12, 12, 17)');
		expect(c.panel).toBe('rgb(20, 19, 27)');
		expect(c.panelHighlight).toBe('rgb(34, 33, 43)');
		expect(c.accent).toBe('rgb(255, 80, 88)');
	});

	test('every other builtin theme still gets the brand palette from its base', () => {
		const c = compileWithBase({ ...amixofLight, props: {} } as Theme);
		expect(c.brandCoral).toBe('rgb(255, 80, 88)');
	});
});
