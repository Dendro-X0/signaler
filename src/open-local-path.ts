import { spawn } from "node:child_process";

export function openLocalPath(filePath: string): void {
  const platform = process.platform;
  const onError = (error: Error): void => {
    // eslint-disable-next-line no-console
    console.error(`Could not open: ${error.message}`);
  };

  if (platform === "win32") {
    spawn("cmd.exe", ["/d", "/s", "/c", "start", "", filePath], {
      detached: true,
      stdio: "ignore",
      windowsHide: true,
    }).on("error", onError);
    return;
  }
  if (platform === "darwin") {
    spawn("open", [filePath], { detached: true, stdio: "ignore" }).on("error", onError);
    return;
  }
  spawn("xdg-open", [filePath], { detached: true, stdio: "ignore" }).on("error", onError);
}
