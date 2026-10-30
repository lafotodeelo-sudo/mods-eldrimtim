import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Pendiente } from '../types'

const pendientes = atom({ plugin: 'guardian-publicacion', key: 'pendientes' } as const, [])

// Dónde viven los repos de la sesión en el contenedor de la nube.
const RAIZ = '/home/user'

const NOMBRES: Record<string, string> = {
  'web-eldrimtim': 'la web',
  'mods-eldrimtim': 'los mods',
}

const nombre = (repo: string) => NOMBRES[repo] ?? repo

const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`

const buscarRepos = async ($: EngineInterface) => {
  const r = await $.process.run(
    ['sh', '-c', `for d in ${RAIZ}/*/; do [ -d "$d.git" ] && echo "\${d%/}"; done`],
    { timeoutMs: 5000 },
  )

  return r.stdout.split('\n').filter(Boolean)
}

const revisar = async ($: EngineInterface, carpeta: string): Promise<Pendiente | null> => {
  const r = await $.process.run(['git', '-C', carpeta, 'status', '--porcelain=v1', '-b'], {
    timeoutMs: 8000,
  })
  if (r.exitCode !== 0) {
    return null
  }
  const [cabeza = '', ...archivos] = r.stdout.split('\n').filter(Boolean)
  const adelante = /\[ahead (\d+)/.exec(cabeza)
  let sinSubir = adelante ? Number(adelante[1]) : 0
  let sinRemoto = false

  // Rama sin seguimiento: se compara contra origin/<rama> si existe.
  if (!cabeza.includes('...') && !cabeza.includes('No commits yet')) {
    const rama = cabeza.replace(/^## /, '').trim()
    const c = await $.process.run(['git', '-C', carpeta, 'rev-list', '--count', `origin/${rama}..HEAD`], {
      timeoutMs: 8000,
    })
    if (c.exitCode === 0) {
      sinSubir = Number(c.stdout.trim()) || 0
    } else {
      sinRemoto = true
    }
  }

  return {
    repo: carpeta.split('/').pop() ?? carpeta,
    carpeta,
    sinGuardar: archivos.length,
    sinSubir,
    sinRemoto,
  }
}

const refrescar = async ($: EngineInterface) => {
  const repos = await buscarRepos($)
  const estados = await Promise.all(repos.map(c => revisar($, c)))
  const conPendientes = estados.filter(
    (p): p is Pendiente => p !== null && (p.sinGuardar > 0 || p.sinSubir > 0 || p.sinRemoto),
  )
  await update($, pendientes, () => conPendientes)
}

const resumen = (p: Pendiente) =>
  [
    p.sinGuardar > 0 ? plural(p.sinGuardar, 'archivo cambiado', 'archivos cambiados') : '',
    p.sinSubir > 0 ? plural(p.sinSubir, 'cambio guardado sin subir', 'cambios guardados sin subir') : '',
    p.sinRemoto ? 'rama sin subir' : '',
  ]
    .filter(Boolean)
    .join(', ')

const pedirPublicacion = async ($: EngineInterface) => {
  const lista = await read($, pendientes)
  if (lista.length === 0) {
    return false
  }
  const detalle = lista.map(p => `- ${nombre(p.repo)} (${p.carpeta}): ${resumen(p)}`).join('\n')
  await $.prompt.submit({
    asUser: true,
    text: [
      'Quiero publicar lo que está pendiente:',
      detalle,
      '',
      'Antes de subir nada, contame en lenguaje claro, sin jerga técnica, qué cambió en cada uno: qué se va a ver distinto y dónde.',
      'Recordá que la web se publica sola en eldrimtim.cr apenas un cambio llega a main.',
      'Esperá mi ok y recién ahí guardá y subí, con un mensaje de cambio claro en español.',
    ].join('\n'),
  })

  return true
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'publicar',
      description: 'Resume lo que está sin publicar y lo sube cuando lo aprobás',
    })
    void refrescar($)

    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    const r = await next(e)
    await refrescar($)

    return r
  })

  on('command.run', { command: 'publicar' }, async $ => {
    await refrescar($)
    const pidio = await pedirPublicacion($)

    return { text: pidio ? 'Armando el resumen de lo pendiente.' : 'Todo está publicado: no hay nada pendiente.' }
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const lista = await read($, pendientes)
    if (e.props.hasSurvey || lista.length === 0) {
      return next(e)
    }
    const { Box, Button, Text } = $.ui.resolve(e)

    return (
      <Box>
        <Text color="yellow">
          Sin publicar · {lista.map(p => `${nombre(p.repo)}: ${resumen(p)}`).join(' · ')}{' '}
        </Text>
        <Button key="publicar" label="Publicar" onPress={() => void pedirPublicacion($)} />
      </Box>
    )
  })
}
