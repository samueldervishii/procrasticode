import * as vscode from 'vscode';
import {
    getRedditPosts,
    getDevToPosts,
    getLobstersStories,
    RedditPost,
    DevToArticle,
    LobstersStory,
    RedditFeed,
} from '../api/apis';

type FeedSource =
    | { type: 'reddit'; feed: RedditFeed }
    | { type: 'devto' }
    | { type: 'lobsters' };

class FeedGroupItem extends vscode.TreeItem {
    constructor(
        public readonly source: FeedSource,
        public readonly displayName: string,
        icon: string
    ) {
        super(displayName, vscode.TreeItemCollapsibleState.Collapsed);
        this.iconPath = new vscode.ThemeIcon(icon);
        this.contextValue = 'feedGroup';
    }
}

class PostItem extends vscode.TreeItem {
    constructor(label: string, tooltip: string, description: string, url: string) {
        super(label, vscode.TreeItemCollapsibleState.None);
        this.tooltip = tooltip;
        this.description = description;
        this.iconPath = new vscode.ThemeIcon('arrow-up');
        this.command = {
            command: 'vscode.open',
            title: 'Open in Browser',
            arguments: [vscode.Uri.parse(url)],
        };
    }
}

type TreeNode = FeedGroupItem | PostItem;

export class NewsProvider implements vscode.TreeDataProvider<TreeNode> {
    private _onDidChangeTreeData = new vscode.EventEmitter<TreeNode | undefined>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    private cache = new Map<string, PostItem[]>();
    private loading = new Set<string>();

    private feeds: { source: FeedSource; label: string; icon: string }[] = [
        { source: { type: 'devto' }, label: 'Dev.to', icon: 'book' },
        { source: { type: 'lobsters' }, label: 'Lobsters', icon: 'bug' },
        { source: { type: 'reddit', feed: 'technology' }, label: 'r/technology', icon: 'rss' },
        { source: { type: 'reddit', feed: 'programming' }, label: 'r/programming', icon: 'rss' },
        { source: { type: 'reddit', feed: 'webdev' }, label: 'r/webdev', icon: 'rss' },
        { source: { type: 'reddit', feed: 'gadgets' }, label: 'r/gadgets', icon: 'rss' },
    ];

    refresh(): void {
        this.cache.clear();
        this._onDidChangeTreeData.fire(undefined);
    }

    getTreeItem(element: TreeNode): vscode.TreeItem {
        return element;
    }

    private getCacheKey(source: FeedSource): string {
        if (source.type === 'reddit') {
            return `reddit:${source.feed}`;
        }
        return source.type;
    }

    async getChildren(element?: TreeNode): Promise<TreeNode[]> {
        if (!element) {
            return this.feeds.map(
                (f) => new FeedGroupItem(f.source, f.label, f.icon)
            );
        }

        if (!(element instanceof FeedGroupItem)) {
            return [];
        }

        const key = this.getCacheKey(element.source);

        if (this.cache.has(key)) {
            return this.cache.get(key)!;
        }

        if (this.loading.has(key)) {
            return [];
        }

        this.loading.add(key);

        try {
            let items: PostItem[];

            switch (element.source.type) {
                case 'reddit': {
                    const posts = await getRedditPosts(element.source.feed, 10);
                    items = posts.map(
                        (p, i) =>
                            new PostItem(
                                `${i + 1}. ${p.title}`,
                                `${p.title}\nby u/${p.author} | ${p.score} upvotes | ${p.numComments} comments`,
                                `${p.score} pts`,
                                p.permalink
                            )
                    );
                    break;
                }
                case 'devto': {
                    const articles = await getDevToPosts(10);
                    items = articles.map(
                        (a, i) =>
                            new PostItem(
                                `${i + 1}. ${a.title}`,
                                `${a.title}\nby ${a.user} | ${a.reactions} reactions | ${a.comments} comments\n${a.tags}`,
                                `${a.reactions} reactions`,
                                a.url
                            )
                    );
                    break;
                }
                case 'lobsters': {
                    const stories = await getLobstersStories(10);
                    items = stories.map(
                        (s, i) =>
                            new PostItem(
                                `${i + 1}. ${s.title}`,
                                `${s.title}\nby ${s.author} | ${s.score} pts | ${s.commentCount} comments\n${s.tags}`,
                                `${s.score} pts`,
                                s.url || s.permalink
                            )
                    );
                    break;
                }
            }

            this.cache.set(key, items);
            return items;
        } catch (err: any) {
            vscode.window.showErrorMessage(
                `ProcrastiCode: Failed to fetch ${element.displayName} — ${err.message}`
            );
            return [];
        } finally {
            this.loading.delete(key);
        }
    }
}
