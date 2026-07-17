import axios from 'axios';
import { revalidatePath } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';
import { resolveApiBaseUrl } from '@/configs/public-env';

const FEATURED_ORDER_PATH = '/api/v1/admin/collections/featured/order';

export const dynamic = 'force-dynamic';

function getProxyHeaders(request: NextRequest) {
  const authorization = request.headers.get('authorization');

  return authorization ? { Authorization: authorization } : {};
}

function proxyResponse(status: number, data: unknown) {
  return NextResponse.json(data, { status });
}

function proxyError(error: unknown) {
  if (axios.isAxiosError(error) && error.response) {
    return proxyResponse(error.response.status, error.response.data);
  }

  return NextResponse.json(
    {
      code: 502,
      success: false,
      message: 'Unable to reach the product service.',
      data: null,
    },
    { status: 502 },
  );
}

export async function GET(request: NextRequest) {
  try {
    const response = await axios.get(`${resolveApiBaseUrl()}${FEATURED_ORDER_PATH}`, {
      headers: getProxyHeaders(request),
      timeout: 15_000,
    });

    return proxyResponse(response.status, response.data);
  } catch (error) {
    return proxyError(error);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const response = await axios.put(
      `${resolveApiBaseUrl()}${FEATURED_ORDER_PATH}`,
      await request.json(),
      {
        headers: getProxyHeaders(request),
        timeout: 15_000,
      },
    );

    revalidatePath('/');
    revalidatePath('/collections/featured');

    return proxyResponse(response.status, response.data);
  } catch (error) {
    return proxyError(error);
  }
}
