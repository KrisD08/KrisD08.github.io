# LAB-06 — Modernizar un sitio web con IA generativa en Google Cloud

**Curso:** IF-1116 — Tópicos de Tecnologías de Información · 2026-II  
**Semana:** 11 · **Fecha de ejecución:** 14/11/2026  
**Estudiante:** Kiara Kristell Karoline de la Vega Huaranca  
**Correo institucional:** 202210148@urp.edu.pe  
**GitHub:** [KrisD08](https://github.com/KrisD08)  
**Carpeta de entrega:** [lab-06/](https://github.com/KrisD08/KrisD08.github.io/tree/main/lab-06)  
**Perfil público de Google Skills:** https://www.skills.google/public_profiles/da4f65a7-6df1-4719-a2fb-3b277b8f1f46?locale=es

## 1. Datos del laboratorio

| Dato | Valor |
|:--|:--|
| Laboratorio | Modernize your Website with Generative AI on Google Cloud |
| Plataforma | Google Skills |
| ID del laboratorio | `OCBL451` |
| Duración asignada | 1 h 15 min |
| Proyecto temporal de Google Cloud | `qwiklabs-gcp-03-94f95e8bd0ba` |
| Región de Cloud Run | `us-east4` |
| Aplicación de búsqueda | `my-search-app` |
| Data store | `my-data-store` |
| Servicio Cloud Run | `webmod-svc` |
| URL del servicio durante el laboratorio | [webmod-svc-962330808595.us-east4.run.app](https://webmod-svc-962330808595.us-east4.run.app/home) |
| **Puntaje que mostró Google Skills** | **100/100** · [ver captura](evidencia/puntaje.png) |

> **Nota sobre recursos temporales:** la URL de Cloud Run y el proyecto pertenecen a la sesión de Google Skills; pueden dejar de estar disponibles al finalizar el laboratorio. Las capturas registran su estado durante la práctica.

## 2. Objetivo

Modernizar un blog de inversiones hecho con FastAPI y tecnologías web mediante una experiencia de búsqueda apoyada en Agent Search, su despliegue en Cloud Run y el uso de herramientas de IA generativa para editar imágenes y texto. Se documentan los resultados que sí fueron visibles y los errores encontrados al invocar los modelos de Gemini.

## 3. Puntos de control y evidencias

| Punto de control | Puntos del curso | Resultado / evidencia |
|:--|--:|:--|
| 1. API de Agent Platform habilitada | 2 | El puntaje final de Google Skills acredita el control; [puntaje.png](evidencia/puntaje.png). |
| 2. Aplicación de Agent Search | 6 | Se creó `my-search-app` y el buscador respondió a la pregunta sobre *dollar-cost averaging*: [agent-search-preview.png](evidencia/agent-search-preview.png). |
| 3. Sitio desplegado en Cloud Run | 5 | La página de Cymbal Investments respondió a una búsqueda inicial y a la pregunta de seguimiento sobre ETF: [cloud-run.png](evidencia/cloud-run.png), [cloud-run-seguimiento.png](evidencia/cloud-run-seguimiento.png), [vista adicional](evidencia/cloud-run-respuesta-etfs.png). |
| 4. Edición de contenido con IA | 7 | **Google Skills mostró 100/100**, pero los intentos de generar imagen, traducir y refinar texto devolvieron errores por política organizacional de modelos. Se adjuntan las capturas de los intentos y la incidencia: [imagen.png](evidencia/imagen.png), [traduccion.png](evidencia/traduccion.png), [refine.png](evidencia/refine.png), [logs-refine-prompt.png](evidencia/logs-refine-prompt.png) y [incidencia técnica](incidencia-tecnica.md). |
| **Total según verificación mostrada en Google Skills** | **20** | **[Captura de 100/100](evidencia/puntaje.png)**. La interpretación definitiva de la evidencia corresponde al docente. |

**Aclaración:** la captura de `logs-refine-prompt.png` muestra la búsqueda/resaltado de `REFINE_PROMPT` en Logs Explorer y entradas con fallos, **no** confirma que se generara correctamente un texto refinado ni un log de prompt exitoso. Las capturas `imagen.png`, `traduccion.png` y `refine.png` evidencian intentos y errores, no resultados completados.

## 4. Desarrollo de la práctica

### Tarea 1. Habilitación de API

Se utilizó Cloud Shell para habilitar la API de Vertex AI / Agent Platform:

```bash
gcloud services enable aiplatform.googleapis.com
```

### Tarea 2. Obtención del sitio base

Se descargó la aplicación de ejemplo desde el bucket de formación de Google y se prepararon los identificadores de los modelos indicados por la guía:

```bash
gcloud storage cp gs://cloud-training/OCBL451/genai-website-mod-app.tar.gz .
tar -zxvf genai-website-mod-app.tar.gz
find ./genai-website-mod-app -type f | xargs sed -i 's/REPLACE_WITH_GEMINI_MODEL_ID/gemini-3.6-flash/g'
find ./genai-website-mod-app -type f | xargs sed -i 's/REPLACE_WITH_GEMINI_IMAGE_MODEL_ID/gemini-3.1-flash-image/g'
```

### Tarea 3. Agent Search

Se trabajó con una aplicación `my-search-app`, con una fuente de documentos de Cloud Storage (`blog_posts`) dentro del data store `my-data-store`. En el **Preview** se formuló la consulta:

> What is dollar cost averaging and how can it help me?

El buscador devolvió una explicación sobre la inversión periódica y referencias a los documentos. Evidencia: [agent-search-preview.png](evidencia/agent-search-preview.png).

### Tarea 4. Integración con el sitio

La configuración de la aplicación se estableció para usar el proyecto temporal, el data store y los buckets de contenidos e imágenes del laboratorio mediante `config.toml`. No se adjuntan secretos ni credenciales temporales.

### Tarea 5. Despliegue en Cloud Run

Se publicó el servicio `webmod-svc` en la región `us-east4` y se probaron dos consultas:

1. `What is dollar cost averaging and how can it help me?`
2. `Can you use dollar cost averaging with ETFs?`

Las capturas muestran la web y sus respuestas, incluida la URL temporal terminada en `.run.app`:

- [Respuesta a la consulta inicial](evidencia/cloud-run.png)
- [Respuesta a la consulta de seguimiento con URL](evidencia/cloud-run-seguimiento.png)
- [Vista adicional de la respuesta de seguimiento](evidencia/cloud-run-respuesta-etfs.png)

### Tarea 6. Edición de contenido con Gemini

Se accedió a la edición de **Unleashing the Techie Within: A Journey to FIRE** y se intentaron las operaciones previstas en el laboratorio:

- **Imagen:** solicitud de generación con el prompt `An image of a man gone fishing.`. La interfaz quedó esperando y no muestra una imagen nueva completada. [Ver evidencia](evidencia/imagen.png).
- **Traducción:** selección de texto e indicación del idioma `French`. Se obtuvo `Error refining text`. [Ver evidencia](evidencia/traduccion.png).
- **Refine Text:** indicación de estilo `formal impactful`. Se obtuvo `Error refining text`, sin reemplazo confirmado. [Ver evidencia](evidencia/refine.png).
- **Logs Explorer:** búsqueda/resaltado de `REFINE_PROMPT`; la consola también mostró errores asociados al servicio. [Ver captura](evidencia/logs-refine-prompt.png).

Los registros consultados mediante Cloud Shell identificaron una restricción `constraints/vertexai.allowedModels` que impide utilizar `gemini-3.6-flash` y `gemini-3.1-flash-image` en el proyecto temporal. El detalle está documentado en [incidencia-tecnica.md](incidencia-tecnica.md).

## 5. Evidencias adjuntas

| Archivo | Qué acredita realmente |
|:--|:--|
| [evidencia/agent-search-preview.png](evidencia/agent-search-preview.png) | Preview de Agent Search, pregunta y respuesta. |
| [evidencia/cloud-run.png](evidencia/cloud-run.png) | Sitio publicado, URL `.run.app` y primera respuesta. |
| [evidencia/cloud-run-seguimiento.png](evidencia/cloud-run-seguimiento.png) | Segunda consulta sobre ETF y respuesta, con URL visible. |
| [evidencia/cloud-run-respuesta-etfs.png](evidencia/cloud-run-respuesta-etfs.png) | Vista adicional de la segunda respuesta. |
| [evidencia/imagen.png](evidencia/imagen.png) | Intento de edición de imagen con generación inconclusa. |
| [evidencia/traduccion.png](evidencia/traduccion.png) | Intento de traducción y aviso de error. |
| [evidencia/refine.png](evidencia/refine.png) | Intento de refinamiento y aviso de error. |
| [evidencia/logs-refine-prompt.png](evidencia/logs-refine-prompt.png) | Logs Explorer con `REFINE_PROMPT` en el filtro de resaltado y registros de la aplicación. |
| [evidencia/puntaje.png](evidencia/puntaje.png) | Calificación **100/100** mostrada en Google Skills. |

## 6. Resultado, limitaciones y seguridad

- Se obtuvo una aplicación de búsqueda funcional sobre los documentos de ejemplo y un sitio desplegado en Cloud Run que respondió a las consultas de prueba.
- La plataforma **Google Skills mostró 100/100** en la captura final.
- Las llamadas para generar imagen, traducir y refinar contenido fallaron con `400 FAILED_PRECONDITION` por una política de modelos de la organización del proyecto de laboratorio. Por tanto, **no se presenta como concluida la edición del contenido**, aunque el verificador de Google Skills mostrara el puntaje completo.
- No se incluyen contraseñas de laboratorio, tokens, claves privadas ni archivos de credenciales de cuentas de servicio.

**Entrega:** [Issue principal del LAB-06 (#101)](https://github.com/urp-topicos-2026-2/.github-private/issues/101). La carpeta de evidencia es `lab-06/evidencia/`.
