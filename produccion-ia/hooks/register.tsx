import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Entrada, Meta, Saldo } from '../types'

const PANEL = 'produccion-ia'
const TITULO = 'Producción IA'

// Cambiar la etiqueta cuando cambien los campos de Entrada.
const entradas = atom({ plugin: 'produccion-ia', key: 'entradas' } as const, [], {
  shape: 'entradas-1',
})
const saldo = atom({ plugin: 'produccion-ia', key: 'saldo' } as const, {
  inicio: null,
  actual: null,
})
const meta = atom({ plugin: 'produccion-ia', key: 'meta' } as const, {
  proyecto: 'Sin proyecto',
  plano: '—',
  techo: null,
})

// Herramientas que generan o transforman y por eso gastan.
const HERRAMIENTA = /^mcp__(Higgsfield|Magnific)__(.+)$/
const GASTA =
  /generate|upscale|outpaint|reframe|remove_background|relight|motion_control|voice_change|dubbing|execute_preset|expand|restyle|retouch|reimagine|variations|extend|modify|speak|music|soundfx|sfx|tts|vfx|color_grade|lipsync|change_camera|skin_enhancer/
const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi

const guardar = async ($: EngineInterface) => {
  await $.store.set('entradas', await read($, entradas))
  await $.store.set('saldo', await read($, saldo))
  await $.store.set('meta', await read($, meta))
}

const consultarSaldo = async ($: EngineInterface) => {
  try {
    const r = await $.mcp.call('Higgsfield', 'balance')
    const bloque = r.content.find(b => b.type === 'text')
    const texto = bloque && 'text' in bloque ? String(bloque.text) : ''
    const credits = Number(JSON.parse(texto).credits)

    return Number.isFinite(credits) ? credits : null
  } catch {
    return null
  }
}

// Refresca el saldo y devuelve cuánto bajó desde la lectura anterior.
const refrescarSaldo = async ($: EngineInterface) => {
  const antes = (await read($, saldo)).actual
  const ahora = await consultarSaldo($)
  if (ahora === null) {
    return null
  }
  await update($, saldo, s => ({ inicio: s.inicio ?? ahora, actual: ahora }))

  return antes === null ? null : Math.round((antes - ahora) * 100) / 100
}

const parametros = (e: Record<string, unknown>): Record<string, unknown> => {
  const p = e.params
  if (typeof p === 'string') {
    try {
      return JSON.parse(p) as Record<string, unknown>
    } catch {
      return {}
    }
  }

  return p && typeof p === 'object' ? (p as Record<string, unknown>) : e
}

const describir = (p: Record<string, unknown>) =>
  [
    p.resolution,
    p.duration ? `${p.duration}s` : undefined,
    p.count ? `×${p.count}` : undefined,
    p.draft ? 'borrador' : undefined,
    p.draft_job_id ? 'finaliza' : undefined,
    p.mode,
  ]
    .filter(Boolean)
    .join(' ')

const primerNumero = (texto: string) => {
  const m =
    texto.match(/"(?:cost|credits|total_cost|price)"\s*:\s*(\d+(?:\.\d+)?)/i) ??
    texto.match(/(\d+(?:\.\d+)?)\s*credits?/i)

  return m ? Number(m[1]) : null
}

const hora = (ms: number) =>
  new Date(ms).toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit', hour12: false })


const bitacora = (lista: Entrada[], m: Meta) => {
  const lineas = lista
    .filter(x => x.estado === 'enviado')
    .map(x =>
      [
        x.id.slice(0, 10),
        x.plano,
        '—',
        x.detalle || '—',
        x.jobs.join(', ') || '—',
        x.costo ?? '?',
        '—',
        '—',
        '—',
        '—',
      ].join(' · '),
    )

  return [
    `BITÁCORA · ${m.proyecto}`,
    'fecha · plano · versión · toma · job_id · créditos · momentos utilizables · defectos medidos · diagnóstico · decisión',
    ...lineas,
  ].join('\n')
}

const gastoTotal = (s: Saldo) =>
  s.inicio !== null && s.actual !== null ? Math.round((s.inicio - s.actual) * 100) / 100 : 0

