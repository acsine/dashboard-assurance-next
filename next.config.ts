import { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const canonicalApiUrl = process.env.API_URL?.replace(/\/+$/, '')
const legacyPublicApiUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, '')

if (canonicalApiUrl && legacyPublicApiUrl && canonicalApiUrl !== legacyPublicApiUrl) {
  throw new Error(
    'Configuration backend divergente : utilisez uniquement API_URL (NEXT_PUBLIC_API_URL ne doit pas pointer ailleurs).',
  )
}

const nextConfig: NextConfig = {
  // Compatibilité des écrans publics existants : la valeur publique est dérivée de l'unique
  // variable canonique API_URL au moment du build, sans dupliquer la configuration.
  env: {
    NEXT_PUBLIC_API_URL: canonicalApiUrl,
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ]
  },
};

const withNextIntl = createNextIntlPlugin();
export default withNextIntl(nextConfig);