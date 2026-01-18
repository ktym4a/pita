# Pita - Slack Formatter

A Chrome extension that paste into Slack without losing formatting — supports Notion and Google Docs.

## Features

- **Notion Support**: Preserves formatting when copying from Notion
- **Google Docs Support**: Maintains list formatting when copying from Google Docs
- **Slack Texty Format**: Converts clipboard content to Slack's native texty format
- **Per-site Toggle**: Enable/disable conversion for each supported site

## Installation

### From Chrome Web Store

Coming soon.

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
   pnpm build
   ```

4. Load the extension:
   - Go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `.output/chrome-mv3` folder

## Development

### Prerequisites

- Node.js 24+
- pnpm 10+

### Commands

```bash
# Start development server
pnpm dev

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

# Create zip for distribution
pnpm zip
```

### Release Process

This project uses [Changesets](https://github.com/changesets/changesets) for version management.

```bash
# Add a changeset after making changes
pnpm changeset

# Version packages (usually done by CI)
pnpm version
```

### Project Structure

```
pita/
├── entrypoints/              # Extension entry points
│   ├── background.ts         # Background service worker
│   ├── popup/                # Popup UI
│   ├── notion.content.ts     # Notion content script
│   └── google-docs.content.ts
├── lib/
│   ├── background/           # Background script utilities
│   │   ├── badge.ts          # Badge and icon state management
│   │   └── icon.ts           # Dynamic icon generation
│   ├── core/                 # Core functionality
│   │   ├── clipboard.ts      # Clipboard operations
│   │   ├── converter/        # HTML to Slack texty converter
│   │   └── content-script-factory.ts
│   ├── popup/                # Popup UI logic
│   ├── storage/              # Storage utilities
│   └── ui/                   # UI components
├── providers/                # Service provider adapters
│   ├── _shared/              # Shared provider utilities
│   ├── notion/
│   ├── google-docs/
│   └── registry.ts           # Provider registry
├── public/                   # Static assets
│   ├── icon/                 # Extension icons
│   └── _locales/             # i18n messages
└── tests/                    # Test files
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
