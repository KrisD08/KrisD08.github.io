
import { describe, it, expect, beforeAll } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { JSDOM } from 'jsdom'

const SITIO = '_site'
const NOMBRE = 'Kiara De La Vega'
let html
let doc
let js

beforeAll(() => {
  html = readFileSync(`${SITIO}/index.html`, 'utf-8')
  doc = new JSDOM(html).window.document
  js = existsSync(`${SITIO}/libro-de-visitas.js`) ? readFileSync(`${SITIO}/libro-de-visitas.js`, 'utf-8') : ''
})

describe('index.html', () => {
  it('tiene un título', () => {
    expect(doc.title.trim()).not.toBe('')
  })

  it('muestra mi nombre en el h1', () => {
    expect(doc.querySelector('h1')?.textContent).toContain(NOMBRE)
  })

  it('todas las imágenes tienen texto alternativo', () => {
    const sinAlt = [...doc.querySelectorAll('img')].filter((img) => !img.getAttribute('alt'))
    expect(sinAlt).toHaveLength(0)
  })

  it('los archivos locales que usa la página existen', () => {
    const rutas = [...doc.querySelectorAll('script[src], link[rel="stylesheet"], img[src]')]
      .map((el) => el.getAttribute('src') ?? el.getAttribute('href'))
      .filter((ruta) => !/^(https?:)?\/\//.test(ruta)) // ignora lo que viene de Internet
    for (const ruta of rutas) {
      expect(existsSync(`${SITIO}/${ruta}`), `falta ${ruta}`).toBe(true)
    }
  })
})

describe('el sitio que se publica', () => {
  it('no incluye archivos internos del repositorio', () => {
    for (const interno of ['compose.yaml', '.env.example', 'api', 'db', 'tests']) {
      expect(existsSync(`${SITIO}/${interno}`), `${interno} no debería publicarse`).toBe(false)
    }
  })
})

describe('pruebas propias: estructura y accesibilidad', () => {
  it('declara lang="es", charset UTF-8 y la etiqueta viewport', () => {
    expect(doc.documentElement.getAttribute('lang')).toBe('es')
    expect(doc.querySelector('meta[charset]')?.getAttribute('charset')?.toLowerCase()).toBe('utf-8')
    expect(doc.querySelector('meta[name="viewport"]')?.getAttribute('content')).toContain('width=device-width')
  })

  it('tiene un solo h1 y los títulos no saltan de nivel', () => {
    expect(doc.querySelectorAll('h1')).toHaveLength(1)
    const niveles = [...doc.querySelectorAll('h1, h2, h3, h4, h5, h6')].map((h) => Number(h.tagName[1]))
    for (let i = 1; i < niveles.length; i++) {
      // bajar de nivel solo de uno en uno (h2 -> h3 sí, h2 -> h4 no); subir está permitido
      expect(niveles[i] - niveles[i - 1], `salto de h${niveles[i - 1]} a h${niveles[i]}`).toBeLessThanOrEqual(1)
    }
  })

  it('los enlaces externos abren en otra pestaña y llevan rel="noopener"', () => {
    const externos = [...doc.querySelectorAll('a[href^="http"]')]
    expect(externos.length).toBeGreaterThan(0)
    for (const a of externos) {
      const href = a.getAttribute('href')
      expect(a.getAttribute('target'), `${href} sin target="_blank"`).toBe('_blank')
      expect(a.getAttribute('rel') ?? '', `${href} sin rel="noopener"`).toContain('noopener')
    }
  })

  it('los enlaces internos (#ancla) apuntan a ids que existen', () => {
    const anclas = [...doc.querySelectorAll('a[href^="#"]')].map((a) => a.getAttribute('href').slice(1))
    for (const id of anclas) {
      expect(doc.getElementById(id), `el enlace #${id} no lleva a ningún lado`).not.toBeNull()
    }
  })

  it('no hay ids repetidos', () => {
    const ids = [...doc.querySelectorAll('[id]')].map((el) => el.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe('pruebas propias: libro de visitas', () => {
  it('la sección existe, arranca oculta y su formulario tiene los campos nombre y mensaje', () => {
    const seccion = doc.querySelector('#libro-de-visitas')
    expect(seccion).not.toBeNull()
    // Oculta por defecto: en GitHub Pages no hay /api, así que no debe verse un formulario roto.
    expect(seccion.hasAttribute('hidden')).toBe(true)
    expect(seccion.querySelector('form [name="nombre"]')).not.toBeNull()
    expect(seccion.querySelector('form [name="mensaje"]')).not.toBeNull()
  })

  it('los campos respetan los límites de la API (60 y 280 caracteres) y son obligatorios', () => {
    const nombre = doc.querySelector('[name="nombre"]')
    const mensaje = doc.querySelector('[name="mensaje"]')
    expect(nombre.getAttribute('maxlength')).toBe('60')
    expect(mensaje.getAttribute('maxlength')).toBe('280')
    expect(nombre.hasAttribute('required')).toBe(true)
    expect(mensaje.hasAttribute('required')).toBe(true)
  })

  it('cada campo del formulario tiene su label', () => {
    for (const campo of doc.querySelectorAll('#form-mensaje input, #form-mensaje textarea')) {
      expect(doc.querySelector(`label[for="${campo.id}"]`), `${campo.name} sin label`).not.toBeNull()
    }
  })

  it('el script llama a la API con una ruta relativa, no a una URL absoluta', () => {
    expect(js).toMatch(/const API = "\/api"/)
    expect(js).not.toMatch(/https?:\/\//)
  })

  it('el script escribe los mensajes con textContent y nunca con innerHTML (XSS)', () => {
    const codigo = js.replace(/\/\/.*$/gm, '') // sin comentarios: ahí sí puedo nombrar innerHTML
    expect(codigo).toContain('textContent')
    expect(codigo).not.toMatch(/innerHTML|insertAdjacentHTML|document\.write/)
  })
})

describe('pruebas propias: nada de mi máquina en lo que se publica', () => {
  it('el sitio no apunta a localhost ni a rutas locales', () => {
    const prohibido = /localhost|127\.0\.0\.1|0\.0\.0\.0|file:\/\/|[A-Za-z]:\\|\/home\/|\/Users\//
    expect(html).not.toMatch(prohibido)
    expect(js).not.toMatch(prohibido)
  })

  it('no se coló ningún secreto ni contraseña en el sitio', () => {
    for (const texto of [html, js]) {
      expect(texto).not.toMatch(/password|passwd|secret|api[_-]?key|BEGIN [A-Z ]*PRIVATE KEY/i)
    }
  })
})
