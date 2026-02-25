import * as https from 'https';

function fetchJson(url: string, headers: Record<string, string> = {}): Promise<any> {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const options = {
            hostname: urlObj.hostname,
            path: urlObj.pathname + urlObj.search,
            method: 'GET',
            headers: {
                'User-Agent': 'ProcrastiCode-VSCode-Extension',
                ...headers,
            },
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => (data += chunk));
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch {
                    reject(new Error(`Failed to parse JSON from ${url}`));
                }
            });
        });

        req.on('error', reject);
        req.setTimeout(10000, () => {
            req.destroy();
            reject(new Error(`Request to ${url} timed out`));
        });
        req.end();
    });
}

export interface Joke {
    text: string;
    source: string;
}

export interface TriviaQuestion {
    question: string;
    correctAnswer: string;
    incorrectAnswers: string[];
    allAnswers: string[];
    category: string;
    difficulty: string;
}

export interface RedditPost {
    title: string;
    url: string;
    permalink: string;
    score: number;
    author: string;
    subreddit: string;
    numComments: number;
    thumbnail: string;
}

export interface DevToArticle {
    title: string;
    url: string;
    user: string;
    tags: string;
    reactions: number;
    comments: number;
}

export interface LobstersStory {
    title: string;
    url: string;
    author: string;
    score: number;
    commentCount: number;
    permalink: string;
    tags: string;
}

export interface YouTubeVideo {
    title: string;
    videoId: string;
    channelTitle: string;
    description: string;
    thumbnail: string;
}

export interface YouTubeResult {
    videos: YouTubeVideo[];
    nextPageToken: string;
}

export async function getDadJoke(): Promise<Joke> {
    const data = await fetchJson('https://icanhazdadjoke.com/', {
        Accept: 'application/json',
    });
    return { text: data.joke, source: 'Dad Joke' };
}

export async function getChuckNorris(): Promise<Joke> {
    const data = await fetchJson(
        'https://api.chucknorris.io/jokes/random?category=dev'
    );
    return { text: data.value, source: 'Chuck Norris' };
}

export async function getRandomDog(): Promise<string> {
    const data = await fetchJson('https://dog.ceo/api/breeds/image/random');
    return data.message;
}

export async function getRandomCat(): Promise<string> {
    const data = await fetchJson('https://cataas.com/cat?json=true');
    return `https://cataas.com/cat/${data._id}`;
}

export async function getUselessFact(): Promise<string> {
    const data = await fetchJson(
        'https://uselessfacts.jsph.pl/api/v2/facts/random?language=en'
    );
    return data.text;
}

export async function getTriviaQuestion(): Promise<TriviaQuestion> {
    const data = await fetchJson(
        'https://opentdb.com/api.php?amount=1&type=multiple'
    );
    const q = data.results[0];

    const entities: Record<string, string> = {
        '&quot;': '"', '&#039;': "'", '&apos;': "'",
        '&amp;': '&', '&lt;': '<', '&gt;': '>',
        '&nbsp;': ' ', '&ndash;': '\u2013', '&mdash;': '\u2014',
        '&lsquo;': '\u2018', '&rsquo;': '\u2019',
        '&ldquo;': '\u201C', '&rdquo;': '\u201D',
        '&agrave;': '\u00E0', '&aacute;': '\u00E1', '&acirc;': '\u00E2', '&atilde;': '\u00E3', '&auml;': '\u00E4',
        '&egrave;': '\u00E8', '&eacute;': '\u00E9', '&ecirc;': '\u00EA', '&euml;': '\u00EB',
        '&igrave;': '\u00EC', '&iacute;': '\u00ED', '&icirc;': '\u00EE', '&iuml;': '\u00EF',
        '&ograve;': '\u00F2', '&oacute;': '\u00F3', '&ocirc;': '\u00F4', '&otilde;': '\u00F5', '&ouml;': '\u00F6',
        '&ugrave;': '\u00F9', '&uacute;': '\u00FA', '&ucirc;': '\u00FB', '&uuml;': '\u00FC',
        '&ntilde;': '\u00F1', '&ccedil;': '\u00E7', '&szlig;': '\u00DF',
        '&Agrave;': '\u00C0', '&Aacute;': '\u00C1', '&Eacute;': '\u00C9', '&Iacute;': '\u00CD',
        '&Oacute;': '\u00D3', '&Uacute;': '\u00DA', '&Ntilde;': '\u00D1',
    };
    const decode = (s: string) =>
        s
            .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
            .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
            .replace(/&[a-zA-Z]+;/g, (m) => entities[m] || m);

    const correct = decode(q.correct_answer);
    const incorrect = q.incorrect_answers.map(decode);
    const allAnswers = [...incorrect, correct].sort(() => Math.random() - 0.5);

    return {
        question: decode(q.question),
        correctAnswer: correct,
        incorrectAnswers: incorrect,
        allAnswers,
        category: decode(q.category),
        difficulty: q.difficulty,
    };
}

