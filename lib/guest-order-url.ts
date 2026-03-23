const GUEST_ORDER_TOKEN_PARAM = 'token';

function toUrl(url: string) {
  return new URL(url, 'http://localhost');
}

export function getGuestOrderTokenParamName() {
  return GUEST_ORDER_TOKEN_PARAM;
}

export function appendGuestOrderToken(pathname: string, token?: string) {
  if (!token) {
    return pathname;
  }

  const searchParams = new URLSearchParams({
    [GUEST_ORDER_TOKEN_PARAM]: token,
  });

  return `${pathname}?${searchParams.toString()}`;
}

export function getRelativeGuestOrderUrl(url: string) {
  const parsedUrl = toUrl(url);

  return `${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}`;
}

export function getRelativeGuestTicketsUrl(url: string) {
  const parsedUrl = toUrl(url);
  const pathname = parsedUrl.pathname.endsWith('/')
    ? `${parsedUrl.pathname}tickets`
    : `${parsedUrl.pathname}/tickets`;

  return `${pathname}${parsedUrl.search}${parsedUrl.hash}`;
}
