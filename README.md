# ProcrastiCode

Your developer break-time companion for VS Code — jokes, trivia, cute animals, tech news, and YouTube right in your editor.

## Features

| Feature | Description |
|---------|-------------|
| **Dad Jokes** | Random dad jokes on demand |
| **Chuck Norris Facts** | Programming-themed Chuck Norris jokes |
| **Cute Animals** | Random cat/dog images for motivation |
| **Useless Facts** | "Did you know?" random fun facts |
| **Trivia Quiz** | Multiple-choice trivia with score tracking |
| **Reddit Feed** | Hot posts from r/technology, r/programming, r/webdev, r/gadgets |
| **Dev.to** | Trending developer articles |
| **Lobsters** | Top tech stories from lobste.rs |
| **YouTube** | Search, browse trending videos inside VS Code |
| **Status Bar** | Click the smiley for an instant joke notification |

## Quick Start

### Prerequisites

- [VS Code](https://code.visualstudio.com/) v1.85 or later
- [Node.js](https://nodejs.org/) v18 or later
- npm (comes with Node.js)

### Install from Source

```bash
# 1. Clone or navigate to the project
cd procrasticode

# 2. Install dependencies
npm install

# 3. Compile TypeScript
npm run compile

# 4. Package into a .vsix file
npx @vscode/vsce package --allow-missing-repository

# 5. Install the extension into VS Code
code --install-extension procrasticode-0.0.1.vsix
```

### Reload VS Code

After installing, reload VS Code to activate the extension:

- Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac)
- Type **"Developer: Reload Window"** and press Enter

## How to Use

### Sidebar

Look for the **smiley face icon** in the left activity bar. It has two sections:

- **Jokes & Facts** — Click any item to get a joke or fun fact as a popup notification
- **Reddit Feed** — Expand subreddits to see hot posts. Click any post to open it in your browser. Also includes Dev.to and Lobsters feeds.

### Dashboard

Open the full dashboard:

1. Press `Ctrl+Shift+P`
2. Type **"ProcrastiCode: Open Dashboard"**
3. Press Enter

The dashboard has two tabs:

- **Fun Stuff** — Jokes, cute animal pics, useless facts, trivia quiz
- **YouTube** — Search for videos, browse trending, watch inside VS Code

### Status Bar

Click **`$(smiley) ProcrastiCode`** at the bottom-right of VS Code for an instant random joke popup.

## YouTube Setup (Optional)

YouTube features require a free Google API key. Without it, all other features still work perfectly.

### Get Your Free YouTube API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or use an existing one)
3. Go to **APIs & Services** > **Library**
4. Search for **"YouTube Data API v3"** and click **Enable**
5. Go to **APIs & Services** > **Credentials**
6. Click **"+ CREATE CREDENTIALS"** > **"API key"**
7. Copy the API key

### Add the Key to VS Code

1. Open VS Code Settings (`Ctrl+,`)
2. Search for **"procrasticode"**
3. Paste your API key into the **"Youtube Api Key"** field

The free tier gives you **10,000 units/day** which is plenty for personal use (a search costs ~100 units).

## Development

### Run in Debug Mode

1. Open the `procrasticode` folder in VS Code
2. Press **F5** to launch the Extension Development Host
3. A new VS Code window opens with your extension loaded
4. Make changes to the source code and reload (`Ctrl+R` in the dev window) to see updates

### Watch Mode

```bash
npm run watch
```

This auto-compiles TypeScript on every file save.

### Rebuild & Reinstall

After making changes:

```bash
npm run compile
npx @vscode/vsce package --allow-missing-repository
code --install-extension procrasticode-0.0.1.vsix --force
```

Then reload VS Code.

## Project Structure

```
procrasticode/
├── src/
│   ├── extension.ts          # Main entry point — registers commands, providers
│   ├── statusbar.ts          # Status bar joke button
│   ├── api/
│   │   └── apis.ts           # All API functions (jokes, facts, Reddit, YouTube, etc.)
│   ├── sidebar/
│   │   ├── jokesProvider.ts  # TreeDataProvider for Jokes & Facts
│   │   └── newsProvider.ts   # TreeDataProvider for Reddit/Dev.to/Lobsters feeds
│   └── webview/
│       └── dashboard.ts      # Webview panel with HTML dashboard + YouTube player
├── media/
│   └── icon.svg              # Activity bar icon
├── package.json              # Extension manifest
├── tsconfig.json             # TypeScript config
└── .vscode/
    └── launch.json           # F5 debug config
```

## APIs Used

All APIs are free. Only YouTube requires an API key.

| Source | API | Auth |
|--------|-----|------|
| Dad Jokes | icanhazdadjoke.com | None |
| Chuck Norris | api.chucknorris.io | None |
| Dog Images | dog.ceo | None |
| Cat Images | cataas.com | None |
| Useless Facts | uselessfacts.jsph.pl | None |
| Trivia | opentdb.com | None |
| Reddit | reddit.com JSON | None |
| Dev.to | dev.to/api | None |
| Lobsters | lobste.rs | None |
| YouTube | googleapis.com | Free API key |

## Uninstall

```bash
code --uninstall-extension samuel.procrasticode
```

Or go to VS Code Extensions panel, find ProcrastiCode, and click Uninstall.
