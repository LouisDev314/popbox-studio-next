interface IShareProductInput {
  title: string;
  description?: string | null;
  url: string;
}

type TShareProductResult =
  | { status: 'shared' }
  | { status: 'copied' }
  | { status: 'failed' };

function getShareText(title: string, description?: string | null) {
  const trimmedDescription = description?.trim();

  if (trimmedDescription) {
    return trimmedDescription;
  }

  return `Check out ${title} at PopBox Studio.`;
}

export async function shareProduct({ title, description, url }: IShareProductInput): Promise<TShareProductResult> {
  const text = getShareText(title, description);

  try {
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      await navigator.share({
        title,
        text,
        url,
      });

      return { status: 'shared' };
    }

    if (typeof navigator !== 'undefined' && typeof navigator.clipboard?.writeText === 'function') {
      await navigator.clipboard.writeText(url);

      return { status: 'copied' };
    }
  } catch {
    return { status: 'failed' };
  }

  return { status: 'failed' };
}
