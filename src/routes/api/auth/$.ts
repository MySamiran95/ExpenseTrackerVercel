import { betterAuth } from "better-auth";

export const auth = betterAuth({
  emailAndPassword: {
    enabled: true,           // ← This is the key line
    requireEmailVerification: false,  // Change to true if you want email verification
  },
  // Keep any other options you already have (like plugins, database, etc.)
});
