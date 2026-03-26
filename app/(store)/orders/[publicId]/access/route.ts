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

function appendSetCookieHeaders(response: NextResponse, setCookieHeaders: string[] | undefined) {
  if (!Array.isArray(setCookieHeaders)) {
    return;
  }

  for (const setCookieHeader of setCookieHeaders) {
    response.headers.append('Set-Cookie', setCookieHeader);
  }
}

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

    const setCookieHeaders = upstreamResponse.headers['set-cookie'];
    const isSuccessfulAccess = upstreamResponse.status >= 200 && upstreamResponse.status < 400;

    const response = NextResponse.redirect(
      new URL(isSuccessfulAccess ? destinationPath : failurePath, request.url),
    );

    appendSetCookieHeaders(response, setCookieHeaders);

    return response;
  } catch {
    return NextResponse.redirect(new URL(failurePath, request.url));
  }
}
