
import { existsSync, readFileSync } from 'node:fs'

const SEVERIDADES = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'UNKNOWN']
const etiqueta = process.env.IMAGE_TAG ? `:${process.env.IMAGE_TAG}` : ''

const filas = process.argv.slice(2).map((arg) => {
  const [servicio, archivo] = arg.split('=')
  const imagen = `perfil-${servicio}${etiqueta}`
  if (!existsSync(archivo)) return `| ${imagen} | sin datos | | | | | |`

  const crudo = readFileSync(archivo, 'utf-8')
  const json = JSON.parse(crudo.charCodeAt(0) === 0xfeff ? crudo.slice(1) : crudo)
  const vulns = (json.Results ?? []).flatMap((r) => r.Vulnerabilities ?? [])
  const cuenta = (sev) => vulns.filter((v) => v.Severity === sev).length
  const bloqueantes = vulns.filter((v) => v.Severity === 'CRITICAL' && v.FixedVersion).length
  return `| ${imagen} | ${SEVERIDADES.map(cuenta).join(' | ')} | **${bloqueantes}** |`
})

console.log(
  [
    '### Trivy: vulnerabilidades por severidad',
    '',
    '| Imagen | CRITICAL | HIGH | MEDIUM | LOW | UNKNOWN | CRITICAL con corrección (bloquean) |',
    '|---|--:|--:|--:|--:|--:|--:|',
    ...filas,
    '',
    '_Las que están en `.trivyignore` no se cuentan: Trivy las descarta antes de generar el reporte._',
  ].join('\n'),
)
