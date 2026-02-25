import * as vscode from 'vscode';
import { searchYouTube, getYouTubeTrending } from '../api/apis';

export class YouTubeViewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'procrasticodeYouTube';

    private view?: vscode.WebviewView;
    private messageDisposable?: vscode.Disposable;

    constructor() {}

    resolveWebviewView(
        webviewView: vscode.WebviewView,
        _context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken
    ): void {
        this.view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            enableCommandUris: true,
        };

        this.updateHtmlAndListeners();
    }

    refresh(): void {
        if (this.view) {
            this.updateHtmlAndListeners();
        }
    }

    private updateHtmlAndListeners(): void {
        if (!this.view) { return; }

        this.messageDisposable?.dispose();

        this.view.webview.html = this.getHtml();

        const webview = this.view.webview;

        this.messageDisposable = webview.onDidReceiveMessage(async (msg) => {
            switch (msg.command) {
                case 'search': {
                    const apiKey = this.getApiKey();
                    if (!apiKey) {
                        webview.postMessage({ command: 'error', text: 'No YouTube API key set. Go to Settings > search "procrasticode.youtubeApiKey".' });
                        return;
                    }
                    try {
                        const result = await searchYouTube(msg.query, apiKey, 6, msg.pageToken || '');
                        webview.postMessage({
                            command: msg.pageToken ? 'moreResults' : 'results',
                            videos: result.videos,
                            nextPageToken: result.nextPageToken,
                        });
                    } catch (err: any) {
                        webview.postMessage({ command: 'error', text: `Search failed: ${err.message}` });
                    }
                    break;
                }
                case 'trending': {
                    const apiKey = this.getApiKey();
                    if (!apiKey) {
                        webview.postMessage({ command: 'error', text: 'No YouTube API key set. Go to Settings > search "procrasticode.youtubeApiKey".' });
                        return;
                    }
                    try {
                        const result = await getYouTubeTrending(apiKey, 6, msg.pageToken || '');
                        webview.postMessage({
                            command: msg.pageToken ? 'moreResults' : 'results',
                            videos: result.videos,
                            nextPageToken: result.nextPageToken,
                        });
                    } catch (err: any) {
                        webview.postMessage({ command: 'error', text: `Failed to load trending: ${err.message}` });
                    }
                    break;
                }
                case 'openVideo': {
                    const ytUrl = vscode.Uri.parse(`https://www.youtube.com/watch?v=${msg.videoId}`);
                    vscode.env.openExternal(ytUrl).then(() => {}, () => {
                        // fallback: use xdg-open directly
                        require('child_process').exec(`xdg-open "${ytUrl.toString()}"`);
                    });
                    break;
                }
            }
        });
    }

    private getApiKey(): string {
        return vscode.workspace
            .getConfiguration('procrasticode')
            .get<string>('youtubeApiKey', '');
    }

    private getHtml(): string {
        const hasKey = !!this.getApiKey();
        return /*html*/ `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src https: data:; script-src 'unsafe-inline'; style-src 'unsafe-inline';">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: var(--vscode-font-family, sans-serif);
            background: var(--vscode-sideBar-background, #1e1e2e);
            color: var(--vscode-sideBar-foreground, #cdd6f4);
            padding: 8px;
        }

        .search-bar {
            display: flex;
            gap: 4px;
            margin-bottom: 8px;
        }

        .search-bar input {
            flex: 1;
            padding: 6px 8px;
            background: var(--vscode-input-background, #313244);
            color: var(--vscode-input-foreground, #cdd6f4);
            border: 1px solid var(--vscode-widget-border, #45475a);
            border-radius: 4px;
            font-size: 12px;
            outline: none;
        }

        .search-bar input:focus {
            border-color: var(--vscode-focusBorder, #89b4fa);
        }

        .search-bar button {
            padding: 6px 10px;
            background: var(--vscode-button-background, #89b4fa);
            color: var(--vscode-button-foreground, #1e1e2e);
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
            font-weight: 600;
        }

        .search-bar button:hover { opacity: 0.85; }

        .quick-btns {
            display: flex;
            gap: 4px;
            margin-bottom: 8px;
            flex-wrap: wrap;
        }

        .quick-btns button {
            padding: 4px 8px;
            font-size: 11px;
            background: var(--vscode-button-secondaryBackground, #313244);
            color: var(--vscode-button-secondaryForeground, #cdd6f4);
            border: none;
            border-radius: 4px;
            cursor: pointer;
        }

        .quick-btns button:hover { opacity: 0.85; }

        .error {
            color: #f38ba8;
            font-size: 12px;
            padding: 8px;
            background: rgba(243, 139, 168, 0.1);
            border-radius: 4px;
            margin-bottom: 8px;
            display: none;
        }

        .no-key-banner {
            padding: 14px;
            background: var(--vscode-input-background, #313244);
            border: 1px solid var(--vscode-widget-border, #45475a);
            border-radius: 8px;
            margin-bottom: 10px;
            font-size: 12px;
            line-height: 1.6;
            text-align: center;
        }

        .no-key-banner .key-icon {
            font-size: 28px;
            margin-bottom: 8px;
        }

        .no-key-banner .key-title {
            font-size: 13px;
            font-weight: 600;
            margin-bottom: 6px;
            color: var(--vscode-editor-foreground, #000);
        }

        .no-key-banner .key-desc {
            color: var(--vscode-descriptionForeground, #6c7086);
            margin-bottom: 10px;
            font-size: 11px;
        }

        .settings-btn {
            display: inline-block;
            padding: 7px 16px;
            background: var(--vscode-button-background, #89b4fa);
            color: var(--vscode-button-foreground, #1e1e2e) !important;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
            font-weight: 600;
            text-decoration: none;
        }

        .settings-btn:hover { opacity: 0.85; }


        .video-list {
            display: flex;
            flex-direction: column;
            gap: 6px;
        }

        .video-item {
            display: flex;
            gap: 8px;
            padding: 6px;
            background: var(--vscode-list-hoverBackground, #313244);
            border-radius: 6px;
            cursor: pointer;
            transition: background 0.15s;
            align-items: flex-start;
        }

        .video-item:hover {
            background: var(--vscode-list-activeSelectionBackground, #45475a);
        }

        .video-item img {
            width: 80px;
            height: 45px;
            object-fit: cover;
            border-radius: 4px;
            flex-shrink: 0;
        }

        .video-meta {
            flex: 1;
            min-width: 0;
        }

        .video-meta h3 {
            font-size: 12px;
            line-height: 1.3;
            margin-bottom: 2px;
            color: var(--vscode-editor-foreground, #000);
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
        }

        .video-meta .channel {
            font-size: 11px;
            color: var(--vscode-descriptionForeground, #6c7086);
        }

        .status {
            text-align: center;
            font-size: 12px;
            color: var(--vscode-descriptionForeground, #6c7086);
            padding: 16px 8px;
        }

        .action-bar {
            display: flex;
            gap: 4px;
            margin-bottom: 8px;
        }

        .action-bar button {
            flex: 1;
            padding: 6px 10px;
            font-size: 11px;
            font-weight: 600;
            border: none;
            border-radius: 4px;
            cursor: pointer;
        }

        .btn-clear {
            background: var(--vscode-button-secondaryBackground, #313244);
            color: var(--vscode-button-secondaryForeground, #cdd6f4);
        }

        .btn-show-more {
            background: var(--vscode-button-background, #89b4fa);
            color: var(--vscode-button-foreground, #1e1e2e);
        }

        .action-bar button:hover { opacity: 0.85; }

        .hidden { display: none !important; }
    </style>
</head>
<body>
    <div class="search-bar">
        <input type="text" id="search-input" placeholder="Search YouTube..." />
        <button id="go-btn">Go</button>
    </div>

    <div class="quick-btns">
        <button id="btn-trending">Trending</button>
        <button id="btn-lofi">Lofi</button>
        <button id="btn-coding">Coding</button>
        <button id="btn-tech">Tech</button>
    </div>

    ${!hasKey ? `<div class="no-key-banner">
        <div class="key-icon">&#128273;</div>
        <div class="key-title">YouTube API Key Required</div>
        <div class="key-desc">Add a free YouTube Data API v3 key in your VS Code settings to get started.</div>
        <a class="settings-btn" href="command:workbench.action.openSettings?%22procrasticode.youtubeApiKey%22">Open Settings</a>
    </div>` : ''}

    <div class="action-bar hidden" id="action-bar">
        <button class="btn-clear" id="btn-clear">Clear</button>
        <button class="btn-show-more" id="btn-show-more">Show More</button>
    </div>

    <div class="error" id="error"></div>
    <div id="results">
        ${hasKey ? '<div class="status">Search or pick a category above</div>' : ''}
    </div>

    <script>
        (function() {
            var vscode = acquireVsCodeApi();
            var nextPageToken = '';
            var lastCommand = '';
            var lastQuery = '';

            function postMsg(command, data) {
                vscode.postMessage(Object.assign({ command: command }, data || {}));
            }

            function showLoading() {
                document.getElementById('error').style.display = 'none';
                document.getElementById('results').innerHTML = '<div class="status">Loading...</div>';
                document.getElementById('action-bar').classList.add('hidden');
            }

            function showActionBar(hasMore) {
                var bar = document.getElementById('action-bar');
                bar.classList.remove('hidden');
                document.getElementById('btn-show-more').style.display = hasMore ? '' : 'none';
            }

            function clearAll() {
                document.getElementById('search-input').value = '';
                document.getElementById('results').innerHTML = '<div class="status">Search or pick a category above</div>';
                document.getElementById('error').style.display = 'none';
                document.getElementById('action-bar').classList.add('hidden');
                nextPageToken = '';
                lastCommand = '';
                lastQuery = '';
            }

            function loadMore() {
                if (!nextPageToken || !lastCommand) return;
                document.getElementById('btn-show-more').textContent = 'Loading...';
                var data = { pageToken: nextPageToken };
                if (lastCommand === 'search') { data.query = lastQuery; }
                postMsg(lastCommand, data);
            }

            function doSearch() {
                var input = document.getElementById('search-input');
                var query = input.value.trim();
                if (!query) return;
                lastCommand = 'search';
                lastQuery = query;
                nextPageToken = '';
                showLoading();
                postMsg('search', { query: query });
            }

            function doQuick(query) {
                document.getElementById('error').style.display = 'none';
                if (query === 'trending') {
                    lastCommand = 'trending';
                    lastQuery = '';
                    nextPageToken = '';
                    showLoading();
                    postMsg('trending');
                    return;
                }
                document.getElementById('search-input').value = query;
                lastCommand = 'search';
                lastQuery = query;
                nextPageToken = '';
                showLoading();
                postMsg('search', { query: query });
            }

            function playVideo(videoId) {
                postMsg('openVideo', { videoId: videoId });
            }

            function escapeHtml(text) {
                var div = document.createElement('div');
                div.textContent = text;
                return div.innerHTML;
            }

            function appendVideos(container, videos) {
                var list = container.querySelector('.video-list');
                if (!list) {
                    list = document.createElement('div');
                    list.className = 'video-list';
                    container.appendChild(list);
                }
                videos.forEach(function(v) {
                    var item = document.createElement('div');
                    item.className = 'video-item';
                    item.addEventListener('click', function() {
                        playVideo(v.videoId);
                    });
                    var html = '';
                    if (v.thumbnail) {
                        html += '<img src="' + v.thumbnail + '" alt="thumb"/>';
                    }
                    html += '<div class="video-meta">' +
                        '<h3>' + escapeHtml(v.title) + '</h3>' +
                        '<span class="channel">' + escapeHtml(v.channelTitle) + '</span>' +
                        '</div>';
                    item.innerHTML = html;
                    list.appendChild(item);
                });
            }

            // Button listeners
            document.getElementById('go-btn').addEventListener('click', doSearch);
            document.getElementById('search-input').addEventListener('keydown', function(e) {
                if (e.key === 'Enter') doSearch();
            });
            document.getElementById('btn-trending').addEventListener('click', function() { doQuick('trending'); });
            document.getElementById('btn-lofi').addEventListener('click', function() { doQuick('lofi hip hop'); });
            document.getElementById('btn-coding').addEventListener('click', function() { doQuick('coding tutorials'); });
            document.getElementById('btn-tech').addEventListener('click', function() { doQuick('tech news today'); });
            document.getElementById('btn-clear').addEventListener('click', clearAll);
            document.getElementById('btn-show-more').addEventListener('click', loadMore);

            // Listen for responses from extension
            window.addEventListener('message', function(event) {
                var msg = event.data;
                switch (msg.command) {
                    case 'results': {
                        var container = document.getElementById('results');
                        if (!msg.videos || msg.videos.length === 0) {
                            container.innerHTML = '<div class="status">No results found.</div>';
                            return;
                        }
                        container.innerHTML = '';
                        appendVideos(container, msg.videos);
                        nextPageToken = msg.nextPageToken || '';
                        showActionBar(!!nextPageToken);
                        break;
                    }
                    case 'moreResults': {
                        document.getElementById('btn-show-more').textContent = 'Show More';
                        if (msg.videos && msg.videos.length > 0) {
                            appendVideos(document.getElementById('results'), msg.videos);
                        }
                        nextPageToken = msg.nextPageToken || '';
                        showActionBar(!!nextPageToken);
                        break;
                    }
                    case 'error': {
                        var errEl = document.getElementById('error');
                        errEl.textContent = msg.text;
                        errEl.style.display = 'block';
                        document.getElementById('results').innerHTML = '';
                        document.getElementById('action-bar').classList.add('hidden');
                        document.getElementById('btn-show-more').textContent = 'Show More';
                        break;
                    }
                }
            });
        })();
    </script>
</body>
</html>`;
    }
}
