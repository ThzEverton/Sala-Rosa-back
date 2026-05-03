import pkg from 'whatsapp-web.js'
const { Client, LocalAuth } = pkg
import QRCode from 'qrcode'

let estado = 'aguardando' // 'aguardando' | 'qr_pendente' | 'pronto' | 'erro'
let qrImagemBase64 = null  // imagem PNG em base64 para o frontend


 const client = new Client({
  authStrategy: new LocalAuth({ dataPath: '.wwebjs_auth' }),
  puppeteer: {
  executablePath: '/snap/bin/chromium',
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
  headless: true,
},
})

client.on('qr', async (qr) => {
  estado = 'qr_pendente'
  // Gera a imagem do QR em base64
  qrImagemBase64 = await QRCode.toDataURL(qr)
  console.log('⚠️  QR Code gerado — escaneie pela interface ou pelo terminal.')
})

client.on('ready', () => {
  estado = 'pronto'
  qrImagemBase64 = null
  console.log('✅ WhatsApp conectado!')
})

client.on('auth_failure', () => {
  estado = 'erro'
  qrImagemBase64 = null
})

client.on('disconnected', () => {
  estado = 'aguardando'
  qrImagemBase64 = null
  client.initialize()
})

client.initialize()

export function getWhatsAppClient() { return client }
export function getStatus() { return { estado, qr: qrImagemBase64 } }