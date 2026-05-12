import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";

const root = process.cwd();
const sessionDir = path.join(root, ".wwebjs_auth", "session");

function runPowerShell(command) {
  if (process.platform !== "win32") return;

  try {
    execFileSync(
      "powershell.exe",
      ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", command],
      { stdio: "ignore" }
    );
  } catch {
    // Processo pode ja ter encerrado entre a busca e o Stop-Process.
  }
}

function runUnix(command, args) {
  if (process.platform === "win32") return;

  try {
    execFileSync(command, args, { stdio: "ignore" });
  } catch {
    // Processo pode nao existir ou ja ter encerrado.
  }
}

function stopOldBackend() {
  runPowerShell(`
    Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" |
      Where-Object { $_.CommandLine -like '*swagger.js*' -or $_.CommandLine -like '*server.js*' } |
      ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
  `);

  runUnix("pkill", ["-f", "node swagger.js"]);
  runUnix("pkill", ["-f", path.join(root, "server.js")]);
  runUnix("pkill", ["-f", "node server.js"]);
}

function stopPuppeteerChrome() {
  const authEscaped = path.join(root, ".wwebjs_auth").replace(/'/g, "''");
  runPowerShell(`
    Get-CimInstance Win32_Process -Filter "Name = 'chrome.exe'" |
      Where-Object { $_.CommandLine -like '*${authEscaped}*' } |
      ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
  `);

  runUnix("pkill", ["-f", path.join(root, ".wwebjs_auth", "session")]);
}

function removeChromeLocks() {
  if (!fs.existsSync(sessionDir)) return;

  for (const name of ["SingletonCookie", "SingletonLock", "SingletonSocket"]) {
    try {
      fs.rmSync(path.join(sessionDir, name), { force: true, recursive: true });
    } catch {
      // Lock ainda pode estar em uso por alguns milissegundos.
    }
  }
}

stopOldBackend();
stopPuppeteerChrome();
removeChromeLocks();

console.log("[WhatsApp] Limpeza de sessao concluida.");