const vigilarTecho = async ($: EngineInterface, antes: number) => {
  const { techo } = await read($, meta)
  const ahora = gastoTotal(await read($, saldo))
  if (!techo) {
    return
  }
  if (antes < techo && ahora >= techo) {
    $.ui.toast(`Techo pasado: ${ahora} de ${techo} créditos. Se para y se habla con Elo.`)
  } else if (antes < techo * 0.8 && ahora >= techo * 0.8) {
    $.ui.toast(`Vas en el 80 % del techo: ${ahora} de ${techo} créditos`)
  }
}

const COMANDOS = [
  { name: 'produccion', description: 'Abre el panel de producción IA' },
  { name: 'proyecto', description: 'Empieza un proyecto nuevo en el panel', argumentHint: '<nombre>' },
  { name: 'plano', description: 'Marca el plano en que se está trabajando', argumentHint: '<plano>' },
  { name: 'techo', description: 'Fija el techo de créditos del proyecto', argumentHint: '<créditos>' },
  { name: 'bitacora', description: 'Muestra la bitácora del proyecto en el formato del método' },
  { name: 'cierre', description: 'Cierra el proyecto y propone qué aprender para el método' },
]

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    for (const c of COMANDOS) {
      await $.command.register(c)
    }

    // Lo guardado sobrevive a una sesión que se reanuda en el mismo contenedor.
    const guardadas = (await $.store.get('entradas')) as Entrada[] | undefined
    const guardadoSaldo = (await $.store.get('saldo')) as Saldo | undefined
    const guardadaMeta = (await $.store.get('meta')) as Meta | undefined
    if ((await read($, entradas)).length === 0 && guardadas) {
      await update($, entradas, () => guardadas)
    }
    if (guardadoSaldo && (await read($, saldo)).inicio === null) {
      await update($, saldo, () => guardadoSaldo)
    }
    if (guardadaMeta) {
      await update($, meta, () => guardadaMeta)
    }

    await refrescarSaldo($)
    void $.ui.open({ id: PANEL, title: TITULO })

    return next(e)
  })

  on('tool.call', async ($, e, next) => {
    const nombre = HERRAMIENTA.exec(e.tool)
    if (!nombre || !GASTA.test(nombre[2] ?? '')) {
      return next(e)
    }

    const servidor = nombre[1] ?? ''
    const p = parametros(e as unknown as Record<string, unknown>)
    const cotiza = p.get_cost === true
    const ms = await $.clock.now()
    const m = await read($, meta)
    const entrada: Entrada = {
      id: new Date(ms).toISOString(),
      hora: hora(ms),
      plano: m.plano,
      herramienta: `${servidor === 'Magnific' ? 'Magnific · ' : ''}${nombre[2]}`,
      modelo: typeof p.model === 'string' ? p.model : '',
      detalle: describir(p),
      prompt: typeof p.prompt === 'string' ? p.prompt.slice(0, 140) : '',
      estado: cotiza ? 'cotizado' : 'enviado',
      costo: null,
      jobs: [],
    }

    const corrida = await next(e)
    const texto = corrida.text ?? ''
    const antes = gastoTotal(await read($, saldo))

    if (corrida.deny !== undefined || corrida.isError) {
      entrada.estado = 'error'
    } else if (cotiza) {
      entrada.costo = primerNumero(texto)
    } else {
      entrada.jobs = [...new Set(texto.match(UUID) ?? [])].slice(0, 4)
      if (servidor === 'Higgsfield') {
        entrada.costo = await refrescarSaldo($)
      }
    }

    await update($, entradas, lista => [...lista, entrada].slice(-300))
    await vigilarTecho($, antes)
    await guardar($)

    return corrida
  }).catch(($, e, next) => next(e)) // el panel nunca frena una generación

  on('command.run', { command: 'produccion' }, async $ => {
    await refrescarSaldo($)
    await $.ui.open({ id: PANEL, title: TITULO })

    return { text: 'Panel de producción IA abierto.' }
  })

  on('command.run', { command: 'proyecto' }, async ($, e) => {
    const proyecto = e.args.trim()
    if (!proyecto) {
      return { text: `Proyecto actual: ${(await read($, meta)).proyecto}. Uso: /proyecto <nombre>` }
    }
    const ahora = await consultarSaldo($)
    await update($, entradas, () => [])
    await update($, saldo, () => ({ inicio: ahora, actual: ahora }))
    await update($, meta, () => ({ proyecto, plano: '—', techo: null }))
    await guardar($)
    await $.ui.open({ id: PANEL, title: TITULO })

    return { text: `Proyecto "${proyecto}" empezado. El gasto se cuenta desde ahora. Fijá el techo con /techo.` }
  })

  on('command.run', { command: 'plano' }, async ($, e) => {
    const plano = e.args.trim()
    if (!plano) {
      return { text: `Plano actual: ${(await read($, meta)).plano}. Uso: /plano <plano>` }
    }
    await update($, meta, m => ({ ...m, plano }))
    await guardar($)

    return { text: `Plano ${plano}: las generaciones se anotan ahí.` }
  })

  on('command.run', { command: 'techo' }, async ($, e) => {
    const techo = Number(e.args.trim().replace(/[.,\s]/g, ''))
    if (!(techo > 0)) {
      return { text: 'Uso: /techo <créditos>, por ejemplo /techo 5400' }
    }
    await update($, meta, m => ({ ...m, techo }))
    await guardar($)

    return { text: `Techo del proyecto: ${techo} créditos. Aviso al 80 % y al pasarlo.` }
  })

  on('command.run', { command: 'bitacora' }, async $ => {
    const texto = bitacora(await read($, entradas), await read($, meta))

    return { text: texto, context: [texto] }
  })

  on('command.run', { command: 'cierre' }, async $ => {
    await refrescarSaldo($)
    const m = await read($, meta)
    const s = await read($, saldo)
    const texto = [
      `Cierre de proyecto: ${m.proyecto}.`,
      `Gasto real medido por saldo: ${gastoTotal(s)} créditos${m.techo ? `, contra un techo de ${m.techo}` : ''}.`,
      '',
      bitacora(await read($, entradas), m),
      '',
      'Con esta bitácora y lo que pasó en esta conversación, compará el proyecto contra el Método IA · El Drim Tim vigente:',
      '1. Gasto contra ideal y techo, y en qué fase y plano se fue el exceso.',
      '2. Qué falló, con su causa y cuál de los cuatro diagnósticos fue.',
      '3. Qué funcionó y hay que repetir a propósito.',
      '4. Qué reglas "(a validar)" o pruebas abiertas quedaron confirmadas o descartadas con este proyecto.',
      '5. Los cambios concretos que propondrías al método, cada uno con su caso real. Lo que no tenga caso real va como hipótesis.',
      'No cambiés el método todavía: primero me mostrás la propuesta y yo apruebo.',
    ].join('\n')
    await $.prompt.submit({ text: texto, asUser: true })

    return { text: 'Cierre enviado: Claude arma la propuesta de aprendizajes para el método.' }
  })

  on('ui.render', { component: 'Pane', requestId: PANEL }, async ($, e) => {
    const { Box, Text, Button } = $.ui.resolve(e)
    const m = await read($, meta)
    const s = await read($, saldo)
    const lista = await read($, entradas)
    const gasto = gastoTotal(s)
    const pasado = m.techo !== null && gasto >= m.techo
    const cupo = Math.max(3, (e.viewport?.rows ?? 30) - 9)

    return (
      <Box flexDirection="column">
        <Text bold>{m.proyecto}</Text>
        <Text dimColor>Plano actual: {m.plano}</Text>
        <Text color={pasado ? 'red' : undefined} bold={pasado}>
          Gasto: {gasto} créditos
          {m.techo ? ` de ${m.techo} (${Math.round((gasto / m.techo) * 100)} %)` : ' · sin techo'}
        </Text>
        <Text dimColor>Saldo: {s.actual ?? '—'}</Text>
        <Box>
          <Button
            key="saldo"
            label="Actualizar saldo"
            onPress={async () => {
              await refrescarSaldo($)
              await guardar($)
            }}
          />
        </Box>
        <Text> </Text>
        {lista.length === 0 && <Text dimColor>Todavía no hay generaciones en este proyecto.</Text>}
        {lista
          .slice(-cupo)
          .reverse()
          .map(x => (
            <Text key={x.id} dimColor={x.estado !== 'enviado'} color={x.estado === 'error' ? 'red' : undefined}>
              {x.hora} · {x.plano} · {x.modelo || x.herramienta} {x.detalle} ·{' '}
              {x.estado === 'cotizado'
                ? `cotiza ${x.costo ?? '?'}`
                : x.estado === 'error'
                  ? 'falló'
                  : `${x.costo ?? '?'} cr`}
            </Text>
          ))}
      </Box>
    )
  })
}
