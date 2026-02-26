import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import mammoth from "mammoth";

export class DocxViewerPanel {
  public static currentPanel: DocxViewerPanel | undefined;
  private readonly panel: vscode.WebviewPanel;
  private disposables: vscode.Disposable[] = [];

  private constructor(
    panel: vscode.WebviewPanel,
    html: string,
    fileName: string,
  ) {
    this.panel = panel;
    this.panel.webview.html = this.getHtml(html, fileName);
    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
  }

  public static async createOrShow(fileUri?: vscode.Uri): Promise<void> {
    let uri = fileUri;
    if (!uri) {
      const picked = await vscode.window.showOpenDialog({
        canSelectMany: false,
        filters: { "Word Documents": ["docx"] },
        openLabel: "Open Word Document",
      });
      if (!picked || picked.length === 0) {
        return;
      }
      uri = picked[0];
    }

    const filePath = uri.fsPath;
    const fileName = path.basename(filePath);

    let docBuffer: Buffer;
    try {
      docBuffer = fs.readFileSync(filePath);
    } catch {
      vscode.window.showErrorMessage(
        `Failed to read Word document: ${filePath}`,
      );
      return;
    }

    let result;
    try {
      result = await mammoth.convertToHtml(
        { buffer: docBuffer },
        {
          convertImage: mammoth.images.imgElement(function (image: any) {
            return image.read("base64").then(function (imageBuffer: string) {
              return {
                src: "data:" + image.contentType + ";base64," + imageBuffer,
              };
            });
          }),
        },
      );
    } catch (err: any) {
      vscode.window.showErrorMessage(
        `Failed to convert Word document: ${err.message}`,
      );
      return;
    }

    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    if (DocxViewerPanel.currentPanel) {
      DocxViewerPanel.currentPanel.panel.reveal(column);
      DocxViewerPanel.currentPanel.panel.title = `Word: ${fileName}`;
      DocxViewerPanel.currentPanel.panel.webview.html =
        DocxViewerPanel.currentPanel.getHtml(result.value, fileName);
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      "procrasticodeDocx",
      `Word: ${fileName}`,
      column || vscode.ViewColumn.One,
      {
        enableScripts: false,
        retainContextWhenHidden: true,
      },
    );

    DocxViewerPanel.currentPanel = new DocxViewerPanel(
      panel,
      result.value,
      fileName,
    );
  }

  private dispose(): void {
    DocxViewerPanel.currentPanel = undefined;
    this.panel.dispose();
    while (this.disposables.length) {
      const d = this.disposables.pop();
      if (d) {
        d.dispose();
      }
    }
  }

  private getHtml(docHtml: string, fileName: string): string {
    return /*html*/ `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline';">
    <title>${this.escapeHtml(fileName)}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: var(--vscode-font-family, 'Segoe UI', sans-serif);
            background: var(--vscode-editor-background, #1e1e2e);
            color: var(--vscode-editor-foreground, #cdd6f4);
        }
        .toolbar {
            position: sticky;
            top: 0;
            z-index: 100;
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 10px 16px;
            background: var(--vscode-sideBar-background, #181825);
            border-bottom: 1px solid var(--vscode-widget-border, #313244);
        }
        .toolbar .filename {
            font-weight: 600;
            font-size: 14px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
        .toolbar .icon { font-size: 18px; }
        .doc-content {
            max-width: 800px;
            margin: 0 auto;
            padding: 40px 32px;
            line-height: 1.7;
            font-size: 15px;
        }
        .doc-content h1 {
            font-size: 28px;
            margin: 24px 0 12px;
            color: var(--vscode-editor-foreground, #cdd6f4);
            border-bottom: 1px solid var(--vscode-widget-border, #313244);
            padding-bottom: 8px;
        }
        .doc-content h2 {
            font-size: 22px;
            margin: 20px 0 10px;
            color: var(--vscode-editor-foreground, #cdd6f4);
        }
        .doc-content h3 {
            font-size: 18px;
            margin: 16px 0 8px;
            color: var(--vscode-editor-foreground, #cdd6f4);
        }
        .doc-content p {
            margin-bottom: 12px;
        }
        .doc-content ul, .doc-content ol {
            margin: 8px 0 12px 24px;
        }
        .doc-content li {
            margin-bottom: 4px;
        }
        .doc-content table {
            border-collapse: collapse;
            width: 100%;
            margin: 16px 0;
        }
        .doc-content th, .doc-content td {
            border: 1px solid var(--vscode-widget-border, #313244);
            padding: 8px 12px;
            text-align: left;
        }
        .doc-content th {
            background: var(--vscode-sideBar-background, #181825);
            font-weight: 600;
        }
        .doc-content img {
            max-width: 100%;
            height: auto;
            border-radius: 8px;
            margin: 12px 0;
        }
        .doc-content a {
            color: var(--vscode-textLink-foreground, #89b4fa);
        }
        .doc-content blockquote {
            border-left: 3px solid var(--vscode-button-background, #89b4fa);
            padding: 8px 16px;
            margin: 12px 0;
            opacity: 0.85;
        }
        .doc-content pre, .doc-content code {
            background: var(--vscode-textCodeBlock-background, #313244);
            padding: 2px 6px;
            border-radius: 4px;
            font-family: var(--vscode-editor-font-family, monospace);
            font-size: 13px;
        }
        .doc-content pre {
            padding: 12px 16px;
            overflow-x: auto;
            margin: 12px 0;
        }
        .empty-doc {
            text-align: center;
            padding: 60px;
            opacity: 0.5;
            font-size: 16px;
        }
    </style>
</head>
<body>
    <div class="toolbar">
        <span class="icon">DOC</span>
        <span class="filename" title="${this.escapeHtml(fileName)}">${this.escapeHtml(fileName)}</span>
    </div>
    <div class="doc-content">
        ${docHtml || '<div class="empty-doc">This document appears to be empty.</div>'}
    </div>
</body>
</html>`;
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
}
