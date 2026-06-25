import { boolean, index, jsonb, pgTable, timestamp, varchar } from 'drizzle-orm/pg-core';

import type { NWM_Member } from '@kws/types';

import { tsvector } from '../../plugins/tsvector';
import { softDelete, timestamps } from '../common.schema';

// ---------------------------------------------------------------------------
// members (agents/brokers)
// ---------------------------------------------------------------------------

export const members = pgTable(
  'members',
  {
    memberMlsId: varchar('member_mls_id', { length: 25 }).primaryKey(),
    memberKey: varchar('member_key', { length: 255 }),
    originatingSystemName: varchar('originating_system_name', {
      length: 255,
    }).default('nwmls'),

    memberFirstName: varchar('member_first_name', { length: 50 }),
    memberFullName: varchar('member_full_name', { length: 150 }),
    memberLastName: varchar('member_last_name', { length: 50 }),
    memberMiddleName: varchar('member_middle_name', { length: 50 }),
    memberNickname: varchar('member_nickname', { length: 50 }),
    memberOfficePhone: varchar('member_office_phone', { length: 16 }),
    memberOfficePhoneExt: varchar('member_office_phone_ext', { length: 10 }),
    memberStateLicense: varchar('member_state_license', { length: 50 }),
    memberStatus: varchar('member_status', { length: 25 }),
    memberType: varchar('member_type', { length: 50 }),

    officeKey: varchar('office_key', { length: 255 }),
    officeMlsId: varchar('office_mls_id', { length: 25 }),

    mlgCanUse: varchar('mlg_can_use', { length: 1024 }).array().default([]),

    modificationTimestamp: timestamp('modification_timestamp', {
      withTimezone: true,
    }),
    mlgCanView: boolean('mlg_can_view').default(true),

    // ---- NWMLS Local Metadata ----
    NWM: jsonb('nwm').$type<NWM_Member>(),

    ...timestamps,
    ...softDelete,

    // Full-text search vector
    // Keep this last in the column map
    searchVector: tsvector('search_vector')
      .language('english')
      .cols([
        'member_full_name',
        'member_first_name',
        'member_last_name',
        'member_middle_name',
        'member_nickname',
        'member_mls_id',
        'member_key',
      ])
      .weight('A')
      .cols(['member_state_license', 'office_mls_id', 'office_key'])
      .weight('B')
      .cols(['member_type', 'member_status', 'member_office_phone', 'member_office_phone_ext'])
      .weight('C')
      .cols(['mlg_can_use'])
      .weight('D')
      .array(),
  },
  (t) => [
    index('idx_members_sync').on(t.originatingSystemName, t.modificationTimestamp),
    index('idx_members_name').on(t.memberFullName),
    index('idx_members_key').on(t.memberKey),
    index('idx_members_office').on(t.officeKey),
    index('idx_members_search_vector').using('gin', t.searchVector),
  ],
);

export type TMlsMember = typeof members.$inferSelect;

/*
*** REFERENCE OData EDMX for Members from RESO Web API ***
<EntityType Name="Member">
    <Key>
        <PropertyRef Name="MemberMlsId"/>
    </Key>
    <Property Name="MemberFirstName" Type="Edm.String" MaxLength="50"/>
    <Property Name="MemberFullName" Type="Edm.String" MaxLength="150"/>
    <Property Name="MemberKey" Type="Edm.String" MaxLength="255"/>
    <Property Name="MemberLastName" Type="Edm.String" MaxLength="50"/>
    <Property Name="MemberMiddleName" Type="Edm.String" MaxLength="50"/>
    <Property Name="MemberMlsId" Type="Edm.String" MaxLength="25"/>
    <Property Name="MemberNickname" Type="Edm.String" MaxLength="50"/>
    <Property Name="MemberOfficePhone" Type="Edm.String" MaxLength="16"/>
    <Property Name="MemberOfficePhoneExt" Type="Edm.String" MaxLength="10"/>
    <Property Name="MemberStateLicense" Type="Edm.String" MaxLength="50"/>
    <Property Name="MemberStatus" Type="Edm.String" MaxLength="25">
        <Annotation Term="RESO.OData.Metadata.LookupName" String="MemberStatus"/>
    </Property>
    <Property Name="MemberType" Type="Edm.String" MaxLength="50">
        <Annotation Term="RESO.OData.Metadata.LookupName" String="MemberType"/>
    </Property>
    <Property Name="MlgCanUse" Type="Collection(Edm.String)" MaxLength="1024">
        <Annotation Term="MLS.OData.Metadata.MLSGRID" String="Allowed use case groups"/>
        <Annotation String="https://docs.mlsgrid.com/#mlgcanuse" Term="MLSGRID.Docs"/>
    </Property>
    <Property Name="MlgCanView" Type="Edm.Boolean" >
        <Annotation Term="MLS.OData.Metadata.MLSGRID" String="Delete flag"/>
    </Property>
    <Property Name="ModificationTimestamp" Type="Edm.DateTimeOffset" Precision="27"/>
    <Property Name="OfficeKey" Type="Edm.String" MaxLength="255"/>
    <Property Name="OfficeMlsId" Type="Edm.String" MaxLength="25"/>
    <Property Name="OriginatingSystemName" Type="Edm.String" MaxLength="255"/>
    <NavigationProperty Name="Media" Type="Collection(com.mlsgrid.metadata.Media)" />
</EntityType>
 */
