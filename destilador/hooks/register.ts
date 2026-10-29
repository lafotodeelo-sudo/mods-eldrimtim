import type { EngineInterface, Register } from 'claude-code'

import { INSTRUCCIONES } from './instrucciones'

// Desde cuántas palabras un mensaje se considera dictado y se destila.
const UMBRAL_INICIAL = 90
// Un mensaje que empieza así pasa tal cual, sin destilar.
const CRUDO = /^\s*crudo:\s*/i

type Ajustes = { activo: boolean; umbral: number }

const leerAjustes = async ($: EngineInterface): Promise<Ajustes> => {
  const guardado = (await $.store.get('ajustes')) as Partial<Ajustes> | undefined

  return {
    activo: guardado?.activo ?? true,
    umbral: guardado?.umbral ?? UMBRAL_INICIAL,
  }
}

const contarPalabras = (texto: string) =>
  texto.trim().split(/\s+/).filter(Boolean).length

// Código o markdown ya armado: eso no es un dictado.
const yaEstructurado = (texto: string) =>
  texto.includes('```') || /^#{1,3} /m.test(texto)

const destilar = async ($: EngineInterface, texto: string) => {
  $.ui.status('Destilando tu mensaje…')
  try {
    const r = await $.model.complete({
      model: 'sonnet',
      system: [{ text: INSTRUCCIONES, cache: true }],
      prompt: `Dictado de Eloy, tal como llegó:\n\n<dictado>\n${texto}\n</dictado>`,
      maxTokens: 4000,
      effort: 'medium',
      timeoutMs: 90_000,
    })

    return r.isAnswered && r.text.trim() ? r.text.trim() : undefined
  } finally {
    $.ui.status(undefined)
  }
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'destilar',
      description: 'Convierte un texto en prompt limpio y te lo devuelve, sin enviarlo',
      argumentHint: '<texto>',
    })
    await $.command.register({
      name: 'destilador',
      description: 'Estado del destilador; on, off o umbral <palabras>',
      argumentHint: '[on | off | umbral <n>]',
    })

    return next(e)
  })

  on('prompt.submit', async ($, e, next) => {
    const esDePersona = e.origin.kind === 'composer' || e.origin.kind === 'bridge'
    if (e.command || e.isMeta || !esDePersona) {
      return next(e)
    }

    if (CRUDO.test(e.text)) {
      return next({ ...e, text: e.text.replace(CRUDO, '') })
    }

    const ajustes = await leerAjustes($)
    const palabras = contarPalabras(e.text)
    if (!ajustes.activo || palabras < ajustes.umbral || yaEstructurado(e.text)) {
      return next(e)
    }

    const prompt = await destilar($, e.text)
    if (!prompt) {
      $.ui.toast('No pude destilar el mensaje: va tal cual lo escribiste')

      return next(e)
    }

    $.ui.toast(`Destilado: ${palabras} → ${contarPalabras(prompt)} palabras`)

    const original = [
      'El mensaje de arriba lo reconstruyó el mod destilador a partir de un dictado de Eloy.',
      'Este es el original. Si contradice al destilado, manda el original.',
      '',
      '<original>',
      e.text,
      '</original>',
    ].join('\n')

    return next({ ...e, text: prompt, context: [...(e.context ?? []), original] })
  })

  on('command.run', { command: 'destilar' }, async ($, e) => {
    if (!e.args.trim()) {
      return { text: 'Uso: /destilar <tu texto>. Te devuelvo el prompt limpio para copiar.' }
    }

    const prompt = await destilar($, e.args)

    return { text: prompt ?? 'No pude destilarlo esta vez. Probá de nuevo.' }
  })

  on('command.run', { command: 'destilador' }, async ($, e) => {
    const ajustes = await leerAjustes($)
    const [orden, valor] = e.args.trim().toLowerCase().split(/\s+/)

    if (orden === 'on' || orden === 'off') {
      ajustes.activo = orden === 'on'
    } else if (orden === 'umbral' && Number(valor) > 0) {
      ajustes.umbral = Math.round(Number(valor))
    } else if (orden) {
      return { text: 'Opciones: /destilador on, /destilador off, /destilador umbral 120' }
    }
    await $.store.set('ajustes', ajustes)

    return {
      text: ajustes.activo
        ? `Destilador encendido: destila mensajes desde ${ajustes.umbral} palabras. Empezá con "crudo:" para mandar uno tal cual.`
        : 'Destilador apagado. /destilador on para volver a encenderlo.',
    }
  })
}
