import "dotenv/config";
import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";
import pkg from "whatsapp-web.js";
import QRCode from "qrcode";

const { Client, LocalAuth } = pkg;

const WHATSAPP_ENABLED = true;
const CHROMIUM_PATH = "/snap/bin/chromium";
const AUTH_DATA_PATH = ".wwebjs_auth";
const SESSION_PATH = path.join(process.cwd(), AUTH_DATA_PATH, "session");
const ERRO_SESSAO_QUEBRADA =
  "WhatsApp Web perdeu a sessao interna. Clique em Sair do WhatsApp, conecte novamente e tente o disparo de novo.";

let estado = WHATSAPP_ENABLED ? "aguardando" : "desativado"; // desativado | aguardando | qr_pendente | pronto | desconectado | erro
let qrImagemBase64 = null;
let client = null;
let inicializando = false;
let reconexaoAutomatica = false;
let timerReconexao = null;
let geracaoClient = 0;
let ultimoErro = null;

function limparTimerReconexao() {
  if (timerReconexao) {
    clearTimeout(timerReconexao);
    timerReconexao = null;
  }
}

function removerLocksSessao() {
  for (const name of ["SingletonCookie", "SingletonLock", "SingletonSocket"]) {
    try {
      fs.rmSync(path.join(SESSION_PATH, name), { force: true, recursive: true });
    } catch {
      // Lock pode estar em uso se o Chromium ainda estiver encerrando.
    }
  }
}

