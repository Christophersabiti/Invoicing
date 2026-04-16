import type { NextConfig } from 'next';

const SECURITY_HEADERS = [
  // Prevent the page from being embedded in an iframe (clickjacking)
  { key: 'X-Frame-Options', value: 'DENY' },
  // Stop browsers sniffing the MIME type
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Only send the origin in the Referer header (no full URL)
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Enforce HTTPS for 2 years, include subdomains
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  // Disable unnecessary browser features
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
  // Basic XSS protection for older browsers
  { key: 'X-XSS-Protection', value: '1; mode=block' },
];

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'nimxzjoqgxzeuxpksdrn.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },

  async headers() {
    return [
      {
        // Apply to all routes
        source: '/(.*)',
        headers: SECURITY_HEADERS,
      },
    ];
  },
};

export default nextConfig;
