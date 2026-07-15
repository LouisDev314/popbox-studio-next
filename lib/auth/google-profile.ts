import type { User } from '@supabase/supabase-js';
import type { IAccountProfile, IAccountProfilePatch } from '@/interfaces/account';

export interface IGoogleProfileName {
  firstName: string | null;
  lastName: string | null;
}

function readString(source: Record<string, unknown> | undefined, key: string): string | null {
  const value = source?.[key];
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function splitFullName(fullName: string | null): IGoogleProfileName {
  const segments = fullName?.split(/\s+/).filter(Boolean) ?? [];
  return {
    firstName: segments[0] ?? null,
    lastName: segments.length > 1 ? segments.slice(1).join(' ') : null,
  };
}

export function getGoogleProfileName(user: User): IGoogleProfileName {
  const googleIdentity = user.identities?.find((identity) => identity.provider === 'google');
  const identityData = googleIdentity?.identity_data as Record<string, unknown> | undefined;
  const userMetadata = user.user_metadata as Record<string, unknown> | undefined;
  const firstName = readString(identityData, 'given_name') ?? readString(userMetadata, 'given_name');
  const lastName = readString(identityData, 'family_name') ?? readString(userMetadata, 'family_name');

  if (firstName || lastName) {
    return { firstName, lastName };
  }

  return splitFullName(
    readString(identityData, 'full_name')
    ?? readString(identityData, 'name')
    ?? readString(userMetadata, 'full_name')
    ?? readString(userMetadata, 'name'),
  );
}

export function buildMissingGoogleNamePatch(
  profile: IAccountProfile,
  googleName: IGoogleProfileName,
): IAccountProfilePatch {
  const patch: IAccountProfilePatch = {};

  if (!profile.profile.firstName?.trim() && googleName.firstName) {
    patch.firstName = googleName.firstName;
  }

  if (!profile.profile.lastName?.trim() && googleName.lastName) {
    patch.lastName = googleName.lastName;
  }

  return patch;
}
