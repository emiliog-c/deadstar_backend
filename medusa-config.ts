import { loadEnv, defineConfig } from '@medusajs/framework/utils'

loadEnv(process.env.NODE_ENV || 'development', process.cwd())

const requiredEnv = (name: string) => {
  const value = process.env[name]

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }

  return value
}

const isProduction = process.env.NODE_ENV === "production"
const isLocalProduction =
  isProduction &&
  process.env.MEDUSA_LOCAL_PROD === "true"
const shouldUseDbSsl =
  process.env.DB_SSL === "true" ||
  (isProduction && process.env.DB_SSL !== "false")
const dbSslRejectUnauthorized =
  process.env.DB_SSL_REJECT_UNAUTHORIZED === "true"

module.exports = defineConfig({
  projectConfig: {
    databaseUrl: requiredEnv("DATABASE_URL"),
    http: {
      storeCors: requiredEnv("STORE_CORS"),
      adminCors: requiredEnv("ADMIN_CORS"),
      authCors: requiredEnv("AUTH_CORS"),
      jwtSecret: requiredEnv("JWT_SECRET"),
      cookieSecret: requiredEnv("COOKIE_SECRET"),
    },
    cookieOptions: isLocalProduction
      ? {
          sameSite: "lax",
          secure: false,
        }
      : undefined,
    databaseDriverOptions: shouldUseDbSsl
      ? {
          connection: {
            ssl: {
              rejectUnauthorized: dbSslRejectUnauthorized,
            },
          },
        }
      : {
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
    {
      resolve: "@medusajs/medusa/notification",
      options: {
        providers: [
          // ...
          {
            resolve: "@medusajs/medusa/resend",
            id: "resend",
            options: {
              channels: ["email"],
              api_key: process.env.RESEND_API_KEY,
              from: process.env.RESEND_FROM_EMAIL,
            },
          },
        ],
      },
    },
  ],
})
