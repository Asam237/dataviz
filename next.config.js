/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configuration spécifique pour Neovim et autres éditeurs
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        poll: 500, // Polling plus fréquent
        aggregateTimeout: 100, // Délai plus court
        ignored: /node_modules/,
        followSymlinks: true,
      };
      // Force le rechargement pour Neovim
      config.snapshot = {
        managedPaths: [],
      };
    }
    return config;
  },
  // Mode strict React
  reactStrictMode: true,
  // Configuration pour améliorer la détection des changements
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },
  // Optimisations Turbo
  experimental: {
    turbo: {
      rules: {
        "*.svg": {
          loaders: ["@svgr/webpack"],
          as: "*.js",
        },
      },
    },
  },
  // Forcer le rechargement des pages
  generateEtags: false,
  poweredByHeader: false,
};

module.exports = nextConfig;
