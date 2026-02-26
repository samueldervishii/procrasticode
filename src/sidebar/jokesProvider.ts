import * as vscode from "vscode";
import { getDadJoke, getChuckNorris, getUselessFact } from "../api/apis";

type ItemType = "dad-joke" | "chuck-norris" | "useless-fact" | "header";

export class JokeItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly itemType: ItemType,
    collapsible: vscode.TreeItemCollapsibleState = vscode
      .TreeItemCollapsibleState.None,
  ) {
    super(label, collapsible);

    if (itemType === "header") {
      this.iconPath = new vscode.ThemeIcon(
        itemType === "header" ? "symbol-folder" : "smiley",
      );
      return;
    }

    this.iconPath = new vscode.ThemeIcon(
      itemType === "dad-joke"
        ? "smiley"
        : itemType === "chuck-norris"
          ? "flame"
          : "lightbulb",
    );

    this.command = {
      command: "procrasticode.fetchJoke",
      title: "Get Joke",
      arguments: [itemType],
    };

    this.tooltip = `Click to get a random ${label.toLowerCase()}`;
  }
}

export class JokesProvider implements vscode.TreeDataProvider<JokeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<
    JokeItem | undefined
  >();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  refresh(): void {
    this._onDidChangeTreeData.fire(undefined);
  }

  getTreeItem(element: JokeItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: JokeItem): JokeItem[] {
    if (element) {
      return [];
    }

    return [
      new JokeItem("Dad Joke", "dad-joke"),
      new JokeItem("Chuck Norris Fact", "chuck-norris"),
      new JokeItem("Useless Fun Fact", "useless-fact"),
    ];
  }

  async fetchAndShow(type: ItemType): Promise<void> {
    try {
      let text: string;
      let title: string;

      switch (type) {
        case "dad-joke": {
          const joke = await getDadJoke();
          text = joke.text;
          title = "Dad Joke";
          break;
        }
        case "chuck-norris": {
          const joke = await getChuckNorris();
          text = joke.text;
          title = "Chuck Norris";
          break;
        }
        case "useless-fact": {
          text = await getUselessFact();
          title = "Fun Fact";
          break;
        }
        default:
          return;
      }

      const action = await vscode.window.showInformationMessage(
        `${title}: ${text}`,
        "Another One!",
      );
      if (action === "Another One!") {
        this.fetchAndShow(type);
      }
    } catch (err: any) {
      vscode.window.showErrorMessage(
        `ProcrastiCode: Failed to fetch — ${err.message}`,
      );
    }
  }
}
