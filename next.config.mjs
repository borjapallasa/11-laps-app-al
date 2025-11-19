/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'eleven-public-cdn.elevenlabs.io' },
      { protocol: 'https', hostname: 'api.elevenlabs.io' }
    ]
  }
};
export default nextConfig;

