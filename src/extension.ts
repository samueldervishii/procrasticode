import * as vscode from "vscode";
import { JokesProvider } from "./sidebar/jokesProvider";
import { NewsProvider } from "./sidebar/newsProvider";
import { DashboardPanel } from "./webview/dashboard";
import { createStatusBarItem, showRandomJoke } from "./statusbar";
import { PdfViewerPanel } from "./viewers/pdfViewer";
import { DocxViewerPanel } from "./viewers/docxViewer";
import { ToolsViewProvider } from "./sidebar/toolsProvider";
import { getLatestXkcd, getXkcdComic } from "./api/apis";

export function activate(context: vscode.ExtensionContext): void {
  // Sidebar providers
  const jokesProvider = new JokesProvider();
  const newsProvider = new NewsProvider();
  const toolsProvider = new ToolsViewProvider(context);
  vscode.window.registerTreeDataProvider("procrasticodeJokes", jokesProvider);
  vscode.window.registerTreeDataProvider("procrasticodeNews", newsProvider);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      "procrasticodeTools",
      toolsProvider,
      {
        webviewOptions: { retainContextWhenHidden: true },
      },
    ),
  );

  // Commands
  context.subscriptions.push(
    vscode.commands.registerCommand("procrasticode.openDashboard", () => {
      DashboardPanel.createOrShow(context.extensionUri);
    }),

    vscode.commands.registerCommand("procrasticode.randomJoke", () => {
      showRandomJoke();
    }),

    vscode.commands.registerCommand(
      "procrasticode.fetchJoke",
      (type: "dad-joke" | "chuck-norris" | "useless-fact") => {
        jokesProvider.fetchAndShow(type);
      },
    ),

    vscode.commands.registerCommand("procrasticode.refreshJokes", () => {
      jokesProvider.refresh();
    }),

    vscode.commands.registerCommand("procrasticode.refreshNews", () => {
      newsProvider.refresh();
    }),

    vscode.commands.registerCommand(
      "procrasticode.openPdf",
      (uri?: vscode.Uri) => {
        PdfViewerPanel.createOrShow(context.extensionUri, uri);
      },
    ),

    vscode.commands.registerCommand(
      "procrasticode.openDocx",
      (uri?: vscode.Uri) => {
        DocxViewerPanel.createOrShow(uri);
      },
    ),

    vscode.commands.registerCommand("procrasticode.openChat", () => {
      toolsProvider.showChat();
    }),

    vscode.commands.registerCommand(
      "procrasticode.setClaudeApiKey",
      async () => {
        const key = await vscode.window.showInputBox({
          prompt: "Enter your Anthropic API key",
          placeHolder: "sk-ant-...",
          password: true,
          ignoreFocusOut: true,
        });
        if (key) {
          await context.secrets.store("procrasticode.claudeApiKey", key);
          vscode.window.showInformationMessage(
            "Claude API key saved securely.",
          );
        }
      },
    ),

    vscode.commands.registerCommand("procrasticode.xkcdRandom", async () => {
      try {
        const latest = await getLatestXkcd();
        let num = Math.floor(Math.random() * latest.num) + 1;
        if (num === 404) {
          num = 405;
        }
        const comic = await getXkcdComic(num);
        vscode.window
          .showInformationMessage(
            `XKCD #${comic.num}: ${comic.title} — ${comic.alt}`,
            "Another!",
          )
          .then((action) => {
            if (action === "Another!") {
              vscode.commands.executeCommand("procrasticode.xkcdRandom");
            }
          });
      } catch (err: any) {
        vscode.window.showErrorMessage(`XKCD failed: ${err.message}`);
      }
    }),

    vscode.commands.registerCommand("procrasticode.xkcdLatest", async () => {
      try {
        const comic = await getLatestXkcd();
        vscode.window.showInformationMessage(
          `XKCD #${comic.num}: ${comic.title} — ${comic.alt}`,
        );
      } catch (err: any) {
        vscode.window.showErrorMessage(`XKCD failed: ${err.message}`);
      }
    }),

    vscode.commands.registerCommand("procrasticode.refreshTools", () => {
      // Tools sidebar is static — no-op but prevents "command not found"
    }),
  );

  // Status bar
  const statusBarItem = createStatusBarItem();
  context.subscriptions.push(statusBarItem);

  // Welcome message on first activation
  vscode.window
    .showInformationMessage(
      "ProcrastiCode is active! Click the smiley in the status bar or open the dashboard from the command palette.",
      "Open Dashboard",
    )
    .then((action) => {
      if (action === "Open Dashboard") {
        DashboardPanel.createOrShow(context.extensionUri);
      }
    });
}

export function deactivate(): void {}
