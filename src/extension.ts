import * as vscode from 'vscode';
import { JokesProvider } from './sidebar/jokesProvider';
import { NewsProvider } from './sidebar/newsProvider';
import { YouTubeViewProvider } from './sidebar/youtubeProvider';
import { DashboardPanel } from './webview/dashboard';
import { createStatusBarItem, showRandomJoke } from './statusbar';

export function activate(context: vscode.ExtensionContext): void {
    // Sidebar providers
    const jokesProvider = new JokesProvider();
    const newsProvider = new NewsProvider();
    const youtubeProvider = new YouTubeViewProvider();

    vscode.window.registerTreeDataProvider('procrasticodeJokes', jokesProvider);
    vscode.window.registerTreeDataProvider('procrasticodeNews', newsProvider);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider('procrasticodeYouTube', youtubeProvider)
    );

    // Commands
    context.subscriptions.push(
        vscode.commands.registerCommand('procrasticode.openDashboard', () => {
            DashboardPanel.createOrShow(context.extensionUri);
        }),

        vscode.commands.registerCommand('procrasticode.randomJoke', () => {
            showRandomJoke();
        }),

        vscode.commands.registerCommand(
            'procrasticode.fetchJoke',
            (type: string) => {
                jokesProvider.fetchAndShow(type as any);
            }
        ),

        vscode.commands.registerCommand('procrasticode.refreshJokes', () => {
            jokesProvider.refresh();
        }),

        vscode.commands.registerCommand('procrasticode.refreshNews', () => {
            newsProvider.refresh();
        }),

        vscode.commands.registerCommand('procrasticode.refreshYouTube', () => {
            youtubeProvider.refresh();
        })
    );

    // Status bar
    const statusBarItem = createStatusBarItem();
    context.subscriptions.push(statusBarItem);

    // Welcome message on first activation
    vscode.window.showInformationMessage(
        'ProcrastiCode is active! Click the smiley in the status bar or open the dashboard from the command palette.',
        'Open Dashboard'
    ).then((action) => {
        if (action === 'Open Dashboard') {
            DashboardPanel.createOrShow(context.extensionUri);
        }
    });
}

export function deactivate(): void {}