function encerrarChromiumSessao() {
  if (process.platform === "win32") return;

  try {
    execFileSync("pkill", ["-f", SESSION_PATH], { stdio: "ignore" });
  } catch {
    // Nao havia Chromium usando esta sessao.
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function eventoAtual(geracao) {
  return geracao === geracaoClient;
}

function erroSessaoQuebrada(err) {
  return /detached\s+frame|execution context was destroyed|target closed|session closed|page crashed|browser.*disconnected|protocol error/i.test(
    err?.message || "",
  );
}

async function comTimeout(promise, ms) {
  let timer = null;
  try {
    return await Promise.race([
      promise,
      new Promise((resolve) => {
        timer = setTimeout(resolve, ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function criarClient(geracao) {
  const novoClient = new Client({
    authStrategy: new LocalAuth({ dataPath: AUTH_DATA_PATH }),
    takeoverOnConflict: true,
    takeoverTimeoutMs: 0,
    puppeteer: {
      executablePath: CHROMIUM_PATH,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
      headless: true,
    },
  });

  novoClient.on("qr", async (qr) => {
    if (!eventoAtual(geracao)) return;
    const imagem = await QRCode.toDataURL(qr);
    if (!eventoAtual(geracao)) return;
    estado = "qr_pendente";
    qrImagemBase64 = imagem;
    ultimoErro = null;
    console.log("[WhatsApp] QR Code gerado. Escaneie no painel.");
  });

  novoClient.on("ready", () => {
    if (!eventoAtual(geracao)) return;
    estado = "pronto";
    qrImagemBase64 = null;
    inicializando = false;
    ultimoErro = null;
    limparTimerReconexao();
    console.log("[WhatsApp] Cliente pronto!");
  });

  novoClient.on("auth_failure", (msg) => {
    if (!eventoAtual(geracao)) return;
    estado = "erro";
    qrImagemBase64 = null;
    inicializando = false;
    ultimoErro = msg || "Falha na autenticacao.";
    console.error("[WhatsApp] Falha na autenticacao:", msg);
  });

  novoClient.on("disconnected", (reason) => {
    if (!eventoAtual(geracao)) return;
    qrImagemBase64 = null;
    inicializando = false;
    client = null;
    ultimoErro = null;

    console.warn("[WhatsApp] Desconectado:", reason);

    if (!reconexaoAutomatica || !WHATSAPP_ENABLED) {
      estado = WHATSAPP_ENABLED ? "desconectado" : "desativado";
      limparTimerReconexao();
      return;
    }

    estado = "aguardando";
    limparTimerReconexao();
    timerReconexao = setTimeout(() => {
      iniciarWhatsApp().catch((err) => {
        estado = "erro";
        console.error("[WhatsApp] Erro ao reconectar:", err);
      });
    }, 10000);
  });

  novoClient.on("change_state", (state) => {
    if (!eventoAtual(geracao)) return;
    console.log("[WhatsApp] Estado alterado:", state);
  });

  return novoClient;
}

export async function iniciarWhatsApp() {
  if (!WHATSAPP_ENABLED) {
    estado = "desativado";
    qrImagemBase64 = null;
    ultimoErro = null;
    return false;
  }

  reconexaoAutomatica = true;

  if (client && ["aguardando", "qr_pendente", "pronto"].includes(estado)) {
    return true;
  }

  if (inicializando) return true;

  limparTimerReconexao();
  encerrarChromiumSessao();
  removerLocksSessao();
  inicializando = true;
  estado = "aguardando";
  qrImagemBase64 = null;
  ultimoErro = null;
  const geracao = ++geracaoClient;

  try {
    client = criarClient(geracao);
    await client.initialize();
    return true;
  } catch (err) {
    if (eventoAtual(geracao)) {
      client = null;
      inicializando = false;
      estado = "erro";
      qrImagemBase64 = null;
      ultimoErro = err?.message || "Erro ao iniciar WhatsApp.";
    }
    throw err;
  }
}

export async function aguardarWhatsAppPronto(timeoutMs = 45000) {
  const inicio = Date.now();

  while (Date.now() - inicio < timeoutMs) {
    if (estado === "pronto" && client) return true;
    if (["erro", "desativado"].includes(estado)) {
      throw new Error(ultimoErro || "WhatsApp nao ficou pronto.");
    }

    await sleep(500);
  }

  throw new Error(`WhatsApp nao ficou pronto a tempo. Estado atual: ${estado}.`);
}

export async function reiniciarWhatsApp() {
  if (!WHATSAPP_ENABLED) {
    estado = "desativado";
    qrImagemBase64 = null;
    ultimoErro = null;
    return false;
  }

  reconexaoAutomatica = true;
  limparTimerReconexao();
  qrImagemBase64 = null;
  ultimoErro = null;
  geracaoClient++;

  const atual = client;
  client = null;
  inicializando = false;
  estado = "aguardando";

  if (atual) {
    try {
      await comTimeout(atual.destroy(), 8000);
    } catch (err) {
      console.warn("[WhatsApp] Destroy durante reinicio nao finalizou:", err?.message || err);
    }
  }

  await iniciarWhatsApp();
  await aguardarWhatsAppPronto();
  return true;
}

async function validarWhatsAppPronto() {
  await aguardarWhatsAppPronto();

  const atual = client;
  if (!atual) throw new Error("WhatsApp nao conectado.");

  try {
    if (atual.pupBrowser && !atual.pupBrowser.isConnected()) {
      throw new Error("Browser do WhatsApp desconectado.");
    }

    if (!atual.pupPage || atual.pupPage.isClosed()) {
      throw new Error("Pagina do WhatsApp fechada.");
    }

    const state = await comTimeout(atual.getState(), 10000);
    if (state && ["CONFLICT", "UNPAIRED", "UNPAIRED_IDLE"].includes(state)) {
      throw new Error(`WhatsApp em estado invalido: ${state}.`);
    }

    return atual;
  } catch (err) {
    if (!erroSessaoQuebrada(err)) throw err;
    ultimoErro = ERRO_SESSAO_QUEBRADA;
    throw new Error(ERRO_SESSAO_QUEBRADA);
  }
}

export async function enviarMensagemWhatsApp(chatId, mensagem) {
  let ultimoEnvioErro = null;

  for (let tentativa = 1; tentativa <= 2; tentativa++) {
    try {
      const atual = await validarWhatsAppPronto();
      return await atual.sendMessage(chatId, mensagem);
    } catch (err) {
      ultimoEnvioErro = err;
      if (!erroSessaoQuebrada(err) && err?.message !== ERRO_SESSAO_QUEBRADA) throw err;
      if (tentativa === 2) break;

      console.warn("[WhatsApp] Sessao interna quebrou durante envio. Reiniciando client.");
      await reiniciarWhatsApp();
      await sleep(2000);
    }
  }

  ultimoErro = ERRO_SESSAO_QUEBRADA;
  throw new Error(ultimoEnvioErro?.message || ERRO_SESSAO_QUEBRADA);
}

export async function pararWhatsApp() {
  reconexaoAutomatica = false;
  limparTimerReconexao();
  qrImagemBase64 = null;
  ultimoErro = null;
  geracaoClient++;

  const atual = client;
  client = null;
  inicializando = false;
  estado = WHATSAPP_ENABLED ? "desconectado" : "desativado";

  if (!atual) return true;

  try {
    await comTimeout(atual.logout(), 8000);
  } catch (err) {
    console.warn("[WhatsApp] Logout nao finalizou:", err?.message || err);
    // Sessao sem login ativo ou ja encerrada.
  }

  try {
    await comTimeout(atual.destroy(), 8000);
  } catch (err) {
    console.warn("[WhatsApp] Destroy nao finalizou:", err?.message || err);
    // O Chromium pode ja ter sido finalizado.
  }

  return true;
}

export function getWhatsAppClient() {
  if (!client || estado !== "pronto") {
    throw new Error("WhatsApp nao conectado.");
  }
  return client;
}

export function getStatus() {
  return { estado, qr: qrImagemBase64, erro: ultimoErro };
}

if (WHATSAPP_ENABLED) {
  iniciarWhatsApp().catch((err) => {
    if (reconexaoAutomatica) {
      estado = "erro";
      ultimoErro = err?.message || "Erro ao iniciar WhatsApp.";
      console.error("[WhatsApp] Erro ao iniciar:", err);
    }
  });
} else {
  console.log("[WhatsApp] Desativado. Defina WHATSAPP_ENABLED=true para usar.");
}
