import * as vscode from 'vscode';
import { sendChatMessage, ChatMessage } from '../api/claude';

const MODEL_OPTIONS: { id: string; label: string }[] = [
    { id: 'claude-sonnet-4-20250514', label: 'Sonnet 4' },
    { id: 'claude-haiku-4-5-20251001', label: 'Haiku 4.5' },
    { id: 'claude-opus-4-20250514', label: 'Opus 4' },
];

export class ToolsViewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'procrasticodeTools';
    private view?: vscode.WebviewView;
    private context: vscode.ExtensionContext;
    private messages: ChatMessage[] = [];

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
    }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        _resolveContext: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken
    ): void {
        this.view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [
                vscode.Uri.joinPath(this.context.extensionUri, 'node_modules', '@vscode', 'codicons', 'dist'),
            ],
        };

        const codiconUri = webviewView.webview.asWebviewUri(
            vscode.Uri.joinPath(this.context.extensionUri, 'node_modules', '@vscode', 'codicons', 'dist', 'codicon.css')
        );

        webviewView.webview.html = this.getHtml(codiconUri);

        webviewView.webview.onDidReceiveMessage(async (msg) => {
            switch (msg.command) {
                case 'openChat':
                    this.view?.webview.postMessage({ command: 'showChat' });
                    break;
                case 'backToTools':
                    this.view?.webview.postMessage({ command: 'showTools' });
                    break;
                case 'runCommand':
                    vscode.commands.executeCommand(msg.commandId, msg.arg);
                    break;
                case 'sendMessage':
                    await this.handleUserMessage(msg.text);
                    break;
                case 'newChat':
                    this.messages = [];
                    this.view?.webview.postMessage({ command: 'clearChat' });
                    break;
                case 'changeApiKey':
                    await this.promptForApiKey();
                    break;
                case 'changeModel': {
                    const picked = await vscode.window.showQuickPick(
                        MODEL_OPTIONS.map((m) => ({
                            label: m.label,
                            description: m.id,
                            id: m.id,
                        })),
                        { placeHolder: 'Select a Claude model' }
                    );
                    if (picked) {
                        await vscode.workspace
                            .getConfiguration('procrasticode')
                            .update('claudeModel', picked.description, vscode.ConfigurationTarget.Global);
                        this.view?.webview.postMessage({
                            command: 'modelChanged',
                            modelId: picked.description,
                            modelLabel: picked.label,
                        });
                    }
                    break;
                }
            }
        });
    }

    public showChat(): void {
        this.view?.webview.postMessage({ command: 'showChat' });
    }

    private async getApiKey(): Promise<string | undefined> {
        let key = await this.context.secrets.get('procrasticode.claudeApiKey');
        if (!key) {
            key = await this.promptForApiKey();
        }
        return key;
    }

    private async promptForApiKey(): Promise<string | undefined> {
        const key = await vscode.window.showInputBox({
            prompt: 'Enter your Anthropic API key to use Claude Chat',
            placeHolder: 'sk-ant-...',
            password: true,
            ignoreFocusOut: true,
        });
        if (key) {
            await this.context.secrets.store('procrasticode.claudeApiKey', key);
            this.view?.webview.postMessage({ command: 'apiKeySet' });
            return key;
        }
        return undefined;
    }

    private async handleUserMessage(text: string): Promise<void> {
        const apiKey = await this.getApiKey();
        if (!apiKey) {
            this.view?.webview.postMessage({
                command: 'error',
                text: 'No API key set. Click "Set API Key" to add your Anthropic API key.',
            });
            return;
        }

        const model = vscode.workspace
            .getConfiguration('procrasticode')
            .get<string>('claudeModel', 'claude-sonnet-4-20250514');

        this.messages.push({ role: 'user', content: text });
        this.view?.webview.postMessage({ command: 'userMessage', text });
        this.view?.webview.postMessage({ command: 'streamStart' });

        try {
            const fullResponse = await sendChatMessage(
                apiKey,
                model,
                this.messages,
                (chunk) => {
                    this.view?.webview.postMessage({ command: 'streamChunk', text: chunk });
                }
            );
            this.messages.push({ role: 'assistant', content: fullResponse });
            this.view?.webview.postMessage({ command: 'streamEnd' });
        } catch (err: any) {
            this.view?.webview.postMessage({ command: 'streamEnd' });
            this.view?.webview.postMessage({ command: 'error', text: err.message });
        }
    }

    private getCurrentModelLabel(): string {
        const modelId = vscode.workspace
            .getConfiguration('procrasticode')
            .get<string>('claudeModel', 'claude-sonnet-4-20250514');
        const found = MODEL_OPTIONS.find((m) => m.id === modelId);
        return found ? found.label : modelId;
    }

    private getCurrentModelId(): string {
        return vscode.workspace
            .getConfiguration('procrasticode')
            .get<string>('claudeModel', 'claude-sonnet-4-20250514');
    }

    private getHtml(codiconUri: vscode.Uri): string {
        const modelLabel = this.getCurrentModelLabel();
        const modelId = this.getCurrentModelId();
        return /*html*/ `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; font-src ${this.view!.webview.cspSource}; script-src 'unsafe-inline'; style-src 'unsafe-inline' ${this.view!.webview.cspSource};">
    <link href="${codiconUri}" rel="stylesheet" />
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: var(--vscode-font-family, 'Segoe UI', sans-serif);
            font-size: var(--vscode-font-size, 13px);
            background: transparent;
            color: var(--vscode-foreground);
            height: 100vh;
            overflow: hidden;
        }

        /* ===== TOOLS VIEW — matches native tree ===== */
        #tools-view {
            padding: 0;
        }
        .tool-item {
            display: flex;
            align-items: center;
            gap: 6px;
            height: 22px;
            padding: 0 0 0 22px;
            cursor: pointer;
            font-size: var(--vscode-font-size, 13px);
            color: var(--vscode-foreground);
            border: none;
            background: none;
            width: 100%;
            text-align: left;
            outline: none;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        .tool-item:hover {
            background: var(--vscode-list-hoverBackground);
        }
        .tool-item:focus-visible {
            outline: 1px solid var(--vscode-focusBorder);
            outline-offset: -1px;
        }
        .tool-item .codicon {
            font-size: 16px;
            flex-shrink: 0;
            opacity: 0.8;
        }
        .tool-separator {
            height: 1px;
            background: var(--vscode-sideBarSectionHeader-border, transparent);
            margin: 4px 0;
        }

        /* ===== CHAT VIEW ===== */
        #chat-view {
            display: none;
            height: 100vh;
            flex-direction: column;
        }
        #chat-view.active { display: flex; }
        #tools-view.hidden { display: none; }

        .chat-header {
            display: flex;
            align-items: center;
            gap: 6px;
            height: 22px;
            padding: 0 8px;
            border-bottom: 1px solid var(--vscode-sideBarSectionHeader-border, var(--vscode-widget-border));
            flex-shrink: 0;
        }
        .back-btn {
            background: none;
            border: none;
            color: var(--vscode-foreground);
            cursor: pointer;
            font-size: 14px;
            padding: 0 4px;
            border-radius: 3px;
            display: flex;
            align-items: center;
            height: 20px;
        }
        .back-btn:hover {
            background: var(--vscode-list-hoverBackground);
        }
        .chat-header-title {
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            flex: 1;
            letter-spacing: 0.04em;
            color: var(--vscode-sideBarSectionHeader-foreground, var(--vscode-foreground));
        }
        .chat-header-actions {
            display: flex;
            gap: 2px;
        }
        .chat-header-actions button {
            background: none;
            border: none;
            color: var(--vscode-foreground);
            cursor: pointer;
            padding: 0 4px;
            border-radius: 3px;
            display: flex;
            align-items: center;
            height: 20px;
        }
        .chat-header-actions button:hover {
            background: var(--vscode-list-hoverBackground);
        }

        /* ===== CHAT CONTENT ===== */
        #chat-messages {
            flex: 1;
            overflow-y: auto;
            display: flex;
            flex-direction: column;
        }

        /* ===== WELCOME SCREEN (Claude.ai style) ===== */
        .welcome-area {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 40px 16px 20px;
            text-align: center;
            flex: 1;
        }
        .welcome-logo {
            width: 36px;
            height: 36px;
            border-radius: 50%;
            background: linear-gradient(135deg, var(--vscode-button-background), var(--vscode-progressBar-background, #007acc));
            display: flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 14px;
        }
        .welcome-logo .codicon {
            font-size: 18px;
            color: var(--vscode-button-foreground);
        }
        .welcome-title {
            font-size: 16px;
            font-weight: 600;
            margin-bottom: 20px;
            color: var(--vscode-foreground);
        }
        .suggestion-chips {
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
            justify-content: center;
            max-width: 280px;
        }
        .suggestion-chip {
            display: inline-flex;
            align-items: center;
            gap: 5px;
            padding: 5px 12px;
            border-radius: 16px;
            border: 1px solid var(--vscode-widget-border);
            background: var(--vscode-editor-background);
            color: var(--vscode-foreground);
            font-size: 11px;
            cursor: pointer;
            transition: background 0.15s, border-color 0.15s;
            white-space: nowrap;
        }
        .suggestion-chip:hover {
            background: var(--vscode-list-hoverBackground);
            border-color: var(--vscode-focusBorder);
        }
        .suggestion-chip .codicon {
            font-size: 12px;
            opacity: 0.7;
        }

        /* ===== MESSAGES ===== */
        .messages-list {
            display: flex;
            flex-direction: column;
            gap: 2px;
            padding: 8px 0;
        }
        .message {
            max-width: 100%;
            padding: 10px 14px;
            font-size: 12px;
            line-height: 1.6;
            word-wrap: break-word;
        }
        .message.user {
            background: var(--vscode-input-background);
            border-bottom: 1px solid var(--vscode-widget-border);
        }
        .message.assistant {
            background: transparent;
            border-bottom: 1px solid var(--vscode-widget-border);
        }
        .message.error {
            background: rgba(243, 139, 168, 0.08);
            color: #f38ba8;
            border-bottom: 1px solid rgba(243, 139, 168, 0.15);
            font-size: 11px;
            text-align: center;
        }
        .message-role {
            font-size: 10px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.04em;
            margin-bottom: 4px;
            color: var(--vscode-descriptionForeground);
        }

        .message pre {
            background: var(--vscode-textCodeBlock-background);
            padding: 8px 10px;
            border-radius: 4px;
            overflow-x: auto;
            margin: 6px 0;
            font-family: var(--vscode-editor-font-family, monospace);
            font-size: 11px;
            line-height: 1.4;
        }
        .message code {
            background: var(--vscode-textCodeBlock-background);
            padding: 1px 4px;
            border-radius: 3px;
            font-family: var(--vscode-editor-font-family, monospace);
            font-size: 11px;
        }
        .message pre code { background: none; padding: 0; }
        .message p { margin-bottom: 6px; }
        .message p:last-child { margin-bottom: 0; }
        .message ul, .message ol { margin: 4px 0 6px 16px; }
        .message li { margin-bottom: 2px; }
        .message strong { font-weight: 700; }
        .message em { font-style: italic; }
        .message h1, .message h2, .message h3 { margin: 8px 0 4px; font-weight: 700; }
        .message h1 { font-size: 14px; }
        .message h2 { font-size: 13px; }
        .message h3 { font-size: 12px; }

        .typing-indicator {
            display: inline-flex;
            gap: 3px;
            padding: 4px 0;
        }
        .typing-indicator span {
            width: 5px;
            height: 5px;
            background: var(--vscode-descriptionForeground);
            border-radius: 50%;
            animation: typing 1.2s infinite;
        }
        .typing-indicator span:nth-child(2) { animation-delay: 0.2s; }
        .typing-indicator span:nth-child(3) { animation-delay: 0.4s; }
        @keyframes typing {
            0%, 60%, 100% { opacity: 0.3; transform: scale(0.8); }
            30% { opacity: 1; transform: scale(1); }
        }

        /* ===== INPUT AREA (Claude.ai style) ===== */
        .input-area {
            padding: 8px 10px;
            border-top: 1px solid var(--vscode-widget-border);
            flex-shrink: 0;
        }
        .input-wrap {
            background: var(--vscode-input-background);
            border: 1px solid var(--vscode-input-border, var(--vscode-widget-border));
            border-radius: 12px;
            overflow: hidden;
            transition: border-color 0.15s;
        }
        .input-wrap:focus-within {
            border-color: var(--vscode-focusBorder);
        }
        #chat-input {
            width: 100%;
            background: transparent;
            color: var(--vscode-input-foreground);
            border: none;
            padding: 10px 12px 4px;
            font-family: inherit;
            font-size: 12px;
            resize: none;
            min-height: 28px;
            max-height: 100px;
            outline: none;
        }
        .input-bottom {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 2px 8px 8px;
        }
        .model-selector {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            padding: 2px 8px;
            border-radius: 8px;
            border: 1px solid var(--vscode-widget-border);
            background: transparent;
            color: var(--vscode-descriptionForeground);
            font-size: 10px;
            cursor: pointer;
            transition: background 0.15s, color 0.15s;
        }
        .model-selector:hover {
            background: var(--vscode-list-hoverBackground);
            color: var(--vscode-foreground);
        }
        .model-selector .codicon {
            font-size: 10px;
        }
        #send-btn {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            width: 26px;
            height: 26px;
            border-radius: 8px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: opacity 0.15s;
        }
        #send-btn:hover { opacity: 0.85; }
        #send-btn:disabled { opacity: 0.3; cursor: default; }
    </style>
</head>
<body>
    <!-- TOOLS LIST -->
    <div id="tools-view">
        <button class="tool-item" onclick="cmd('procrasticode.xkcdRandom')">
            <span class="codicon codicon-book"></span> Random XKCD Comic
        </button>
        <button class="tool-item" onclick="cmd('procrasticode.xkcdLatest')">
            <span class="codicon codicon-bookmark"></span> Latest XKCD Comic
        </button>
        <div class="tool-separator"></div>
        <button class="tool-item" onclick="cmd('procrasticode.openPdf')">
            <span class="codicon codicon-file-pdf"></span> Open PDF File
        </button>
        <button class="tool-item" onclick="cmd('procrasticode.openDocx')">
            <span class="codicon codicon-file-text"></span> Open Word Document
        </button>
        <div class="tool-separator"></div>
        <button class="tool-item" onclick="openChat()">
            <span class="codicon codicon-comment-discussion"></span> Chat with Claude
        </button>
        <button class="tool-item" onclick="cmd('procrasticode.setClaudeApiKey')">
            <span class="codicon codicon-key"></span> Set Claude API Key
        </button>
    </div>

    <!-- CHAT VIEW -->
    <div id="chat-view">
        <div class="chat-header">
            <button class="back-btn" onclick="backToTools()" title="Back to Tools">
                <span class="codicon codicon-arrow-left"></span>
            </button>
            <span class="chat-header-title">Claude Chat</span>
            <div class="chat-header-actions">
                <button onclick="newChat()" title="New conversation">
                    <span class="codicon codicon-add"></span>
                </button>
                <button onclick="changeKey()" title="Change API key">
                    <span class="codicon codicon-key"></span>
                </button>
            </div>
        </div>

        <div id="chat-messages">
            <div class="welcome-area" id="welcome">
                <div class="welcome-logo">
                    <span class="codicon codicon-sparkle"></span>
                </div>
                <div class="welcome-title">How can I help<br>you today?</div>
                <div class="suggestion-chips">
                    <button class="suggestion-chip" onclick="useSuggestion('Write me a quick script to ')">
                        <span class="codicon codicon-edit"></span> Write
                    </button>
                    <button class="suggestion-chip" onclick="useSuggestion('Explain how ')">
                        <span class="codicon codicon-mortar-board"></span> Learn
                    </button>
                    <button class="suggestion-chip" onclick="useSuggestion('Help me debug ')">
                        <span class="codicon codicon-code"></span> Code
                    </button>
                    <button class="suggestion-chip" onclick="useSuggestion('Tell me something fun about ')">
                        <span class="codicon codicon-smiley"></span> Fun
                    </button>
                </div>
            </div>
        </div>

        <div class="input-area">
            <div class="input-wrap">
                <textarea id="chat-input" placeholder="Reply to Claude..." rows="1"></textarea>
                <div class="input-bottom">
                    <button class="model-selector" onclick="changeModel()" title="Change model">
                        <span class="codicon codicon-sparkle"></span>
                        <span id="model-label">${modelLabel}</span>
                        <span class="codicon codicon-chevron-down"></span>
                    </button>
                    <button id="send-btn" onclick="sendMessage()" title="Send">
                        <span class="codicon codicon-send"></span>
                    </button>
                </div>
            </div>
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        let isStreaming = false;
        let streamingEl = null;
        let streamBuffer = '';

        const toolsView = document.getElementById('tools-view');
        const chatView = document.getElementById('chat-view');
        const chatMessages = document.getElementById('chat-messages');
        const chatInput = document.getElementById('chat-input');
        const sendBtn = document.getElementById('send-btn');
        const modelLabelEl = document.getElementById('model-label');

        function cmd(commandId) {
            vscode.postMessage({ command: 'runCommand', commandId });
        }

        function openChat() {
            vscode.postMessage({ command: 'openChat' });
        }

        function backToTools() {
            vscode.postMessage({ command: 'backToTools' });
        }

        function sendMessage() {
            const text = chatInput.value.trim();
            if (!text || isStreaming) return;
            chatInput.value = '';
            chatInput.style.height = 'auto';
            vscode.postMessage({ command: 'sendMessage', text });
        }

        function useSuggestion(prefix) {
            chatInput.value = prefix;
            chatInput.focus();
            chatInput.setSelectionRange(prefix.length, prefix.length);
        }

        function newChat() {
            vscode.postMessage({ command: 'newChat' });
        }

        function changeKey() {
            vscode.postMessage({ command: 'changeApiKey' });
        }

        function changeModel() {
            vscode.postMessage({ command: 'changeModel' });
        }

        chatInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });

        chatInput.addEventListener('input', () => {
            chatInput.style.height = 'auto';
            chatInput.style.height = Math.min(chatInput.scrollHeight, 100) + 'px';
        });

        function addMessage(role, html) {
            const welcome = document.getElementById('welcome');
            if (welcome) welcome.remove();

            const div = document.createElement('div');
            div.className = 'message ' + role;
            if (role === 'user' || role === 'assistant') {
                const roleLabel = document.createElement('div');
                roleLabel.className = 'message-role';
                roleLabel.textContent = role === 'user' ? 'You' : 'Claude';
                div.appendChild(roleLabel);
                const content = document.createElement('div');
                content.innerHTML = html;
                div.appendChild(content);
            } else {
                div.innerHTML = html;
            }
            chatMessages.appendChild(div);
            chatMessages.scrollTop = chatMessages.scrollHeight;
            return div;
        }

        function renderMarkdown(text) {
            let html = escapeHtml(text);

            // Code blocks
            html = html.replace(/\\\`\\\`\\\`([\\s\\S]*?)\\\`\\\`\\\`/g, function(m, code) {
                return '<pre><code>' + code.trim() + '</code></pre>';
            });

            // Inline code
            html = html.replace(/\\\`([^\\\`]+)\\\`/g, '<code>$1</code>');

            // Bold
            html = html.replace(/\\*\\*(.+?)\\*\\*/g, '<strong>$1</strong>');

            // Italic
            html = html.replace(/\\*(.+?)\\*/g, '<em>$1</em>');

            // Headers
            html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
            html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
            html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

            // Lists
            html = html.replace(/^[\\-\\*] (.+)$/gm, '<li>$1</li>');
            html = html.replace(/^\\d+\\. (.+)$/gm, '<li>$1</li>');
            html = html.replace(/(<li>.*?<\\/li>\\n?)+/g, '<ul>$&</ul>');

            // Paragraphs
            html = html.replace(/\\n\\n/g, '</p><p>');
            if (!html.startsWith('<')) html = '<p>' + html + '</p>';
            html = html.replace(/\\n/g, '<br>');

            // Clean up
            html = html.replace(/<p><\\/p>/g, '');
            html = html.replace(/<p>(<h[123]>)/g, '$1');
            html = html.replace(/(<\\/h[123]>)<\\/p>/g, '$1');
            html = html.replace(/<p>(<pre>)/g, '$1');
            html = html.replace(/(<\\/pre>)<\\/p>/g, '$1');
            html = html.replace(/<p>(<ul>)/g, '$1');
            html = html.replace(/(<\\/ul>)<\\/p>/g, '$1');

            return html;
        }

        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        const welcomeHtml =
            '<div class="welcome-area" id="welcome">' +
            '<div class="welcome-logo"><span class="codicon codicon-sparkle"></span></div>' +
            '<div class="welcome-title">How can I help<br>you today?</div>' +
            '<div class="suggestion-chips">' +
            '<button class="suggestion-chip" onclick="useSuggestion(\\\'Write me a quick script to \\\')">' +
            '<span class="codicon codicon-edit"></span> Write</button>' +
            '<button class="suggestion-chip" onclick="useSuggestion(\\\'Explain how \\\')">' +
            '<span class="codicon codicon-mortar-board"></span> Learn</button>' +
            '<button class="suggestion-chip" onclick="useSuggestion(\\\'Help me debug \\\')">' +
            '<span class="codicon codicon-code"></span> Code</button>' +
            '<button class="suggestion-chip" onclick="useSuggestion(\\\'Tell me something fun about \\\')">' +
            '<span class="codicon codicon-smiley"></span> Fun</button>' +
            '</div></div>';

        window.addEventListener('message', (event) => {
            const msg = event.data;
            switch (msg.command) {
                case 'showChat': {
                    toolsView.classList.add('hidden');
                    chatView.classList.add('active');
                    chatInput.focus();
                    break;
                }
                case 'showTools': {
                    chatView.classList.remove('active');
                    toolsView.classList.remove('hidden');
                    break;
                }
                case 'userMessage': {
                    addMessage('user', escapeHtml(msg.text));
                    break;
                }
                case 'streamStart': {
                    isStreaming = true;
                    sendBtn.disabled = true;
                    streamBuffer = '';
                    streamingEl = addMessage('assistant',
                        '<div class="typing-indicator"><span></span><span></span><span></span></div>');
                    break;
                }
                case 'streamChunk': {
                    streamBuffer += msg.text;
                    if (streamingEl) {
                        // Keep the role label, update only the content div
                        const contentDiv = streamingEl.querySelector('.message-role + div') || streamingEl.lastElementChild;
                        if (contentDiv && contentDiv.className !== 'message-role') {
                            contentDiv.innerHTML = renderMarkdown(streamBuffer);
                        }
                        chatMessages.scrollTop = chatMessages.scrollHeight;
                    }
                    break;
                }
                case 'streamEnd': {
                    isStreaming = false;
                    sendBtn.disabled = false;
                    if (streamingEl && streamBuffer) {
                        const contentDiv = streamingEl.querySelector('.message-role + div') || streamingEl.lastElementChild;
                        if (contentDiv && contentDiv.className !== 'message-role') {
                            contentDiv.innerHTML = renderMarkdown(streamBuffer);
                        }
                    }
                    streamingEl = null;
                    streamBuffer = '';
                    chatInput.focus();
                    break;
                }
                case 'error': {
                    addMessage('error', escapeHtml(msg.text));
                    isStreaming = false;
                    sendBtn.disabled = false;
                    break;
                }
                case 'clearChat': {
                    chatMessages.innerHTML = welcomeHtml;
                    break;
                }
                case 'apiKeySet': {
                    addMessage('assistant', '<p>API key saved. You can start chatting now!</p>');
                    break;
                }
                case 'modelChanged': {
                    modelLabelEl.textContent = msg.modelLabel;
                    break;
                }
            }
        });
    </script>
</body>
</html>`;
    }
}
