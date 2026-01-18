import { defineConfig } from "wxt";

import { version } from "./package.json";

export default defineConfig({
  analysis: {
    enabled: true,
    open: false,
  },
  manifest: {
    version,
    name: "__MSG_extensionName__",
    description: "__MSG_extensionDescription__",
    default_locale: "en",
    icons: {
      16: "icon/16.png",
      32: "icon/32.png",
      48: "icon/48.png",
      96: "icon/96.png",
      128: "icon/128.png",
    },
    permissions: ["storage", "clipboardRead", "clipboardWrite", "tabs"],
    host_permissions: ["https://*.notion.so/*", "https://notion.so/*", "https://docs.google.com/*"],
    content_security_policy: {
      extension_pages: "script-src 'self'; object-src 'self'",
    },
  },
});
