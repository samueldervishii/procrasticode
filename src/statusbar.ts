import * as vscode from 'vscode';
import { getDadJoke, getChuckNorris } from './api/apis';

export function createStatusBarItem(): vscode.StatusBarItem {
    const item = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Right,
        100
    );
    item.text = '$(smiley) ProcrastiCode';
    item.tooltip = 'Click for a random joke!';
    item.command = 'procrasticode.randomJoke';
    item.show();
    return item;
}

export async function showRandomJoke(): Promise<void> {
    try {
        const isDad = Math.random() > 0.5;
        const joke = isDad ? await getDadJoke() : await getChuckNorris();
        const action = await vscode.window.showInformationMessage(
            `${joke.source}: ${joke.text}`,
            'Another One!'
        );
        if (action === 'Another One!') {
            showRandomJoke();
        }
    } catch (err: any) {
        vscode.window.showErrorMessage(
            `ProcrastiCode: Couldn't fetch joke — ${err.message}`
        );
    }
}