export type RedditFeed = 'technology' | 'programming' | 'webdev' | 'gadgets';

export async function getRedditPosts(
    subreddit: RedditFeed = 'technology',
    count: number = 10
): Promise<RedditPost[]> {
    const data = await fetchJson(
        `https://www.reddit.com/r/${subreddit}/hot.json?limit=${count}`
    );
    const posts = data.data.children
        .filter((child: any) => child.kind === 't3' && !child.data.stickied)
        .slice(0, count);

    return posts.map((child: any) => {
        const p = child.data;
        return {
            title: p.title || 'Untitled',
            url: p.url || `https://reddit.com${p.permalink}`,
            permalink: `https://reddit.com${p.permalink}`,
            score: p.score || 0,
            author: p.author || 'unknown',
            subreddit: p.subreddit_name_prefixed || `r/${subreddit}`,
            numComments: p.num_comments || 0,
            thumbnail: p.thumbnail && p.thumbnail.startsWith('http') ? p.thumbnail : '',
        };
    });
}

export async function getDevToPosts(count: number = 10): Promise<DevToArticle[]> {
    const data = await fetchJson(
        `https://dev.to/api/articles?per_page=${count}&top=1`
    );
    return data.map((a: any) => ({
        title: a.title || 'Untitled',
        url: a.url || '',
        user: a.user?.name || a.user?.username || 'unknown',
        tags: a.tag_list?.join(', ') || '',
        reactions: a.positive_reactions_count || 0,
        comments: a.comments_count || 0,
    }));
}

export async function getLobstersStories(count: number = 10): Promise<LobstersStory[]> {
    const data = await fetchJson('https://lobste.rs/hottest.json');
    return data.slice(0, count).map((s: any) => ({
        title: s.title || 'Untitled',
        url: s.url || s.comments_url || '',
        author: s.submitter_user?.username || 'unknown',
        score: s.score || 0,
        commentCount: s.comment_count || 0,
        permalink: s.comments_url || '',
        tags: s.tags?.join(', ') || '',
    }));
}

export async function searchYouTube(
    query: string,
    apiKey: string,
    count: number = 8,
    pageToken: string = ''
): Promise<YouTubeResult> {
    const q = encodeURIComponent(query);
    let url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=${count}&q=${q}&key=${apiKey}`;
    if (pageToken) { url += `&pageToken=${pageToken}`; }
    const data = await fetchJson(url);
    return {
        videos: (data.items || []).map((item: any) => ({
            title: item.snippet?.title || 'Untitled',
            videoId: item.id?.videoId || '',
            channelTitle: item.snippet?.channelTitle || '',
            description: item.snippet?.description || '',
            thumbnail: item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url || '',
        })),
        nextPageToken: data.nextPageToken || '',
    };
}

export async function getYouTubeTrending(
    apiKey: string,
    count: number = 8,
    pageToken: string = ''
): Promise<YouTubeResult> {
    let url = `https://www.googleapis.com/youtube/v3/videos?part=snippet&chart=mostPopular&regionCode=US&maxResults=${count}&key=${apiKey}`;
    if (pageToken) { url += `&pageToken=${pageToken}`; }
    const data = await fetchJson(url);
    return {
        videos: (data.items || []).map((item: any) => ({
            title: item.snippet?.title || 'Untitled',
            videoId: item.id || '',
            channelTitle: item.snippet?.channelTitle || '',
            description: item.snippet?.description || '',
            thumbnail: item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url || '',
        })),
        nextPageToken: data.nextPageToken || '',
    };
}
