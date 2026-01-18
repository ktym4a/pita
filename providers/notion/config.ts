import type { ProviderConfig } from "@/providers/_shared/types";

export const notionConfig: ProviderConfig = {
  id: "notion",
  name: "Notion",
  urlPatterns: [/^https:\/\/(www\.)?notion\.so\//],
  contentScriptMatches: ["*://*.notion.so/*", "*://notion.so/*"],
  hostPermissions: ["https://www.notion.so/*", "https://notion.so/*"],
};
