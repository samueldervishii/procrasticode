# ProcrastiCode

Your developer break-time companion for VS Code — jokes, trivia, cute animals, tech news, PDF/Word viewer, and Claude AI chat right in your editor.

## Installation

```bash
git clone https://github.com/your-username/procrasticode.git
cd procrasticode
npm install
npm run compile
npx @vscode/vsce package --allow-missing-repository
code --install-extension procrasticode-0.0.2.vsix --force
```

Then reload VS Code: `Ctrl+Shift+P` > "Developer: Reload Window"

## Features

**Sidebar** — Click the ProcrastiCode icon in the activity bar:

- **Jokes & Facts** — Dad jokes, Chuck Norris jokes, useless facts as popup notifications
- **Reddit Feed** — Hot posts from r/technology, r/programming, r/webdev, r/gadgets, plus Dev.to and Lobsters
- **Tools** — Quick access to XKCD comics, PDF viewer, Word viewer, and Claude AI chat

**Dashboard** — `Ctrl+Shift+P` > "ProcrastiCode: Open Dashboard"

- Jokes, cute animal pics (dogs/cats), useless facts, trivia quiz, XKCD comics, Pomodoro timer

**Claude AI Chat** — Chat with Claude directly in the sidebar

- Click "Chat with Claude" in the Tools section
- Streaming responses, model selector (Sonnet/Haiku/Opus), suggestion chips
- API key stored securely via OS keychain (VS Code SecretStorage)
- Set your key: `Ctrl+Shift+P` > "ProcrastiCode: Set Claude API Key"

**PDF Viewer** — Open PDFs inside VS Code with zoom, page navigation, fit-to-width

**Word Viewer** — Open .docx files rendered as HTML inside VS Code

**Status Bar** — Click "ProcrastiCode" at the bottom of VS Code for an instant joke

## Development

```bash
npm run compile      # Build with esbuild
npm run watch        # Watch mode (auto-rebuild on changes)
npm run compile:check  # Type-check with tsc (no output)
```

### Rebuild & Reinstall

```bash
npm run compile
npx @vscode/vsce package --allow-missing-repository
code --install-extension procrasticode-0.0.2.vsix --force
```

### Debug

Press **F5** in VS Code to launch the Extension Development Host.

## Uninstall

```bash
code --uninstall-extension samuel.procrasticode
```
