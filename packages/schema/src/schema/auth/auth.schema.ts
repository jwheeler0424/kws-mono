import { defineRelationsPart, sql } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

import type { UUIDv7 } from '@kws/types';

import { timestamps } from '../common.schema';

export const user = pgTable('user', {
  id: uuid('id')
    .$type<UUIDv7>()
    .default(sql`pg_catalog.uuidv7()`)
    .primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').default(false).notNull(),
  image: text('image'),
  role: text('role'),
  banned: boolean('banned').default(false),
  banReason: text('ban_reason'),
  banExpires: timestamp('ban_expires'),
  lastLoginMethod: text('last_login_method'),
  twoFactorEnabled: boolean('two_factor_enabled').default(false),
  username: text('username').unique(),
  displayUsername: text('display_username'),
  lastLoginAt: timestamp('last_login_at'),
  ...timestamps,
});

export const session = pgTable(
  'session',
  {
    id: uuid('id')
      .$type<UUIDv7>()
      .default(sql`pg_catalog.uuidv7()`)
      .primaryKey(),
    expiresAt: timestamp('expires_at').notNull(),
    token: text('token').notNull().unique(),
    ...timestamps,
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    userId: uuid('user_id')
      .$type<UUIDv7>()
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    impersonatedBy: text('impersonated_by'),
    activeOrganizationId: text('active_organization_id'),
    activeTeamId: text('active_team_id'),
  },
  (table) => [index('session_userId_idx').on(table.userId)],
);

export const account = pgTable(
  'account',
  {
    id: uuid('id')
      .$type<UUIDv7>()
      .default(sql`pg_catalog.uuidv7()`)
      .primaryKey(),
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    userId: uuid('user_id')
      .$type<UUIDv7>()
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    idToken: text('id_token'),
    accessTokenExpiresAt: timestamp('access_token_expires_at'),
    refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
    scope: text('scope'),
    password: text('password'),
    ...timestamps,
  },
  (table) => [index('account_userId_idx').on(table.userId)],
);

export const organization = pgTable(
  'organization',
  {
    id: uuid('id')
      .$type<UUIDv7>()
      .default(sql`pg_catalog.uuidv7()`)
      .primaryKey(),
    name: text('name').notNull(),
    slug: text('slug').notNull().unique(),
    logo: text('logo'),
    ...timestamps,
    metadata: text('metadata'),
  },
  (table) => [uniqueIndex('organization_slug_uidx').on(table.slug)],
);

export const organizationRole = pgTable(
  'organization_role',
  {
    id: uuid('id')
      .$type<UUIDv7>()
      .default(sql`pg_catalog.uuidv7()`)
      .primaryKey(),
    organizationId: uuid('organization_id')
      .$type<UUIDv7>()
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    role: text('role').notNull(),
    permission: text('permission').notNull(),
    ...timestamps,
  },
  (table) => [
    index('organizationRole_organizationId_idx').on(table.organizationId),
    index('organizationRole_role_idx').on(table.role),
  ],
);

export const team = pgTable(
  'team',
  {
    id: uuid('id')
      .$type<UUIDv7>()
      .default(sql`pg_catalog.uuidv7()`)
      .primaryKey(),
    name: text('name').notNull(),
    organizationId: uuid('organization_id')
      .$type<UUIDv7>()
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    ...timestamps,
  },
  (table) => [index('team_organizationId_idx').on(table.organizationId)],
);

