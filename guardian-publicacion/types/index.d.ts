export type Pendiente = {
  repo: string
  carpeta: string
  sinGuardar: number
  sinSubir: number
  sinRemoto: boolean
}

declare module 'claude-code' {
  interface PluginState {
    'guardian-publicacion': { pendientes: Pendiente[] }
  }
}
