/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import bcrypt from 'bcryptjs';
import { Inject, Injectable } from '@nestjs/common';
import { Endpoint } from '@/server/api/endpoint-base.js';
import type { UserProfilesRepository } from '@/models/_.js';
import { DI } from '@/di-symbols.js';
import { UserAuthService } from '@/core/UserAuthService.js';

export const meta = {
	requireCredential: true,

	secure: true,
} as const;

export const paramDef = {
	type: 'object',
	properties: {
		currentPassword: { type: 'string' },
		newPassword: { type: 'string', minLength: 1 },
		token: { type: 'string', nullable: true },
	},
	required: ['currentPassword', 'newPassword'],
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> { // eslint-disable-line import/no-default-export
	constructor(
		@Inject(DI.userProfilesRepository)
		private userProfilesRepository: UserProfilesRepository,

		private userAuthService: UserAuthService,
	) {
		super(meta, paramDef, async (ps, me) => {
			const token = ps.token;
			const profile = await this.userProfilesRepository.findOneByOrFail({ userId: me.id });

			if (profile.twoFactorEnabled) {
				if (token == null) {
					throw new Error('authentication failed');
				}

				try {
					await this.userAuthService.twoFactorAuthenticate(profile, token);
				} catch (_) {
					throw new Error('authentication failed');
				}
			}

			const passwordMatched = await bcrypt.compare(ps.currentPassword, profile.password!);

			if (!passwordMatched) {
				throw new Error('incorrect password');
			}

			// Generate hash of password
			const salt = await bcrypt.genSalt(8);
			const hash = await bcrypt.hash(ps.newPassword, salt);

			await this.userProfilesRepository.update(me.id, {
				password: hash,
			});

			// Sign out every session that was issued with the old credentials. Misskey has a
			// single native token per user, so this includes the caller's own session; the client
			// is asked to sign in again with the new password (same behaviour as i/regenerate-token).
			// Third-party application tokens (access_token) are separate, scoped authorizations and
			// are intentionally left untouched; they can be revoked via i/revoke-token.
			await this.userAuthService.regenerateNativeToken(me.id);
		});
	}
}
