import axios from 'axios';
import { revalidatePath } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';
import { resolveApiBaseUrl } from '@/configs/public-env';

const COLLECTION_REORDER_PATH = '/api/v1/admin/collections/reorder';

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

export async function PATCH(request: NextRequest) {
  try {
    const response = await axios.patch(
      `${resolveApiBaseUrl()}${COLLECTION_REORDER_PATH}`,
      await request.json(),
      {
        headers: getProxyHeaders(request),
        timeout: 15_000,
      },
    );

    revalidatePath('/', 'layout');

    return proxyResponse(response.status, response.data);
  } catch (error) {
    return proxyError(error);
  }
}
