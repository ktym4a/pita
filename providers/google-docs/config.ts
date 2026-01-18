import type { ProviderConfig } from "@/providers/_shared/types";

export const googleDocsConfig: ProviderConfig = {
  id: "google-docs",
  name: "Google Docs",
  urlPatterns: [/^https:\/\/docs\.google\.com\//],
  contentScriptMatches: ["*://docs.google.com/*"],
  hostPermissions: ["https://docs.google.com/*"],
};
