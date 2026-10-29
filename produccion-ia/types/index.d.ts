export type Entrada = {
  id: string
  hora: string
  plano: string
  herramienta: string
  modelo: string
  detalle: string
  prompt: string
  estado: 'enviado' | 'cotizado' | 'error'
  costo: number | null
  jobs: string[]
}

export type Saldo = { inicio: number | null; actual: number | null }

export type Meta = { proyecto: string; plano: string; techo: number | null }

declare module 'claude-code' {
  interface PluginState {
    'produccion-ia': {
      entradas: Shaped<Entrada[]>
      saldo: Saldo
      meta: Meta
    }
  }
}
