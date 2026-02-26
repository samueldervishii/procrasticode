import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";

export class PdfViewerPanel {
  public static currentPanel: PdfViewerPanel | undefined;
  private readonly panel: vscode.WebviewPanel;
  private disposables: vscode.Disposable[] = [];

  private constructor(
    panel: vscode.WebviewPanel,
    pdfBase64: string,
    fileName: string,
    extensionUri: vscode.Uri,
  ) {
    this.panel = panel;
    this.panel.webview.html = this.getHtml(pdfBase64, fileName, extensionUri);
    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
  }

  public static async createOrShow(
    extensionUri: vscode.Uri,
    fileUri?: vscode.Uri,
  ): Promise<void> {
    let uri = fileUri;
    if (!uri) {
      const picked = await vscode.window.showOpenDialog({
        canSelectMany: false,
        filters: { "PDF Files": ["pdf"] },
        openLabel: "Open PDF",
      });
      if (!picked || picked.length === 0) {
        return;
      }
      uri = picked[0];
    }

    const filePath = uri.fsPath;
    const fileName = path.basename(filePath);

    let pdfBytes: Buffer;
    try {
      pdfBytes = fs.readFileSync(filePath);
    } catch {
      vscode.window.showErrorMessage(`Failed to read PDF file: ${filePath}`);
      return;
    }

    const pdfBase64 = pdfBytes.toString("base64");

    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    if (PdfViewerPanel.currentPanel) {
      PdfViewerPanel.currentPanel.panel.reveal(column);
      PdfViewerPanel.currentPanel.panel.webview.html =
        PdfViewerPanel.currentPanel.getHtml(pdfBase64, fileName, extensionUri);
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      "procrasticodePdf",
      `PDF: ${fileName}`,
      column || vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.joinPath(extensionUri, "node_modules", "pdfjs-dist"),
        ],
      },
    );

    PdfViewerPanel.currentPanel = new PdfViewerPanel(
      panel,
      pdfBase64,
      fileName,
      extensionUri,
    );
  }

  private dispose(): void {
    PdfViewerPanel.currentPanel = undefined;
    this.panel.dispose();
    while (this.disposables.length) {
      const d = this.disposables.pop();
      if (d) {
        d.dispose();
      }
    }
  }

  private getHtml(
    pdfBase64: string,
    fileName: string,
    extensionUri: vscode.Uri,
  ): string {
    const webview = this.panel.webview;
    const pdfjsDir = vscode.Uri.joinPath(
      extensionUri,
      "node_modules",
      "pdfjs-dist",
      "build",
    );
    const pdfjsUri = webview.asWebviewUri(
      vscode.Uri.joinPath(pdfjsDir, "pdf.mjs"),
    );
    const workerUri = webview.asWebviewUri(
      vscode.Uri.joinPath(pdfjsDir, "pdf.worker.mjs"),
    );

    return /*html*/ `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src ${webview.cspSource} 'unsafe-inline' blob:; style-src 'unsafe-inline'; img-src data: blob:; worker-src ${webview.cspSource} blob:; connect-src blob: data:;">
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
            justify-content: center;
            gap: 12px;
            padding: 10px 16px;
            background: var(--vscode-sideBar-background, #181825);
            border-bottom: 1px solid var(--vscode-widget-border, #313244);
        }
        .toolbar button {
            background: var(--vscode-button-background, #89b4fa);
            color: var(--vscode-button-foreground, #1e1e2e);
            border: none;
            padding: 6px 14px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 13px;
            font-weight: 600;
        }
        .toolbar button:hover { opacity: 0.85; }
        .toolbar button:disabled { opacity: 0.4; cursor: default; }
        .toolbar button.secondary {
            background: var(--vscode-button-secondaryBackground, #313244);
            color: var(--vscode-button-secondaryForeground, #cdd6f4);
        }
        .toolbar span {
            font-size: 13px;
            min-width: 90px;
            text-align: center;
        }
        .toolbar .filename {
            font-weight: 600;
            margin-right: auto;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            max-width: 200px;
        }
        .toolbar .spacer { margin-left: auto; }
        #pdf-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 20px;
            gap: 16px;
        }
        #pdf-container canvas {
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
            max-width: 100%;
            height: auto !important;
        }
        .loading {
            text-align: center;
            padding: 60px;
            font-size: 16px;
            opacity: 0.6;
        }
    </style>
</head>
<body>
    <div class="toolbar">
        <span class="filename" title="${this.escapeHtml(fileName)}">${this.escapeHtml(fileName)}</span>
        <button class="secondary" id="btn-prev" onclick="prevPage()" disabled>Prev</button>
        <span id="page-info">Loading...</span>
        <button class="secondary" id="btn-next" onclick="nextPage()" disabled>Next</button>
        <button class="secondary" onclick="zoomOut()">-</button>
        <span id="zoom-level">100%</span>
        <button class="secondary" onclick="zoomIn()">+</button>
        <button class="secondary" onclick="fitWidth()">Fit</button>
        <span class="spacer"></span>
    </div>
    <div id="pdf-container">
        <div class="loading">Loading PDF...</div>
    </div>

    <script type="module">
        import * as pdfjsLib from '${pdfjsUri}';
        pdfjsLib.GlobalWorkerOptions.workerSrc = '${workerUri}';

        const pdfBase64 = '${pdfBase64}';
        const pdfData = Uint8Array.from(atob(pdfBase64), c => c.charCodeAt(0));

        let pdfDoc = null;
        let currentPage = 1;
        let scale = 1.0;
        let rendering = false;

        async function loadPdf() {
            try {
                pdfDoc = await pdfjsLib.getDocument({ data: pdfData }).promise;
                document.getElementById('page-info').textContent =
                    'Page ' + currentPage + ' / ' + pdfDoc.numPages;
                document.getElementById('btn-prev').disabled = false;
                document.getElementById('btn-next').disabled = false;
                await renderPage(currentPage);
            } catch (err) {
                document.getElementById('pdf-container').innerHTML =
                    '<div class="loading">Failed to load PDF: ' + err.message + '</div>';
            }
        }

        async function renderPage(num) {
            if (rendering || !pdfDoc) return;
            rendering = true;
            const container = document.getElementById('pdf-container');
            container.innerHTML = '';

            try {
                const page = await pdfDoc.getPage(num);
                const viewport = page.getViewport({ scale });
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = viewport.width;
                canvas.height = viewport.height;
                container.appendChild(canvas);

                await page.render({ canvasContext: ctx, viewport }).promise;
                document.getElementById('page-info').textContent =
                    'Page ' + num + ' / ' + pdfDoc.numPages;
                document.getElementById('btn-prev').disabled = num <= 1;
                document.getElementById('btn-next').disabled = num >= pdfDoc.numPages;
            } catch (err) {
                container.innerHTML = '<div class="loading">Error rendering page: ' + err.message + '</div>';
            }
            rendering = false;
        }

        window.prevPage = function() {
            if (currentPage <= 1) return;
            currentPage--;
            renderPage(currentPage);
        };

        window.nextPage = function() {
            if (!pdfDoc || currentPage >= pdfDoc.numPages) return;
            currentPage++;
            renderPage(currentPage);
        };

        window.zoomIn = function() {
            scale = Math.min(scale + 0.25, 4.0);
            document.getElementById('zoom-level').textContent = Math.round(scale * 100) + '%';
            renderPage(currentPage);
        };

        window.zoomOut = function() {
            scale = Math.max(scale - 0.25, 0.25);
            document.getElementById('zoom-level').textContent = Math.round(scale * 100) + '%';
            renderPage(currentPage);
        };

        window.fitWidth = function() {
            if (!pdfDoc) return;
            pdfDoc.getPage(currentPage).then(page => {
                const defaultViewport = page.getViewport({ scale: 1.0 });
                const containerWidth = document.getElementById('pdf-container').clientWidth - 40;
                scale = containerWidth / defaultViewport.width;
                document.getElementById('zoom-level').textContent = Math.round(scale * 100) + '%';
                renderPage(currentPage);
            });
        };

        loadPdf();
    </script>
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
