/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        remotePatterns: [
            { protocol: 'https', hostname: '**' },
        ],
    },
    experimental: {
        serverActions: { allowedOrigins: ['localhost:3000'] },
        serverComponentsExternalPackages: ['undici', 'cheerio', '@napi-rs/canvas'],
    },
};

module.exports = nextConfig;
