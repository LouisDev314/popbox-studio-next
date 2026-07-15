import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('server customer access separation', () => {
  it('maps non-customer identities to signed out and contains no admin redirects', () => {
    const source = readFileSync(resolve(process.cwd(), 'lib/auth/customer-session.ts'), 'utf8');

    expect(source).toContain('code === \'CUSTOMER_ACCOUNT_REQUIRED\'');
    expect(source).toContain('return { status: \'signedOut\' }');
    expect(source).not.toContain('redirect(\'/admin\')');
    expect(source).not.toContain('status: \'nonCustomer\'');
  });
});
