
import { appendFileSync } from 'node:fs'

const BASE = (process.env.BASE_URL ?? 'http://localhost:8080').replace(/\/$/, '')
const marca = `ci-${Date.now()}` // identifica SUS mensajes entre los que ya había
const resultados = []

async function llamar(metodo, ruta, cuerpo, cabeceras = { 'Content-Type': 'application/json' }) {
  const r = await fetch(`${BASE}${ruta}`, {
    method: metodo,
    headers: cabeceras,
    body: cuerpo === undefined ? undefined : typeof cuerpo === 'string' ? cuerpo : JSON.stringify(cuerpo),
  })
  const texto = await r.text()
  let json = null
  try { json = JSON.parse(texto) } catch { /* no era JSON */ }
  return { status: r.status, tipo: r.headers.get('content-type') ?? '', json, texto }
}

function esperar(real, esperado, que) {
  if (real !== esperado) throw new Error(`${que}: esperaba ${esperado} y llegó ${real}`)
}

async function caso(nombre, fn) {
  try {
    await fn()
    resultados.push({ nombre, ok: true })
    console.log(`✔ ${nombre}`)
  } catch (e) {
    resultados.push({ nombre, ok: false, error: e.message })
    console.error(`✘ ${nombre}\n    ${e.message}`)
  }
}

await caso('GET /api/health responde 200 y status ok', async () => {
  const r = await llamar('GET', '/api/health')
  esperar(r.status, 200, 'HTTP')
  esperar(r.json?.status, 'ok', 'status')
})

let creado
await caso('POST /api/mensajes válido responde 201 y devuelve el mensaje', async () => {
  const r = await llamar('POST', '/api/mensajes', { nombre: 'Prueba CI', mensaje: `hola ${marca}` })
  esperar(r.status, 201, 'HTTP')
  esperar(r.json?.nombre, 'Prueba CI', 'nombre')
  esperar(r.json?.mensaje, `hola ${marca}`, 'mensaje')
  if (!r.json?.id || !r.json?.fecha) throw new Error('la respuesta no trae id y fecha')
  creado = r.json
})

await caso('POST sin nombre responde 400', async () => {
  esperar((await llamar('POST', '/api/mensajes', { mensaje: 'sin nombre' })).status, 400, 'HTTP')
})

await caso('POST con el nombre vacío (solo espacios) responde 400', async () => {
  esperar((await llamar('POST', '/api/mensajes', { nombre: '   ', mensaje: 'hola' })).status, 400, 'HTTP')
})

await caso('POST sin mensaje responde 400', async () => {
  esperar((await llamar('POST', '/api/mensajes', { nombre: 'Alguien' })).status, 400, 'HTTP')
})

await caso('POST con mensaje de 281 caracteres responde 400', async () => {
  esperar((await llamar('POST', '/api/mensajes', { nombre: 'Alguien', mensaje: 'x'.repeat(281) })).status, 400, 'HTTP')
})

await caso('POST con nombre de 61 caracteres responde 400', async () => {
  esperar((await llamar('POST', '/api/mensajes', { nombre: 'n'.repeat(61), mensaje: 'hola' })).status, 400, 'HTTP')
})

await caso('POST con mensaje de exactamente 280 caracteres responde 201 (el límite es inclusivo)', async () => {
  esperar((await llamar('POST', '/api/mensajes', { nombre: 'Límite', mensaje: 'x'.repeat(280) })).status, 201, 'HTTP')
})

await caso('POST con un cuerpo que no es JSON responde 400, no 500', async () => {
  esperar((await llamar('POST', '/api/mensajes', '{esto no es json')).status, 400, 'HTTP')
})

await caso('GET /api/mensajes devuelve JSON e incluye el mensaje que se creó', async () => {
  const r = await llamar('GET', '/api/mensajes')
  esperar(r.status, 200, 'HTTP')
  if (!r.tipo.includes('application/json')) throw new Error(`content-type inesperado: ${r.tipo}`)
  if (!Array.isArray(r.json)) throw new Error('la respuesta no es una lista')
  if (!creado) throw new Error('no hay mensaje creado que buscar (falló el POST válido)')
  if (!r.json.some((m) => m.id === creado.id && m.mensaje === creado.mensaje)) {
    throw new Error(`el mensaje ${creado.id} no aparece en la lista`)
  }
})

await caso('el texto de un visitante se guarda como texto, no como HTML', async () => {
  const raro = `<img src=x onerror=alert(1)> ${marca}`
  const r = await llamar('POST', '/api/mensajes', { nombre: 'XSS', mensaje: raro })
  esperar(r.status, 201, 'HTTP')
  esperar(r.json?.mensaje, raro, 'mensaje devuelto tal cual')
})

const fallidas = resultados.filter((r) => !r.ok)
console.log(`\n${resultados.length - fallidas.length} de ${resultados.length} pruebas de integración pasaron.`)

if (process.env.GITHUB_STEP_SUMMARY) {
  const lineas = [
    '### Integración (Compose: web + api + db)',
    '',
    `**${resultados.length - fallidas.length} de ${resultados.length} pruebas pasaron.**`,
    '',
    '| | Prueba |',
    '|:-:|---|',
    ...resultados.map((r) => `| ${r.ok ? '✅' : '❌'} | ${r.nombre}${r.ok ? '' : `<br>_${r.error}_`} |`),
    '',
  ]
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, lineas.join('\n'))
}

process.exit(fallidas.length ? 1 : 0)
