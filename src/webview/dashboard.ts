import * as vscode from 'vscode';
import {
    getDadJoke,
    getChuckNorris,
    getRandomDog,
    getRandomCat,
    getUselessFact,
    getTriviaQuestion,
    searchYouTube,
    getYouTubeTrending,
} from '../api/apis';

export class DashboardPanel {
    public static currentPanel: DashboardPanel | undefined;
    private readonly panel: vscode.WebviewPanel;
    private disposables: vscode.Disposable[] = [];

    private constructor(panel: vscode.WebviewPanel) {
        this.panel = panel;
        this.panel.webview.html = this.getHtml();

        this.panel.webview.onDidReceiveMessage(
            async (msg) => {
                switch (msg.command) {
                    case 'getDadJoke': {
                        const joke = await getDadJoke();
                        this.panel.webview.postMessage({
                            command: 'joke',
                            text: joke.text,
                            source: joke.source,
                        });
                        break;
                    }
                    case 'getChuckNorris': {
                        const joke = await getChuckNorris();
                        this.panel.webview.postMessage({
                            command: 'joke',
                            text: joke.text,
                            source: joke.source,
                        });
                        break;
                    }
                    case 'getAnimal': {
                        try {
                            const isDog = Math.random() > 0.5;
                            const url = isDog
                                ? await getRandomDog()
                                : await getRandomCat();
                            this.panel.webview.postMessage({
                                command: 'animal',
                                url,
                                type: isDog ? 'Dog' : 'Cat',
                            });
                        } catch {
                            const url = await getRandomDog();
                            this.panel.webview.postMessage({
                                command: 'animal',
                                url,
                                type: 'Dog',
                            });
                        }
                        break;
                    }
                    case 'getFact': {
                        const fact = await getUselessFact();
                        this.panel.webview.postMessage({
                            command: 'fact',
                            text: fact,
                        });
                        break;
                    }
                    case 'getTrivia': {
                        const trivia = await getTriviaQuestion();
                        this.panel.webview.postMessage({
                            command: 'trivia',
                            question: trivia.question,
                            answers: trivia.allAnswers,
                            correct: trivia.correctAnswer,
                            category: trivia.category,
                            difficulty: trivia.difficulty,
                        });
                        break;
                    }
                    case 'youtubeSearch': {
                        const apiKey = vscode.workspace
                            .getConfiguration('procrasticode')
                            .get<string>('youtubeApiKey', '');
                        if (!apiKey) {
                            this.panel.webview.postMessage({
                                command: 'youtubeError',
                                text: 'No YouTube API key set. Go to Settings and search for "procrasticode.youtubeApiKey" to add your free key.',
                            });
                            return;
                        }
                        try {
                            const result = await searchYouTube(
                                msg.query,
                                apiKey,
                                8
                            );
                            this.panel.webview.postMessage({
                                command: 'youtubeResults',
                                videos: result.videos,
                            });
                        } catch (err: any) {
                            this.panel.webview.postMessage({
                                command: 'youtubeError',
                                text: `Search failed: ${err.message}`,
                            });
                        }
                        break;
                    }
                    case 'youtubeTrending': {
                        const apiKey = vscode.workspace
                            .getConfiguration('procrasticode')
                            .get<string>('youtubeApiKey', '');
                        if (!apiKey) {
                            this.panel.webview.postMessage({
                                command: 'youtubeError',
                                text: 'No YouTube API key set. Go to Settings and search for "procrasticode.youtubeApiKey" to add your free key.',
                            });
                            return;
                        }
                        try {
                            const result = await getYouTubeTrending(apiKey, 8);
                            this.panel.webview.postMessage({
                                command: 'youtubeResults',
                                videos: result.videos,
                            });
                        } catch (err: any) {
                            this.panel.webview.postMessage({
                                command: 'youtubeError',
                                text: `Failed to load trending: ${err.message}`,
                            });
                        }
                        break;
                    }
                    case 'playVideo': {
                        this.panel.webview.postMessage({
                            command: 'playVideo',
                            videoId: msg.videoId,
                            title: msg.title,
                        });
                        break;
                    }
                }
            },
            null,
            this.disposables
        );

        this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
    }

    public static createOrShow(extensionUri: vscode.Uri): void {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        if (DashboardPanel.currentPanel) {
            DashboardPanel.currentPanel.panel.reveal(column);
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            'procrasticodeDashboard',
            'ProcrastiCode Dashboard',
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
            }
        );

