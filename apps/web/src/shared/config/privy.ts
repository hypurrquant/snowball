export const PRIVY_CONFIG = {
  appId: process.env.NEXT_PUBLIC_PRIVY_APP_ID || "",
  loginMethods: ["email", "google", "wallet"] as const,
  appearance: {
    theme: "dark" as const,
    accentColor: "#60A5FA", // ice-400
  },
};

export const isPrivyEnabled = !!process.env.NEXT_PUBLIC_PRIVY_APP_ID;
