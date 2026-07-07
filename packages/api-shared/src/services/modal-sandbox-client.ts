import type { App, ModalClient } from 'modal'

let _client: ModalClient | null = null
let _appPromise: Promise<App> | null = null

function getModalClient(): ModalClient {
  if (!_client) {
    const tokenId = process.env.MODAL_TOKEN_ID
    const tokenSecret = process.env.MODAL_TOKEN_SECRET
    if (!tokenId || !tokenSecret) {
      throw new Error('MODAL_TOKEN_ID and MODAL_TOKEN_SECRET must be set')
    }
    const { ModalClient: MC } = require('modal') as {
      ModalClient: new (opts: { tokenId: string; tokenSecret: string }) => ModalClient
    }
    _client = new MC({ tokenId, tokenSecret })
  }
  return _client
}

export function getModalApp(): Promise<App> {
  if (_appPromise === null) {
    const appName = process.env.MODAL_APP_NAME || 'vibey-spaces-staging'
    const client = getModalClient()
    _appPromise = client.apps.fromName(appName, { createIfMissing: true })
  }
  return _appPromise
}

export function getModalSandboxClient(): ModalClient {
  return getModalClient()
}

export function getModalImageBuilder() {
  return getModalClient().images
}
