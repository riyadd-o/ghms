/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  async redirects() {
    return [
      {
        source: "/admin-login",
        destination: "/staff-login",
        permanent: false,
      },
      {
        source: "/admin/login",
        destination: "/staff-login",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