export const teamMember = pgTable(
  'team_member',
  {
    id: uuid('id')
      .$type<UUIDv7>()
      .default(sql`pg_catalog.uuidv7()`)
      .primaryKey(),
    teamId: uuid('team_id')
      .$type<UUIDv7>()
      .notNull()
      .references(() => team.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .$type<UUIDv7>()
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    ...timestamps,
  },
  (table) => [
    index('teamMember_teamId_idx').on(table.teamId),
    index('teamMember_userId_idx').on(table.userId),
  ],
);

export const member = pgTable(
  'member',
  {
    id: uuid('id')
      .$type<UUIDv7>()
      .default(sql`pg_catalog.uuidv7()`)
      .primaryKey(),
    organizationId: uuid('organization_id')
      .$type<UUIDv7>()
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .$type<UUIDv7>()
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    role: text('role').default('member').notNull(),
    ...timestamps,
  },
  (table) => [
    index('member_organizationId_idx').on(table.organizationId),
    index('member_userId_idx').on(table.userId),
  ],
);

export const invitation = pgTable(
  'invitation',
  {
    id: uuid('id')
      .$type<UUIDv7>()
      .default(sql`pg_catalog.uuidv7()`)
      .primaryKey(),
    organizationId: uuid('organization_id')
      .$type<UUIDv7>()
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    email: text('email').notNull(),
    role: text('role'),
    teamId: uuid('team_id').$type<UUIDv7>(),
    status: text('status').default('pending').notNull(), // 'pending', 'accepted', 'rejected', 'cancelled'
    expiresAt: timestamp('expires_at').notNull(),
    ...timestamps,
    inviterId: uuid('inviter_id')
      .$type<UUIDv7>()
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
  },
  (table) => [
    index('invitation_organizationId_idx').on(table.organizationId),
    index('invitation_email_idx').on(table.email),
  ],
);

export const passkey = pgTable(
  'passkey',
  {
    id: uuid('id')
      .$type<UUIDv7>()
      .default(sql`pg_catalog.uuidv7()`)
      .primaryKey(),
    name: text('name'),
    publicKey: text('public_key').notNull(),
    userId: uuid('user_id')
      .$type<UUIDv7>()
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    credentialID: text('credential_id').notNull(),
    counter: integer('counter').notNull(),
    deviceType: text('device_type').notNull(),
    backedUp: boolean('backed_up').notNull(),
    transports: text('transports'),
    ...timestamps,
    aaguid: text('aaguid'),
  },
  (table) => [
    index('passkey_userId_idx').on(table.userId),
    index('passkey_credentialID_idx').on(table.credentialID),
  ],
);

export const twoFactor = pgTable(
  'two_factor',
  {
    id: uuid('id')
      .$type<UUIDv7>()
      .default(sql`pg_catalog.uuidv7()`)
      .primaryKey(),
    secret: text('secret').notNull(),
    backupCodes: text('backup_codes').notNull(),
    userId: uuid('user_id')
      .$type<UUIDv7>()
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    verified: boolean('verified').default(true),
  },
  (table) => [
    index('twoFactor_secret_idx').on(table.secret),
    index('twoFactor_userId_idx').on(table.userId),
  ],
);

export const authRelations = defineRelationsPart(
  {
    user,
    session,
    account,
    organization,
    organizationRole,
    team,
    teamMember,
    member,
    invitation,
    passkey,
    twoFactor,
  },
  (r) => ({
    user: {
      sessions: r.many.session({ from: r.user.id, to: r.session.userId }),
      accounts: r.many.account({ from: r.user.id, to: r.account.userId }),
      teamMembers: r.many.teamMember({ from: r.user.id, to: r.teamMember.userId }),
      members: r.many.member({ from: r.user.id, to: r.member.userId }),
      invitations: r.many.invitation({ from: r.user.id, to: r.invitation.inviterId }),
      passkeys: r.many.passkey({ from: r.user.id, to: r.passkey.userId }),
      twoFactors: r.many.twoFactor({ from: r.user.id, to: r.twoFactor.userId }),
    },

    session: {
      user: r.one.user({ from: r.session.userId, to: r.user.id, optional: false }),
    },

    account: {
      user: r.one.user({ from: r.account.userId, to: r.user.id, optional: false }),
    },

    organization: {
      organizationRoles: r.many.organizationRole({
        from: r.organization.id,
        to: r.organizationRole.organizationId,
      }),
      teams: r.many.team({ from: r.organization.id, to: r.team.organizationId }),
      members: r.many.member({ from: r.organization.id, to: r.member.organizationId }),
      invitations: r.many.invitation({
        from: r.organization.id,
        to: r.invitation.organizationId,
      }),
    },

    organizationRole: {
      organization: r.one.organization({
        from: r.organizationRole.organizationId,
        to: r.organization.id,
        optional: false,
      }),
    },

    team: {
      organization: r.one.organization({
        from: r.team.organizationId,
        to: r.organization.id,
        optional: false,
      }),
      teamMembers: r.many.teamMember({ from: r.team.id, to: r.teamMember.teamId }),
    },

    teamMember: {
      team: r.one.team({ from: r.teamMember.teamId, to: r.team.id, optional: false }),
      user: r.one.user({ from: r.teamMember.userId, to: r.user.id, optional: false }),
    },

    member: {
      organization: r.one.organization({
        from: r.member.organizationId,
        to: r.organization.id,
        optional: false,
      }),
      user: r.one.user({ from: r.member.userId, to: r.user.id, optional: false }),
    },

    invitation: {
      organization: r.one.organization({
        from: r.invitation.organizationId,
        to: r.organization.id,
        optional: false,
      }),
      user: r.one.user({ from: r.invitation.inviterId, to: r.user.id, optional: false }),
    },

    passkey: {
      user: r.one.user({ from: r.passkey.userId, to: r.user.id, optional: false }),
    },

    twoFactor: {
      user: r.one.user({ from: r.twoFactor.userId, to: r.user.id, optional: false }),
    },
  }),
);
