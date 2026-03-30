import type { NextConfig } from 'next';
import getPublicEnvConfig from '@/configs/public-env';

const nextConfig: NextConfig = {
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: '/orders/:publicId',
          has: [
            {
              type: 'query',
              key: 'token',
              value: '(?<token>.*)',
            },
          ],
          missing: [
            {
              type: 'query',
              key: 'handoff',
            },
          ],
          destination: '/orders/:publicId/access?next=order&token=:token',
        },
        {
          source: '/orders/:publicId/tickets',
          has: [
            {
              type: 'query',
              key: 'token',
              value: '(?<token>.*)',
            },
          ],
          missing: [
            {
              type: 'query',
              key: 'handoff',
            },
          ],
          destination: '/orders/:publicId/access?next=tickets&token=:token',
        },
      ],
      afterFiles: [
        {
          source: '/api/:path*',
          destination: `${getPublicEnvConfig().apiBaseUrl}/api/:path*`,
        },
      ],
      fallback: [],
    };
  },

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'bpclnekuanwtojarniyc.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
};

export default nextConfig;