        DashboardPanel.currentPanel = new DashboardPanel(panel);
    }

    private dispose(): void {
        DashboardPanel.currentPanel = undefined;
        this.panel.dispose();
        while (this.disposables.length) {
            const d = this.disposables.pop();
            if (d) {
                d.dispose();
            }
        }
    }

    private getHtml(): string {
        return /*html*/ `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src https: data:; script-src 'unsafe-inline'; style-src 'unsafe-inline'; frame-src https://www.youtube.com https://www.youtube-nocookie.com;">
    <title>ProcrastiCode Dashboard</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }

        body {
            font-family: var(--vscode-font-family, 'Segoe UI', sans-serif);
            background: var(--vscode-editor-background, #1e1e2e);
            color: var(--vscode-editor-foreground, #cdd6f4);
            padding: 24px;
            min-height: 100vh;
        }

        h1 {
            text-align: center;
            font-size: 28px;
            margin-bottom: 8px;
            background: linear-gradient(135deg, #f38ba8, #fab387, #f9e2af, #a6e3a1, #89b4fa, #cba6f7);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }

        .subtitle {
            text-align: center;
            color: var(--vscode-descriptionForeground, #6c7086);
            margin-bottom: 24px;
            font-size: 14px;
        }

        /* Tab navigation */
        .tabs {
            display: flex;
            justify-content: center;
            gap: 4px;
            margin-bottom: 24px;
            flex-wrap: wrap;
        }

        .tab-btn {
            padding: 10px 20px;
            background: var(--vscode-input-background, #313244);
            color: var(--vscode-editor-foreground, #cdd6f4);
            border: 1px solid var(--vscode-widget-border, #45475a);
            border-radius: 8px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 600;
            transition: all 0.2s;
            width: auto;
        }

        .tab-btn:hover {
            background: var(--vscode-list-hoverBackground, #45475a);
            opacity: 1;
        }

        .tab-btn.active {
            background: var(--vscode-button-background, #89b4fa);
            color: var(--vscode-button-foreground, #1e1e2e);
            border-color: var(--vscode-button-background, #89b4fa);
        }

        .tab-content {
            display: none;
            max-width: 1200px;
            margin: 0 auto;
        }

        .tab-content.active {
            display: block;
        }

        .grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
            gap: 20px;
        }

        .card {
            background: var(--vscode-sideBar-background, #181825);
            border: 1px solid var(--vscode-widget-border, #313244);
            border-radius: 12px;
            padding: 24px;
            transition: transform 0.2s, box-shadow 0.2s;
        }

        .card:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
        }

        .card-header {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 16px;
        }

        .card-header .emoji { font-size: 24px; }

        .card-header h2 {
            font-size: 18px;
            color: var(--vscode-editor-foreground, #cdd6f4);
        }

        .card-body {
            min-height: 80px;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
        }

        .content-text {
            font-size: 15px;
            line-height: 1.6;
            margin-bottom: 16px;
            color: var(--vscode-editor-foreground, #cdd6f4);
        }

        .content-text .source {
            display: block;
            font-size: 12px;
            color: var(--vscode-descriptionForeground, #6c7086);
            margin-top: 8px;
        }

        button {
            background: var(--vscode-button-background, #89b4fa);
            color: var(--vscode-button-foreground, #1e1e2e);
            border: none;
            padding: 10px 20px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 600;
            transition: opacity 0.2s;
            width: 100%;
        }

        button:hover { opacity: 0.85; }
        button:disabled { opacity: 0.5; cursor: wait; }

        button.secondary {
            background: var(--vscode-button-secondaryBackground, #313244);
            color: var(--vscode-button-secondaryForeground, #cdd6f4);
        }

        .btn-row {
            display: flex;
            gap: 8px;
        }

        .btn-row button { flex: 1; }

        .animal-img {
            width: 100%;
            max-height: 250px;
            object-fit: cover;
            border-radius: 8px;
            margin-bottom: 12px;
            display: none;
        }

        .animal-label {
            text-align: center;
            font-size: 13px;
            color: var(--vscode-descriptionForeground, #6c7086);
            margin-bottom: 12px;
        }

        /* Trivia */
        .trivia-meta {
            font-size: 12px;
            color: var(--vscode-descriptionForeground, #6c7086);
            margin-bottom: 8px;
        }

        .trivia-question {
            font-size: 16px;
            font-weight: 600;
            margin-bottom: 16px;
            line-height: 1.5;
        }

        .answers {
            display: flex;
            flex-direction: column;
            gap: 8px;
            margin-bottom: 16px;
        }

        .answer-btn {
            text-align: left;
            padding: 12px 16px;
            background: var(--vscode-input-background, #313244);
            border: 1px solid var(--vscode-widget-border, #45475a);
            color: var(--vscode-editor-foreground, #cdd6f4);
            border-radius: 8px;
            font-weight: 400;
        }

        .answer-btn:hover:not(:disabled) {
            background: var(--vscode-list-hoverBackground, #45475a);
            opacity: 1;
        }

        .answer-btn.correct {
            background: #a6e3a1 !important;
            color: #1e1e2e !important;
            border-color: #a6e3a1 !important;
        }

        .answer-btn.wrong {
            background: #f38ba8 !important;
            color: #1e1e2e !important;
            border-color: #f38ba8 !important;
        }

        .score-display {
            text-align: center;
            font-size: 14px;
            font-weight: 600;
            color: var(--vscode-descriptionForeground, #6c7086);
            margin-bottom: 12px;
        }

        /* YouTube */
        .yt-search-bar {
            display: flex;
            gap: 8px;
            margin-bottom: 16px;
        }

        .yt-search-bar input {
            flex: 1;
            padding: 10px 14px;
            background: var(--vscode-input-background, #313244);
            color: var(--vscode-input-foreground, #cdd6f4);
            border: 1px solid var(--vscode-widget-border, #45475a);
            border-radius: 8px;
            font-size: 14px;
            outline: none;
        }

        .yt-search-bar input:focus {
            border-color: var(--vscode-focusBorder, #89b4fa);
        }

        .yt-search-bar button {
            width: auto;
            padding: 10px 20px;
        }

        .yt-video-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
            gap: 16px;
            margin-bottom: 16px;
        }

        .yt-video-card {
            background: var(--vscode-input-background, #313244);
            border: 1px solid var(--vscode-widget-border, #45475a);
            border-radius: 10px;
            overflow: hidden;
            cursor: pointer;
            transition: transform 0.2s, box-shadow 0.2s;
        }

        .yt-video-card:hover {
            transform: translateY(-3px);
            box-shadow: 0 6px 20px rgba(0, 0, 0, 0.4);
        }

        .yt-video-card img {
            width: 100%;
            height: 150px;
            object-fit: cover;
        }

        .yt-video-info {
            padding: 12px;
        }

        .yt-video-info h3 {
            font-size: 13px;
            line-height: 1.4;
            margin-bottom: 4px;
            color: var(--vscode-editor-foreground, #cdd6f4);
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
        }

        .yt-video-info .channel {
            font-size: 12px;
            color: var(--vscode-descriptionForeground, #6c7086);
        }

        .yt-player-wrap {
            margin-bottom: 16px;
            border-radius: 10px;
            overflow: hidden;
            display: none;
        }

        .yt-player-wrap iframe {
            width: 100%;
            aspect-ratio: 16 / 9;
            border: none;
            border-radius: 10px;
        }

        .yt-now-playing {
            font-size: 14px;
            font-weight: 600;
            margin-bottom: 12px;
            display: none;
        }

        .yt-error {
            color: #f38ba8;
            font-size: 14px;
            margin-bottom: 12px;
            padding: 12px;
            background: rgba(243, 139, 168, 0.1);
            border-radius: 8px;
            display: none;
        }

        .yt-quick-btns {
            display: flex;
            gap: 8px;
            margin-bottom: 16px;
            flex-wrap: wrap;
        }

        .yt-quick-btns button {
            width: auto;
            padding: 8px 14px;
            font-size: 13px;
        }

        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(8px); }
            to { opacity: 1; transform: translateY(0); }
        }

        .fade-in { animation: fadeIn 0.3s ease-out; }
    </style>
</head>
<body>
    <h1>ProcrastiCode</h1>
    <p class="subtitle">Your developer break-time companion. Take a breather.</p>

    <!-- Tabs -->
    <div class="tabs">
        <button class="tab-btn active" onclick="switchTab('fun')">Fun Stuff</button>
        <button class="tab-btn" onclick="switchTab('youtube')">YouTube</button>
    </div>

    <!-- FUN TAB -->
    <div class="tab-content active" id="tab-fun">
        <div class="grid">
            <!-- Jokes Card -->
            <div class="card">
                <div class="card-header">
                    <span class="emoji">&#128514;</span>
                    <h2>Jokes</h2>
                </div>
                <div class="card-body">
                    <div class="content-text" id="joke-text">Click a button to get a joke!</div>
                    <div class="btn-row">
                        <button onclick="send('getDadJoke')">Dad Joke</button>
                        <button onclick="send('getChuckNorris')" class="secondary">Chuck Norris</button>
                    </div>
                </div>
            </div>

            <!-- Animal Pics Card -->
            <div class="card">
                <div class="card-header">
                    <span class="emoji">&#128054;</span>
                    <h2>Cute Animals</h2>
                </div>
                <div class="card-body">
                    <img id="animal-img" class="animal-img" alt="Cute animal"/>
                    <div class="animal-label" id="animal-label">Click for a random cute animal!</div>
                    <button onclick="send('getAnimal')">Show Me a Cute Animal</button>
                </div>
            </div>

            <!-- Fun Facts Card -->
            <div class="card">
                <div class="card-header">
                    <span class="emoji">&#128161;</span>
                    <h2>Useless Facts</h2>
                </div>
                <div class="card-body">
                    <div class="content-text" id="fact-text">Learn something completely useless!</div>
                    <button onclick="send('getFact')">Random Useless Fact</button>
                </div>
            </div>

            <!-- Trivia Card -->
            <div class="card">
                <div class="card-header">
                    <span class="emoji">&#129504;</span>
                    <h2>Trivia Quiz</h2>
                </div>
                <div class="card-body">
                    <div class="score-display" id="score">Score: 0 / 0</div>
                    <div class="trivia-meta" id="trivia-meta"></div>
                    <div class="trivia-question" id="trivia-question">Ready to test your knowledge?</div>
                    <div class="answers" id="trivia-answers"></div>
                    <button onclick="send('getTrivia')">New Question</button>
                </div>
            </div>
        </div>
    </div>

    <!-- YOUTUBE TAB -->
    <div class="tab-content" id="tab-youtube">
        <div class="card" style="max-width: 900px; margin: 0 auto;">
            <div class="card-header">
                <span class="emoji">&#9654;&#65039;</span>
                <h2>YouTube</h2>
            </div>
            <div class="card-body">
                <div class="yt-error" id="yt-error"></div>

                <!-- Player -->
                <div class="yt-now-playing" id="yt-now-playing"></div>
                <div class="yt-player-wrap" id="yt-player-wrap">
                    <iframe id="yt-player" src="" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
                </div>

                <!-- Search -->
                <div class="yt-search-bar">
                    <input type="text" id="yt-search-input" placeholder="Search YouTube..." />
                    <button onclick="ytSearch()" style="width: auto;">Search</button>
                </div>

                <!-- Quick search buttons -->
                <div class="yt-quick-btns">
                    <button class="secondary" onclick="ytQuick('trending')">Trending</button>
                    <button class="secondary" onclick="ytQuick('lofi hip hop')">Lofi Beats</button>
                    <button class="secondary" onclick="ytQuick('coding tutorials')">Coding</button>
                    <button class="secondary" onclick="ytQuick('tech news today')">Tech News</button>
                    <button class="secondary" onclick="ytQuick('funny fails compilation')">Funny Fails</button>
                </div>

                <!-- Results grid -->
                <div class="yt-video-grid" id="yt-results"></div>
            </div>
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();

        let triviaScore = 0;
        let triviaTotal = 0;
        let currentCorrect = '';

        function send(command, data) {
            vscode.postMessage({ command, ...data });
        }

        // --- Tabs ---
        function switchTab(tab) {
            document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
            document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
            document.getElementById('tab-' + tab).classList.add('active');
            event.target.classList.add('active');
        }

        // --- YouTube ---
        function ytSearch() {
            const input = document.getElementById('yt-search-input');
            const query = input.value.trim();
            if (!query) return;
            document.getElementById('yt-error').style.display = 'none';
            document.getElementById('yt-results').innerHTML = '<p style="text-align:center;opacity:0.5">Searching...</p>';
            vscode.postMessage({ command: 'youtubeSearch', query });
        }

        function ytQuick(query) {
            if (query === 'trending') {
                document.getElementById('yt-error').style.display = 'none';
                document.getElementById('yt-results').innerHTML = '<p style="text-align:center;opacity:0.5">Loading trending...</p>';
                vscode.postMessage({ command: 'youtubeTrending' });
                return;
            }
            document.getElementById('yt-search-input').value = query;
            document.getElementById('yt-error').style.display = 'none';
            document.getElementById('yt-results').innerHTML = '<p style="text-align:center;opacity:0.5">Searching...</p>';
            vscode.postMessage({ command: 'youtubeSearch', query });
        }

        function playVideo(videoId, title) {
            const wrap = document.getElementById('yt-player-wrap');
            const player = document.getElementById('yt-player');
            const label = document.getElementById('yt-now-playing');
            player.src = 'https://www.youtube-nocookie.com/embed/' + videoId + '?autoplay=1';
            wrap.style.display = 'block';
            label.textContent = 'Now Playing: ' + title;
            label.style.display = 'block';
            wrap.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }

        document.getElementById('yt-search-input').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') ytSearch();
        });

        // --- Messages ---
        window.addEventListener('message', (event) => {
            const msg = event.data;

            switch (msg.command) {
                case 'joke': {
                    const el = document.getElementById('joke-text');
                    el.innerHTML = msg.text + '<span class="source">\\u2014 ' + msg.source + '</span>';
                    el.className = 'content-text fade-in';
                    break;
                }

                case 'animal': {
                    const img = document.getElementById('animal-img');
                    const label = document.getElementById('animal-label');
                    img.src = msg.url;
                    img.style.display = 'block';
                    img.className = 'animal-img fade-in';
                    label.textContent = 'Random ' + msg.type + ' \\u2014 click again for another!';
                    break;
                }

                case 'fact': {
                    const el = document.getElementById('fact-text');
                    el.textContent = msg.text;
                    el.className = 'content-text fade-in';
                    break;
                }

                case 'trivia': {
                    currentCorrect = msg.correct;
                    document.getElementById('trivia-meta').textContent =
                        msg.category + ' | ' + msg.difficulty;
                    const qEl = document.getElementById('trivia-question');
                    qEl.textContent = msg.question;
                    qEl.className = 'trivia-question fade-in';

                    const answersEl = document.getElementById('trivia-answers');
                    answersEl.innerHTML = '';
                    msg.answers.forEach((ans) => {
                        const btn = document.createElement('button');
                        btn.className = 'answer-btn';
                        btn.textContent = ans;
                        btn.onclick = () => checkAnswer(ans, btn);
                        answersEl.appendChild(btn);
                    });
                    break;
                }

                case 'youtubeResults': {
                    const grid = document.getElementById('yt-results');
                    grid.innerHTML = '';
                    if (!msg.videos || msg.videos.length === 0) {
                        grid.innerHTML = '<p style="text-align:center;opacity:0.5">No results found.</p>';
                        return;
                    }
                    msg.videos.forEach((v) => {
                        const card = document.createElement('div');
                        card.className = 'yt-video-card';
                        card.onclick = () => playVideo(v.videoId, v.title);
                        card.innerHTML =
                            (v.thumbnail ? '<img src="' + v.thumbnail + '" alt="thumbnail"/>' : '') +
                            '<div class="yt-video-info">' +
                            '<h3>' + escapeHtml(v.title) + '</h3>' +
                            '<span class="channel">' + escapeHtml(v.channelTitle) + '</span>' +
                            '</div>';
                        grid.appendChild(card);
                    });
                    grid.className = 'yt-video-grid fade-in';
                    break;
                }

                case 'youtubeError': {
                    const errEl = document.getElementById('yt-error');
                    errEl.textContent = msg.text;
                    errEl.style.display = 'block';
                    document.getElementById('yt-results').innerHTML = '';
                    break;
                }

                case 'playVideo': {
                    playVideo(msg.videoId, msg.title);
                    break;
                }
            }
        });

        function checkAnswer(answer, btn) {
            triviaTotal++;
            const buttons = document.querySelectorAll('.answer-btn');
            buttons.forEach((b) => {
                b.disabled = true;
                if (b.textContent === currentCorrect) b.classList.add('correct');
            });
            if (answer === currentCorrect) {
                triviaScore++;
                btn.classList.add('correct');
            } else {
                btn.classList.add('wrong');
            }
            document.getElementById('score').textContent =
                'Score: ' + triviaScore + ' / ' + triviaTotal;
        }

        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }
    </script>
</body>
</html>`;
    }
}
