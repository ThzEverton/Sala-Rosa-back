/**
 * Copyright (c) 2020, Oracle and/or its affiliates. All rights reserved.
 * Software licenciado por UPL 1.0 ou Apache License 2.0.
 * Código adaptado por André e Fúlvio (UNOESTE/FIPP).
 */
import * as common from 'oci-common'

const configurationFilePath = process.env.OCI_CONFIG_FILE || '.oci/config'
const configProfile = process.env.OCI_CONFIG_PROFILE || 'DEFAULT'

let provider = null

function getProvider() {
  if (!provider) {
    provider = new common.ConfigFileAuthenticationDetailsProvider(configurationFilePath, configProfile)
  }

  return provider
}

export async function ociHttpRequest(uri, method, body = null) {
  try {
    const metodo = method.toUpperCase()
    const signer = new common.DefaultRequestSigner(getProvider())
    const httpRequest = {
      uri,
      headers: new Headers(),
      method: metodo,
    }

    if (['POST', 'PUT', 'PATCH'].includes(metodo) && body != null) {
      httpRequest.body = JSON.stringify(body)
      httpRequest.headers.set('content-type', 'application/json')
    }

    await signer.signHttpRequest(httpRequest)

    const requestEP = {
      method: metodo,
      headers: httpRequest.headers,
    }

    if (httpRequest.body) requestEP.body = httpRequest.body

    const response = await fetch(new Request(httpRequest.uri, requestEP))

    if (!response.ok) {
      const detalhe = await response.text()
      throw new Error(`Erro OCI HTTP ${response.status}: ${detalhe}`)
    }

    if (response.status === 204) return null

    const texto = await response.text()
    return texto ? JSON.parse(texto) : null
  } catch (error) {
    console.error('Erro na requisição OCI:', error)
    throw error
  }
}
