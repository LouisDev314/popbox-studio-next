import axios from 'axios';
import { NextRequest, NextResponse } from 'next/server';
import getEnvConfig from '@/configs/env';
import {
  getGuestOrderPath,
  getGuestTokenEntryPath,
  getGuestTicketsPath,
  normalizeGuestAccessNext,
} from '../guest-order-routing';

type RouteContext = {
  params: Promise<{ publicId: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const { publicId } = await context.params;
  const token = request.nextUrl.searchParams.get('token');
  const nextTarget = normalizeGuestAccessNext(request.nextUrl.searchParams.get('next'));
  const destinationPath =
    nextTarget === 'tickets' ? getGuestTicketsPath(publicId) : getGuestOrderPath(publicId);
  const failurePath = token
    ? getGuestTokenEntryPath(publicId, nextTarget, token, 'failed')
    : destinationPath;

  if (!token) {
    return NextResponse.redirect(new URL(destinationPath, request.url));
  }

  const accessUrl = new URL(
    `/api/v1/orders/${encodeURIComponent(publicId)}/access`,
    getEnvConfig().apiBaseUrl,
  );
  accessUrl.searchParams.set('token', token);

  try {
    const upstreamResponse = await axios.get(accessUrl.toString(), {
      headers: request.headers.get('cookie')
        ? {
          Cookie: request.headers.get('cookie') as string,
        }
        : undefined,
      maxRedirects: 0,
      validateStatus: () => true,
    });

    const response = NextResponse.redirect(new URL(destinationPath, request.url));
    const setCookieHeaders = upstreamResponse.headers['set-cookie'];
    const isSuccessfulAccess = upstreamResponse.status >= 200 && upstreamResponse.status < 400;

    if (!isSuccessfulAccess) {
      const failureResponse = NextResponse.redirect(new URL(failurePath, request.url));

      if (Array.isArray(setCookieHeaders)) {
        for (const setCookieHeader of setCookieHeaders) {
          failureResponse.headers.append('Set-Cookie', setCookieHeader);
        }
      } else if (typeof setCookieHeaders === 'string') {
        failureResponse.headers.append('Set-Cookie', setCookieHeaders);
      }

      return failureResponse;
    }

    if (Array.isArray(setCookieHeaders)) {
      for (const setCookieHeader of setCookieHeaders) {
        response.headers.append('Set-Cookie', setCookieHeader);
      }
    }

    return response;
  } catch {
    return NextResponse.redirect(new URL(failurePath, request.url));
  }
}
