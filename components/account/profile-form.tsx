'use client';

import { useMemo, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { useCustomerAuth } from '@/components/auth/customer-auth-provider';
import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import MutationConfigs from '@/configs/api/mutation-config';
import type { IAccountProfile, IAccountProfilePatch } from '@/interfaces/account';
import { createClient } from '@/lib/supabase/client';

function normalizeOptional(value: string): string | null {
  return value.trim() || null;
}

export function ProfileForm({ initialProfile }: { initialProfile: IAccountProfile }) {
  const router = useRouter();
  const auth = useCustomerAuth();
  const [profile, setProfile] = useState(initialProfile);
  const [firstName, setFirstName] = useState(initialProfile.profile.firstName ?? '');
  const [lastName, setLastName] = useState(initialProfile.profile.lastName ?? '');
  const [phone, setPhone] = useState(initialProfile.profile.phone ?? '');
  const [isSaving, setIsSaving] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [error, setError] = useState('');

  const patch = useMemo(() => {
    const nextPatch: IAccountProfilePatch = {};
    const values = {
      firstName: normalizeOptional(firstName),
      lastName: normalizeOptional(lastName),
      phone: normalizeOptional(phone),
    };

    (Object.keys(values) as Array<keyof typeof values>).forEach((key) => {
      if (values[key] !== profile.profile[key]) {
        nextPatch[key] = values[key];
      }
    });

    return nextPatch;
  }, [firstName, lastName, phone, profile]);
  const isDirty = Object.keys(patch).length > 0;
  const isMissingDetails = !profile.profile.firstName && !profile.profile.lastName && !profile.profile.phone;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isDirty) return;
    setIsSaving(true);
    setError('');
    try {
      const response = await MutationConfigs.patchAccountProfile(patch);
      setProfile(response.data.data);
      await auth.refresh();
      toast.success('Profile saved.');
    } catch {
      setError('We could not save your profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const sendPasswordReset = async () => {
    setIsSendingReset(true);
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent('/account/reset-password')}`;
    await createClient().auth.resetPasswordForEmail(profile.account.email, { redirectTo });
    setIsSendingReset(false);
    toast.success('Check your email for a password reset link.');
  };

  const signOut = async () => {
    await auth.signOut();
    router.replace('/');
    router.refresh();
  };

  return (
    <div className="max-w-2xl">
      <h1 className="text-3xl font-semibold tracking-tight">Profile</h1>
      {isMissingDetails ? <p className="mt-4 rounded-lg bg-muted px-4 py-3 text-sm leading-6 text-muted-foreground">Add your name and phone number for a faster checkout.</p> : null}
      <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
        <Field>
          <FieldLabel htmlFor="profile-email">Email</FieldLabel>
          <div className="relative">
            <Input id="profile-email" value={profile.account.email} readOnly className="pr-28" />
            <span className="absolute inset-y-0 right-3 flex items-center gap-1 text-xs font-medium text-emerald-700"><CheckCircle2 className="h-3.5 w-3.5" />Verified</span>
          </div>
        </Field>
        <FieldGroup className="sm:grid sm:grid-cols-2">
          <Field><FieldLabel htmlFor="profile-first-name">First Name</FieldLabel><Input id="profile-first-name" autoComplete="given-name" maxLength={120} value={firstName} onChange={(event) => setFirstName(event.target.value)} /></Field>
          <Field><FieldLabel htmlFor="profile-last-name">Last Name</FieldLabel><Input id="profile-last-name" autoComplete="family-name" maxLength={120} value={lastName} onChange={(event) => setLastName(event.target.value)} /></Field>
        </FieldGroup>
        <Field><FieldLabel htmlFor="profile-phone">Phone</FieldLabel><Input id="profile-phone" type="tel" autoComplete="tel" maxLength={40} value={phone} onChange={(event) => setPhone(event.target.value)} /></Field>
        <FieldError>{error}</FieldError>
        <Button type="submit" disabled={!isDirty || isSaving}>{isSaving ? <Spinner className="mr-2" /> : null}Save Changes</Button>
      </form>

      {auth.providers.length > 0 ? (
        <section className="mt-12 border-t border-border pt-8">
          <h2 className="text-lg font-semibold">Connected Accounts</h2>
          <div className="mt-4 flex flex-wrap gap-2 text-sm text-muted-foreground">
            {auth.providers.includes('email') ? <span className="rounded-full border border-border px-3 py-1.5">Email</span> : null}
            {auth.providers.includes('google') ? <span className="rounded-full border border-border px-3 py-1.5">Google</span> : null}
          </div>
        </section>
      ) : null}

      <section className="mt-12 border-t border-border pt-8">
        <h2 className="text-lg font-semibold">Security</h2>
        <div className="mt-5 flex flex-wrap gap-3">
          <Button type="button" variant="outline" disabled={isSendingReset} onClick={sendPasswordReset}>{isSendingReset ? <Spinner className="mr-2" /> : null}Change Password</Button>
          <Button type="button" variant="ghost" className='rounded-full' onClick={signOut}>Sign Out</Button>
        </div>
      </section>
    </div>
  );
}
