import { ImageResponse } from 'next/og';
import {
  BRAND_NAME,
  DEFAULT_SITE_DESCRIPTION,
} from '@/lib/seo';

export const alt = 'PopBox Studio anime collectibles and Ichiban Kuji';
export const contentType = 'image/png';
export const size = {
  width: 1200,
  height: 630,
};

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          height: '100%',
          width: '100%',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background:
            'linear-gradient(135deg, rgb(255, 250, 252), rgb(255, 239, 244) 55%, rgb(246, 228, 235))',
          color: 'rgb(48, 26, 34)',
          padding: '56px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignSelf: 'flex-start',
            alignItems: 'center',
            borderRadius: '9999px',
            border: '1px solid rgba(88, 52, 63, 0.16)',
            backgroundColor: 'rgba(255, 255, 255, 0.7)',
            padding: '14px 22px',
            fontSize: 26,
            fontWeight: 700,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
          }}
        >
          Anime Store Canada
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            maxWidth: '920px',
          }}
        >
          <div
            style={{
              fontSize: 74,
              fontWeight: 800,
              letterSpacing: '-0.04em',
              lineHeight: 1,
            }}
          >
            {BRAND_NAME}
          </div>
          <div
            style={{
              fontSize: 34,
              lineHeight: 1.3,
              color: 'rgba(48, 26, 34, 0.84)',
            }}
          >
            {DEFAULT_SITE_DESCRIPTION}
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    },
  );
}
