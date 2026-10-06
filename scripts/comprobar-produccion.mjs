
import { JSDOM, VirtualConsole } from 'jsdom'

const URL_BASE = (process.env.PAGE_URL ?? '').replace(/\/?$/, '/')
const NOMBRE = process.env.NOMBRE
const INTENTOS = Number(process.env.INTENTOS ?? 12)
const ESPERA_MS = Number(process.env.ESPERA_MS ?? 10_000)

if (!process.env.PAGE_URL || !NOMBRE) {
  console.error('Faltan las variables PAGE_URL y NOMBRE.')
  process.exit(2)
}

const dormir = (ms) => new Promise((r) => setTimeout(r, ms))
const fallos = []
const ok = (m) => console.log(`✔ ${m}`)
const mal = (m) => { fallos.push(m); console.error(`✘ ${m}`) }

let html = ''
for (let i = 1; i <= INTENTOS; i++) {
  try {
    // "?v=" evita que una caché intermedia nos devuelva la versión anterior
    const r = await fetch(`${URL_BASE}?v=${Date.now()}`, { headers: { 'Cache-Control': 'no-cache' } })
    html = await r.text()
    if (r.status === 200 && html.includes(NOMBRE)) {
      ok(`${URL_BASE} responde 200 (intento ${i}/${INTENTOS})`)
      break
    }
    console.log(`… intento ${i}/${INTENTOS}: HTTP ${r.status}${r.status === 200 ? ' pero todavía no aparece el nombre (¿versión anterior?)' : ''}`)
  } catch (e) {
    console.log(`… intento ${i}/${INTENTOS}: ${e.message}`)
  }
  if (i === INTENTOS) break
  await dormir(ESPERA_MS)
}

if (html.includes(NOMBRE)) ok(`aparece "${NOMBRE}" en la página`)
else mal(`no aparece "${NOMBRE}" en ${URL_BASE} (o la página no respondió 200)`)

if (html) {
  const errores = []
  const avisos = []
  const consola = new VirtualConsole()
  consola.on('jsdomError', (e) => errores.push(e.message))
  consola.on('error', (...a) => errores.push(a.join(' ')))
  consola.on('info', (...a) => avisos.push(a.join(' ')))

  const dom = new JSDOM(html, {
    url: URL_BASE,
    runScripts: 'dangerously',
    resources: 'usable',
    virtualConsole: consola,
    beforeParse(window) {
      // jsdom no trae fetch: le damos el de Node, resolviendo rutas relativas contra la URL pública
      window.fetch = (ruta, opciones) => fetch(new URL(ruta, URL_BASE), opciones)
    },
  })

  await new Promise((r) => dom.window.addEventListener('load', r))
  await dormir(2000) // da tiempo a que el fetch("/api/mensajes") falle

  const seccion = dom.window.document.getElementById('libro-de-visitas')
  if (!seccion) mal('la página publicada no tiene la sección #libro-de-visitas')
  else if (!seccion.hidden) mal('el libro de visitas se ve en Pages, donde no hay API: el usuario vería un formulario roto')
  else {
    ok('el libro de visitas permanece oculto (no hay /api en Pages) y no rompe la página')
    // Oculto "por defecto" no basta: tiene que ser porque el script corrió y degradó con elegancia.
    if (!avisos.some((a) => a.includes('Libro de visitas oculto'))) {
      mal('el script del libro de visitas no se ejecutó (¿se publicó libro-de-visitas.js?)')
    }
  }

  if (errores.length) mal(`el JavaScript de la página lanzó errores: ${errores.join(' | ')}`)
  else ok('el JavaScript de la página no lanzó errores')
  dom.window.close()
}

console.log(fallos.length ? `\n${fallos.length} comprobación(es) fallaron.` : '\nProducción OK.')
process.exit(fallos.length ? 1 : 0)
