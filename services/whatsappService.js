import "dotenv/config";
import pkg from "whatsapp-web.js";
import QRCode from "qrcode";

const { Client, LocalAuth } = pkg;

const WHATSAPP_ENABLED = process.env.WHATSAPP_ENABLED === "true";
const CHROMIUM_PATH = process.env.PUPPETEER_EXECUTABLE_PATH || "/snap/bin/chromium";

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

function eventoAtual(geracao) {
  return geracao === geracaoClient;
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
    authStrategy: new LocalAuth({ dataPath: ".wwebjs_auth" }),
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
