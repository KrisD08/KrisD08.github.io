# LAB-06 — Incidencia técnica durante la Tarea 6

**Fecha:** 14/11/2026  
**Proyecto temporal:** `qwiklabs-gcp-03-94f95e8bd0ba`  
**Servicio:** `webmod-svc` · `us-east4`  
**Resultado en Google Skills:** `100/100` (véase [puntaje.png](evidencia/puntaje.png))

## Qué ocurrió

La aplicación se desplegó y la búsqueda del blog funcionó, pero la generación de imagen y las herramientas de traducción/refinamiento devolvieron errores al invocar los modelos indicados en las instrucciones del laboratorio.

Al consultar los logs de Cloud Run con:

```bash
gcloud run services logs read webmod-svc --region=us-east4 --limit=30 --freshness=20m
```

se observaron las siguientes condiciones **en los registros proporcionados** (extractos breves, sin credenciales):

```text
POST /vertex-llm/ai-translate-inline HTTP/1.1  500 Internal Server Error
400 FAILED_PRECONDITION: Organization Policy constraint
constraints/vertexai.allowedModels violated ...
disallowed Gen AI model gemini-3.6-flash

POST /imagen/api/generate-images HTTP/1.1  500 Internal Server Error
400 FAILED_PRECONDITION: Organization Policy constraint
constraints/vertexai.allowedModels violated ...
disallowed Gen AI model gemini-3.1-flash-image
```

El bloqueo se debe a que **la política organizacional del proyecto no autoriza los modelos referidos**. No es evidencia de una imagen nueva ni de una traducción/refinamiento aplicados.

## Evidencia asociada

- [Intento de generación de imagen](evidencia/imagen.png)
- [Intento de traducción con error](evidencia/traduccion.png)
- [Intento de Refine Text con error](evidencia/refine.png)
- [Logs Explorer y búsqueda de REFINE_PROMPT](evidencia/logs-refine-prompt.png)
- [Puntaje final 100/100](evidencia/puntaje.png)

## Alcance de la limitación

La guía de Google Skills proporcionó los identificadores `gemini-3.6-flash` y `gemini-3.1-flash-image`, pero la política de la organización temporal impidió ejecutarlos. No se modificaron controles de acceso de la organización ni se sustituyeron las evidencias de error por supuestos resultados exitosos.

El puntaje mostrado por el verificador de Google Skills y la ejecución efectiva de las operaciones de IA son hechos distintos; se presentan por separado para su revisión docente.
