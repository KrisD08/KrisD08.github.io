
import { existsSync, readFileSync } from 'node:fs'

const archivo = process.argv[2] ?? 'resultados-vitest.json'

if (!existsSync(archivo)) {
  console.log('### Pruebas (Vitest)\n\nNo se generó el reporte: las pruebas no llegaron a ejecutarse.')
  process.exit(0)
}

const r = JSON.parse(readFileSync(archivo, 'utf-8'))
const pruebas = r.testResults.flatMap((archivoDePruebas) =>
  archivoDePruebas.assertionResults.map((p) => ({ ...p, archivo: archivoDePruebas.name })),
)
const icono = { passed: '✅', failed: '❌', pending: '⏭️', skipped: '⏭️', todo: '📝' }

const lineas = [
  '### Pruebas (Vitest)',
  '',
  `**${r.numPassedTests} de ${r.numTotalTests} pruebas pasaron**` +
    (r.numFailedTests ? `, **${r.numFailedTests} ${r.numFailedTests === 1 ? 'falló' : 'fallaron'}**` : '') +
    ` en ${r.testResults.length} archivo(s).`,
  '',
  '| | Prueba |',
  '|:-:|---|',
  ...pruebas.map((p) => `| ${icono[p.status] ?? p.status} | ${p.fullName} |`),
]

const fallidas = pruebas.filter((p) => p.status === 'failed')
if (fallidas.length) {
  lineas.push('', '#### Por qué fallaron', '')
  for (const p of fallidas) {
    lineas.push(`- **${p.fullName}**: ${(p.failureMessages?.[0] ?? '').split('\n')[0]}`)
  }
}

console.log(lineas.join('\n'))
