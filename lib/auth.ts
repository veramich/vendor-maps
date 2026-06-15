import { betterAuth } from "better-auth";
import { Resend } from "resend";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: true,
});

const resend = new Resend(process.env.RESEND_API_KEY);

export const auth = betterAuth({
  database: pool,

  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,

  user: {
    fields: {
      emailVerified: "email_verified",
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  },
  session: {
    fields: {
      expiresAt: "expires_at",
      createdAt: "created_at",
      updatedAt: "updated_at",
      ipAddress: "ip_address",
      userAgent: "user_agent",
      userId: "user_id",
    },
  },
  account: {
    fields: {
      accountId: "account_id",
      providerId: "provider_id",
      userId: "user_id",
      accessToken: "access_token",
      refreshToken: "refresh_token",
      idToken: "id_token",
      accessTokenExpiresAt: "access_token_expires_at",
      refreshTokenExpiresAt: "refresh_token_expires_at",
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  },
  verification: {
    fields: {
      expiresAt: "expires_at",
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  },

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,

    sendResetPassword: async ({ user, url }) => {
      await resend.emails.send({
        from: "VendorMaps <noreply@vendormaps.net>",
        to: user.email,
        subject: "Reset your VendorMaps password",
        html: `
          <h2>Reset your password</h2>
          <p>Click the link below to reset
             your password. Expires in 1 hour.</p>
          <a href="${url}">Reset Password</a>
          <p>If you did not request this
             ignore this email.</p>
        `,
      });
    },
  },

  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,

    sendVerificationEmail: async ({ user, url }) => {
      await resend.emails.send({
        from: "VendorMaps <noreply@vendormaps.net>",
        to: user.email,
        subject: "Verify your VendorMaps email",
        html: `
          <h2>Welcome to VendorMaps</h2>
          <p>Click the link below to verify
             your email address.</p>
          <a href="${url}">Verify Email</a>
          <p>If you did not create an account
             ignore this email.</p>
        `,
      });
    },
  },

  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },
});
