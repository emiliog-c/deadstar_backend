import { loadEnv, defineConfig } from '@medusajs/framework/utils'

loadEnv(process.env.NODE_ENV || 'development', process.cwd())

module.exports = defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    http: {
      storeCors: process.env.STORE_CORS!,
      adminCors: process.env.ADMIN_CORS!,
      authCors: process.env.AUTH_CORS!,
      jwtSecret: process.env.JWT_SECRET || "supersecret",
      cookieSecret: process.env.COOKIE_SECRET || "supersecret",
    },
    databaseDriverOptions: {
      ssl: false,
      sslmode: "disable",
    },
  },
  admin: {
    vite: (config) => {
      return {
        server: {
          host: "0.0.0.0",
          allowedHosts: [
            "localhost",
            ".localhost",
            "127.0.0.1",
          ],
          hmr: {
            host: "localhost",
            port: 5173,
            protocol: "ws",
          },
          fs: {
            allow: ["/", "/server", "/server/node_modules"],
            strict: false,
          },
          watch: {
            usePolling: true,
            interval: 1000,
          },
        },
        optimizeDeps: {
          include: ["react", "react-dom"],
          exclude: ["@medusajs/dashboard"],
          esbuildOptions: {
            define: {
              global: "globalThis",
            },
          },
        },
        build: {
          commonjsOptions: {
            transformMixedEsModules: true,
          },
        },
      }
    },
  },
  modules: [
    {
      resolve: "@medusajs/medusa/file",
      options: {
        providers: [
          {
            resolve: "@medusajs/medusa/file-s3",
            id: "s3",
            options: {
              file_url: process.env.R2_FILE_URL,
              access_key_id: process.env.R2_ACCESS_KEY_ID,
              secret_access_key: process.env.R2_SECRET_ACCESS_KEY,
              region: process.env.R2_REGION,
              bucket: process.env.R2_BUCKET,
              endpoint: process.env.R2_ENDPOINT,
              prefix: "product_images/",
            },
          },

        ],
      },
    },
    {
      resolve: "@medusajs/medusa/payment",
      options: {
        providers: [
          {
            resolve: "@medusajs/medusa/payment-stripe",
            id: "stripe",
            options: {
              apiKey: process.env.STRIPE_API_KEY,
            },
          },
        ],
      },
    },
  ],
})
