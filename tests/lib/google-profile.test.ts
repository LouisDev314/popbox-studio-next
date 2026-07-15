import type { User } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';
import { buildMissingGoogleNamePatch, getGoogleProfileName } from '@/lib/auth/google-profile';
import type { IAccountProfile } from '@/interfaces/account';

function createUser(identityData: Record<string, unknown>, metadata: Record<string, unknown> = {}) {
  return {
    identities: [{ provider: 'google', identity_data: identityData }],
    user_metadata: metadata,
  } as unknown as User;
}

function createProfile(firstName: string | null, lastName: string | null): IAccountProfile {
  return {
    account: { id: 'account', email: 'user@example.com', emailVerified: true, createdAt: '2026-01-01T00:00:00Z' },
    profile: { firstName, lastName, phone: null, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
  };
}

describe('Google profile names', () => {
  it('prefers given and family names', () => {
    expect(getGoogleProfileName(createUser({ given_name: 'Ada', family_name: 'Lovelace', full_name: 'Ignored Name' }))).toEqual({ firstName: 'Ada', lastName: 'Lovelace' });
  });

  it('splits full and single-part names safely', () => {
    expect(getGoogleProfileName(createUser({ full_name: 'Louis Chan' }))).toEqual({ firstName: 'Louis', lastName: 'Chan' });
    expect(getGoogleProfileName(createUser({ name: 'Madonna' }))).toEqual({ firstName: 'Madonna', lastName: null });
  });

  it('ignores invalid metadata', () => {
    expect(getGoogleProfileName(createUser({ full_name: 123 }))).toEqual({ firstName: null, lastName: null });
  });

  it('patches only blank backend values', () => {
    expect(buildMissingGoogleNamePatch(createProfile('Edited', null), { firstName: 'Google', lastName: 'Name' })).toEqual({ lastName: 'Name' });
  });
});
