# Pita - Slack Formatter

A browser extension that keeps lists, bold, links, and formatting when pasting into Slack from Notion and Google Docs.

## Features

- **Notion Support**: Preserves formatting when copying from Notion
- **Google Docs Support**: Maintains list formatting when copying from Google Docs
- **Slack Texty Format**: Converts clipboard content to Slack's native texty format
- **Cross-browser**: Works on Chrome and Firefox

## Installation

### From Source

1. Clone the repository:

   ```bash
   git clone https://github.com/ktym4a/pita.git
   cd pita
   ```

2. Install dependencies:

   ```bash
   pnpm install
   ```

3. Build the extension:

   ```bash
   # For Chrome
   pnpm build

   # For Firefox
   pnpm build:firefox
   ```

4. Load the extension:
   - **Chrome**: Go to `chrome://extensions/`, enable "Developer mode", click "Load unpacked", and select the `.output/chrome-mv3` folder
   - **Firefox**: Go to `about:debugging#/runtime/this-firefox`, click "Load Temporary Add-on", and select any file in the `.output/firefox-mv2` folder

## Development

### Prerequisites

- Node.js 18+
- pnpm

### Commands

```bash
# Start development server (Chrome)
pnpm dev

# Start development server (Firefox)
pnpm dev:firefox

# Run tests
pnpm test

# Run tests once
pnpm test:run

# Lint code
pnpm lint

# Format code
pnpm fmt

# Check lint and format
pnpm check

# Fix lint and format
pnpm check:fix

# Build for production
pnpm build
pnpm build:firefox

# Create zip for distribution
pnpm zip
pnpm zip:firefox
```

### Project Structure

```
pita/
├── entrypoints/          # Extension entry points
│   ├── background.ts     # Background script
│   ├── popup/            # Popup UI
│   ├── notion.content.ts # Notion content script
│   └── google-docs.content.ts # Google Docs content script
├── lib/
│   ├── core/             # Core functionality
│   │   ├── clipboard.ts  # Clipboard operations
│   │   ├── converter/    # HTML to Slack texty converter
│   │   └── content-script-factory.ts
│   ├── storage/          # Storage utilities
│   └── ui/               # UI components
├── providers/            # Service provider adapters
│   ├── notion/
│   ├── google-docs/
│   └── registry.ts       # Provider registry
├── public/               # Static assets
│   ├── icon/             # Extension icons
│   └── _locales/         # i18n messages
└── tests/                # Test files
```

## How It Works

1. When you copy content (Cmd/Ctrl+C) on Notion or Google Docs, Pita intercepts the clipboard
2. The HTML content is converted to Slack's texty format
3. The converted content is written back to the clipboard
4. Paste into Slack to see the formatted content

## Supported Formatting

- **Lists**: Ordered and unordered lists with proper indentation
- **Text Formatting**: Bold, italic, strikethrough, code
- **Links**: Hyperlinks with text
- **Block Quotes**: Quoted text
- **Code Blocks**: Multi-line code with syntax highlighting
- **Headings**: H1-H6 converted to bold text

## License

MIT License - see [LICENSE](LICENSE) for details
