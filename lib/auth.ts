import { betterAuth } from "better-auth";
import { Resend } from "resend";
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL!, {
  ssl: "require",
});

const resend = new Resend(process.env.RESEND_API_KEY);

export const auth = betterAuth({
  database: {
    db: sql,
    type: "postgres",
  },

  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,

    sendResetPassword: async ({ user, url }) => {
      await resend.emails.send({
        from: "Vendor Maps <noreply@vendormaps.net>",
        to: user.email,
        subject: "Reset your Vendor Maps password",
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
        from: "Vendor Maps <noreply@vendormaps.net>",
        to: user.email,
        subject: "Verify your Vendor Maps email",
        html: `
          <h2>Welcome to Vendor Maps</h2>
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
