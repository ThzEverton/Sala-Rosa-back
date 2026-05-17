import 'dotenv/config'
import { pathToFileURL } from 'node:url'
import { ociHttpRequest } from './ociHttpRequest.js'
import { enviarEmail } from './emailService.js'

const queueId =
  process.env.OCI_QUEUE_ID ||
  'ocid1.queue.oc1.phx.amaaaaaa62b2piaa4xaxgqaovrm4ny5u45obgfxtip73rj2fz6gajzzii6ba'
const queueRegion =
  process.env.OCI_QUEUE_ENDPOINT || 'https://cell-1.queue.messaging.us-phoenix-1.oci.oraclecloud.com'

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function extrairEmailDaMensagem(msgFila) {
  if (typeof msgFila.content === 'string') {
    try {
      return JSON.parse(msgFila.content)
    } catch {
      return { msg: msgFila.content }
    }
  }

  return msgFila.content || {}
}

export async function consumir() {
  try {
    console.log(`Aguardando mensagens na fila: ${queueId}`)

    while (true) {
      const retorno = await ociHttpRequest(
        `${queueRegion}/20210201/queues/${queueId}/messages?queueId=${queueId}&limit=10`,
        'GET'
      )

      const messages = retorno?.messages || []

      if (!messages.length) {
        console.log('Nenhuma mensagem disponível. Verificando novamente em alguns segundos...')
        await sleep(5000)
        continue
      }

      for (const msgFila of messages) {
        const conteudo = extrairEmailDaMensagem(msgFila)
        const destinatario = conteudo.email || conteudo.destinatario
        const assunto = conteudo.assunto || 'Teste Fila OCI'
        const html = conteudo.html || conteudo.msg || conteudo.corpoHtml
        const receipt = msgFila.receipt

        try {
          console.log('Mensagem recebida da fila OCI:', conteudo)
          await enviarEmail(destinatario, assunto, html)

          await ociHttpRequest(`${queueRegion}/20210201/queues/${queueId}/messages/${receipt}`, 'DELETE')
        } catch (ex) {
          console.error('Erro ao processar mensagem da fila OCI:', ex)

          await ociHttpRequest(`${queueRegion}/20210201/queues/${queueId}/messages/${receipt}`, 'PUT', {
            visibilityInSeconds: 30,
          })
        }
      }
    }
  } catch (err) {
    console.error('Erro ao consumir mensagens:', err)
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  consumir()
}


