import * as https from 'https';

export interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
}

export function sendChatMessage(
    apiKey: string,
    model: string,
    messages: ChatMessage[],
    onChunk: (text: string) => void
): Promise<string> {
    return new Promise((resolve, reject) => {
        const body = JSON.stringify({
            model,
            max_tokens: 4096,
            stream: true,
            messages,
        });

        const options = {
            hostname: 'api.anthropic.com',
            path: '/v1/messages',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01',
                'Content-Length': Buffer.byteLength(body),
            },
        };

        const req = https.request(options, (res) => {
            if (res.statusCode && res.statusCode >= 400) {
                let errorData = '';
                res.on('data', (chunk) => (errorData += chunk));
                res.on('end', () => {
                    let msg = `API error (HTTP ${res.statusCode})`;
                    try {
                        const parsed = JSON.parse(errorData);
                        msg = parsed.error?.message || msg;
                    } catch {}
                    reject(new Error(msg));
                });
                return;
            }

            let fullText = '';
            let buffer = '';

            res.on('data', (chunk: Buffer) => {
                buffer += chunk.toString();
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (!line.startsWith('data: ')) { continue; }
                    const jsonStr = line.slice(6).trim();
                    if (!jsonStr || jsonStr === '[DONE]') { continue; }

                    try {
                        const event = JSON.parse(jsonStr);
                        if (event.type === 'content_block_delta' && event.delta?.text) {
                            fullText += event.delta.text;
                            onChunk(event.delta.text);
                        }
                    } catch {}
                }
            });

            res.on('end', () => {
                resolve(fullText);
            });
        });

        req.on('error', (err) => reject(new Error(`Network error: ${err.message}`)));
        req.setTimeout(120000, () => {
            req.destroy();
            reject(new Error('Request timed out'));
        });
        req.write(body);
        req.end();
    });
}
