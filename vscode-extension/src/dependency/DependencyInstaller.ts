import { Webview, Disposable } from "vscode";
import { Logger } from "../Logger";
import { installNodeModulesAsync, resolvePackageManager } from "../utilities/packageManager";
import { DependencyChecker } from "./DependencyChecker";
import { getWorkspacePath } from "../utilities/common";
import { command } from "../utilities/subprocess";
import { getIosSourceDir } from "../builders/buildIOS";

export class DependencyInstaller implements Disposable {
  private webview: Webview;
  private dependencyChecker: DependencyChecker;
  private disposables: Disposable[] = [];

  constructor(webview: Webview) {
    this.webview = webview;
    this.dependencyChecker = new DependencyChecker(webview);
  }

  public dispose() {
    // Dispose of all disposables (i.e. commands) for the current webview panel
    while (this.disposables.length) {
      const disposable = this.disposables.pop();
      if (disposable) {
        disposable.dispose();
      }
    }
  }

  public setWebviewMessageListener() {
    Logger.debug("Setup dependency installer listeners.");
    this.webview.onDidReceiveMessage(
      (message: any) => {
        const command = message.command;

        switch (command) {
          case "installNodeModules":
            Logger.debug("Received installNodeModules command.");
            this.installNodeModules();
            return;
          case "installPods":
            Logger.debug("Received installPods command.");
            this.installPods();
            return;
        }
      },
      undefined,
      this.disposables
    );
  }

  public async installNodeModules() {
    const packageManager = await resolvePackageManager();
    Logger.debug(`Installing node modules using ${packageManager}`);
    this.webview.postMessage({
      command: "installingNodeModules",
    });

    await installNodeModulesAsync(packageManager);
    Logger.debug("Finished installing node modules!");
    await this.dependencyChecker.checkNodeModulesInstalled();
  }

  public async installPods() {
    Logger.debug("Installing pods");
    this.webview.postMessage({
      command: "installingPods",
    });

    await installIOSDependencies(getWorkspacePath());
    Logger.debug("Finished installing pods!");
    await this.dependencyChecker.checkPodsInstalled();
  }
}

export async function installIOSDependencies(workspaceDir: string) {
  const iosDirPath = getIosSourceDir(workspaceDir);

  if (!iosDirPath) {
    throw new Error(`ios directory was not found inside the workspace.`);
  }

  return command("pod install", {
    cwd: iosDirPath,
    env: {
      ...process.env,
      LANG: "en_US.UTF-8",
    },
  });
}