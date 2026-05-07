import "dotenv/config";
import pkg from "whatsapp-web.js";
import QRCode from "qrcode";

const { Client, LocalAuth } = pkg;

const WHATSAPP_ENABLED = process.env.WHATSAPP_ENABLED === "true";

let estado = "desativado"; // desativado | aguardando | qr_pendente | pronto | erro
let qrImagemBase64 = null;
let client = null;
let inicializando = false;
let reconexaoAutomatica = false;
let timerReconexao = null;

function limparTimerReconexao() {
  if (timerReconexao) {
    clearTimeout(timerReconexao);
    timerReconexao = null;
  }
}

function criarClient() {
  const novoClient = new Client({
    authStrategy: new LocalAuth({ dataPath: ".wwebjs_auth" }),
    puppeteer: {
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
      headless: true,
    },
  });

  novoClient.on("qr", async (qr) => {
    estado = "qr_pendente";
    qrImagemBase64 = await QRCode.toDataURL(qr);
    console.log("[WhatsApp] QR Code gerado. Escaneie no painel.");
  });

  novoClient.on("ready", () => {
    estado = "pronto";
    qrImagemBase64 = null;
    inicializando = false;
    limparTimerReconexao();
    console.log("[WhatsApp] Cliente pronto!");
  });

  novoClient.on("auth_failure", (msg) => {
    estado = "erro";
    qrImagemBase64 = null;
    inicializando = false;
    console.error("[WhatsApp] Falha na autenticacao:", msg);
  });

  novoClient.on("disconnected", (reason) => {
    qrImagemBase64 = null;
    inicializando = false;
    client = null;

    console.warn("[WhatsApp] Desconectado:", reason);

    if (!reconexaoAutomatica || !WHATSAPP_ENABLED) {
      estado = "desativado";
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

  try {
    client = criarClient();
    await client.initialize();
    return true;
  } catch (err) {
    client = null;
    inicializando = false;
    estado = "erro";
    qrImagemBase64 = null;
    throw err;
  }
}

export async function pararWhatsApp() {
  reconexaoAutomatica = false;
  limparTimerReconexao();
  qrImagemBase64 = null;

  const atual = client;
  client = null;
  inicializando = false;
  estado = "desativado";

  if (!atual) return true;

  try {
    await atual.logout();
  } catch {
    // Sessao sem login ativo ou ja encerrada.
  }

  try {
    await atual.destroy();
  } catch {
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
  return { estado, qr: qrImagemBase64 };
}

if (WHATSAPP_ENABLED) {
  iniciarWhatsApp().catch((err) => {
    estado = "erro";
    console.error("[WhatsApp] Erro ao iniciar:", err);
  });
} else {
  console.log("[WhatsApp] Desativado. Defina WHATSAPP_ENABLED=true para usar.");
}
