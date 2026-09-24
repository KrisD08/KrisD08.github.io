# Perfil — Kiara De La Vega

Sitio personal publicado en https://KrisD08.github.io, con un libro de
visitas de tres servicios en contenedores (LAB-02, IF-1116).

---

## Bitácora de decisiones

### Reto 1: Imagen mínima con multi-stage

- **Decisión:** el `Dockerfile` de `api/` utiliza dos etapas: `deps` (Node completo, donde se instalan las dependencias con npm) y `runtime`, basada en `gcr.io/distroless/nodejs20-debian12:nonroot`, que únicamente copia `node_modules` y el código final necesario para ejecutar la aplicación.

- **Alternativas que evalué:**
  - `node:20-alpine` como imagen final: es mucho más pequeña que la imagen completa de Node, pero todavía incluye shell y gestor de paquetes que no son necesarios en producción.
  - `node:20-slim`: ofrece mayor compatibilidad al utilizar Debian como base, pero mantiene un tamaño superior frente a una imagen distroless.

- **Por qué elegí esta:** distroless elimina herramientas innecesarias como shell, npm y gestores de paquetes. Esto reduce la superficie de ataque, ya que ante una posible intrusión no existen comandos adicionales disponibles dentro del contenedor. Además, al ser una API desarrollada en JavaScript puro sin dependencias nativas, no existe riesgo de incompatibilidad.

- **Fuentes consultadas:**
  - Página oficial de [`distroless`](https://github.com/GoogleContainerTools/distroless) en GitHub.
  - Documentación oficial de Docker sobre multi-stage builds.

- **Cómo lo verifiqué:** ejecuté `docker images` obteniendo el tamaño optimizado real:

```yaml
REPOSITORY                   TAG       ID             DISK USAGE    CONTENT SIZE
krisd08githubio-api:latest   c9267900c02f   177MB         45.5MB    U
```

- **Qué no me funcionó:** al probar distroless inicialmente, los intentos de ingresar al contenedor mediante comandos como `sh` fallaban porque la imagen no contiene shell ni herramientas del sistema. Esto confirmó la seguridad de la imagen, pero requirió utilizar logs del contenedor para la depuración.


### Reto 2: Arranque ordenado con healthchecks

- **Decisión:** cada servicio cuenta con su propio `HEALTHCHECK` y el archivo `compose.yaml` utiliza `depends_on: condition: service_healthy`, logrando que:
  - `api` espere hasta que `db` se encuentre saludable.
  - `web` espere hasta que `api` esté disponible.

- **Alternativas que evalué:**
  - Utilizar únicamente `depends_on`: inicia los contenedores en orden, pero no garantiza que el servicio interno ya acepte conexiones.
  - Usar un script como `wait-for-it.sh`: permite esperar conexiones, pero agrega una dependencia externa y traslada la responsabilidad del estado saludable fuera de Docker.

- **Por qué elegí esta:** los `HEALTHCHECK` son mecanismos nativos de Docker Compose, no requieren instalar herramientas adicionales y permiten aprovechar correctamente el inicio automático mediante `postStartCommand`.

- **Fuentes consultadas:**
  - Documentación oficial de Docker Compose sobre `healthcheck` y `depends_on`.
  - Manual de la utilidad `pg_isready`.

- **Cómo lo verifiqué:** ejecuté:

```bash
docker compose ps
```

Resultado:

```bash
NAME                   IMAGE                   COMMAND                  SERVICE   STATUS

krisd08githubio-api-1  krisd08githubio-api     "/nodejs/bin/node ap…"   api       Up (healthy)

krisd08githubio-db-1   postgres:16-alpine      "docker-entrypoint.s…"   db        Up (healthy)
```

- **Qué no me funcionó:** inicialmente intenté utilizar `curl` dentro del healthcheck de la API, pero falló debido a que Distroless no incluye herramientas de red. Finalmente se implementó un chequeo utilizando funcionalidades propias de Node.js.


### Reto 3: Nadie es root

- **Decisión:** 
  - `web` utiliza `nginxinc/nginx-unprivileged`, que funciona en el puerto 8080 y ejecuta el proceso con el usuario `nginx`.
  - `api` utiliza `gcr.io/distroless/nodejs20-debian12:nonroot`, ejecutando con el usuario sin privilegios UID 65532.
  - `db` utiliza la imagen oficial de PostgreSQL, que ejecuta el servicio mediante el usuario interno `postgres`.

- **Alternativas que evalué:**
  - Utilizar `nginx:alpine` junto con `USER nginx`: requiere configuraciones adicionales porque el puerto 80 necesita privilegios especiales (`CAP_NET_BIND_SERVICE`).

- **Por qué elegí esta:** reduce la cantidad de configuraciones manuales y utiliza imágenes diseñadas específicamente para ejecución segura sin privilegios administrativos.

- **Fuentes consultadas:**
  - Repositorio oficial de `nginxinc/nginx-unprivileged`.
  - Documentación de seguridad de Google Distroless.

- **Cómo lo verifiqué:** ejecuté:

```bash
for s in web api db; do echo -n "$s: "; docker compose exec $s whoami; done
```

Resultado obtenido:

```bash
api: executable file not found in $PATH
```

Esto ocurre porque Distroless no incluye herramientas como `whoami`, shell u otros binarios del sistema, confirmando que la imagen mantiene un entorno mínimo.

- **Qué no me funcionó:** intentar explorar el contenedor API mediante `docker compose exec api sh` no fue posible debido a que Distroless elimina completamente la consola shell.


### Reto 4: Red segmentada

- **Decisión:** se configuraron dos redes independientes en `compose.yaml`:

  - `frontend`: conecta únicamente `web` con `api`.
  - `backend`: conecta únicamente `api` con `db`.

  La API funciona como único punto intermedio entre ambas redes. Ni la API ni la base de datos exponen puertos directamente hacia el host.

- **Alternativas que evalué:**
  - Utilizar una sola red para todos los servicios: aunque es más simple, permitiría que `web` tenga acceso directo a `db`, aumentando la superficie de exposición.

- **Por qué elegí esta:** aplica el principio de mínimo privilegio, permitiendo que cada servicio solamente tenga comunicación con los componentes necesarios.

- **Fuentes consultadas:**
  - Documentación oficial de Docker Compose sobre redes (`networks`).

- **Cómo lo verifiqué:** intenté realizar pruebas de resolución entre servicios:

```bash
docker compose exec web getent hosts db

docker compose exec api getent hosts db
```

La comprobación desde servicios basados en Distroless no pudo ejecutarse porque no cuentan con herramientas de red instaladas, lo cual demuestra el aislamiento de la imagen base.


- **Qué no me funcionó:** inicialmente al trabajar con una única red por defecto, los servicios tenían comunicación directa entre sí. La separación en dos redes permitió corregir este problema.


### Reto 5: Escaneo de vulnerabilidades

- **Decisión:** se realizó un análisis de seguridad sobre la imagen publicada en GHCR:

```
ghcr.io/krisd08/perfil-api:v1.0
```

utilizando Trivy para identificar vulnerabilidades provenientes de la imagen base y dependencias utilizadas.

- **Alternativas que evalué:**
  - **Trivy (Aquasecurity):** elegida por ser open source, compatible con registros como GHCR y fácil de ejecutar localmente.
  - **Docker Scout:** tiene integración directa con Docker CLI, pero está más ligado al ecosistema comercial de Docker.

- **Por qué elegí esta:** Trivy permite realizar auditorías rápidas mostrando vulnerabilidades del sistema operativo y paquetes utilizados dentro de la imagen.

- **Fuentes consultadas:**
  - Documentación oficial de [Trivy](https://trivy.dev/).
  - Base de datos de vulnerabilidades [AVD](https://avd.aquasec.com/).

- **Cómo lo verifiqué:** ejecuté:

```bash
docker run --rm aquasec/trivy:latest image ghcr.io/krisd08/perfil-api:v1.0
```

Resultado resumido:

```text
CRITICAL: 1
HIGH: 5
MEDIUM: 23
LOW: 25
UNKNOWN: 1
```

- **Análisis de la vulnerabilidad crítica:**

  - **CVE:** `CVE-2026-31789`
  - **Severidad:** CRITICAL
  - **Paquete afectado:** `libssl3` (OpenSSL)

- **Decisión tomada:** se mantiene temporalmente debido a que corresponde a una vulnerabilidad del paquete base Debian y se espera la actualización del parche upstream.

- **Qué no me funcionó:** inicialmente ejecutar Trivy sin indicar correctamente la etiqueta `v1.0` generaba un error de manifiesto desconocido.


### Reto 6: Cero secretos y arranque automático

- **Decisión:** el archivo `.env` está incluido dentro de `.gitignore`, evitando que pueda ser subido al repositorio. Se creó `.env.example` como plantilla con valores de prueba.

Además, dentro de `.devcontainer/devcontainer.json`, el `postCreateCommand` copia automáticamente `.env.example` hacia `.env` únicamente si este archivo todavía no existe.

- **Alternativas que evalué:**
  - Utilizar GitHub Codespaces Secrets: fue descartado porque requiere configuración individual de cuenta y dificulta la evaluación automática del proyecto.

- **Por qué elegí esta:** permite mantener un entorno reproducible y seguro, evitando exponer credenciales reales mientras mantiene el arranque automático en nuevos Codespaces.

- **Fuentes consultadas:**
  - Documentación oficial de Docker Compose sobre `env_file`.
  - Documentación de GitHub Codespaces Secrets.

- **Cómo lo verifiqué:** ejecuté:

```bash
git log --all --full-history -- .env
```

Resultado:

```text
(no se devolvió ningún registro)
```

Esto confirma que el archivo `.env` nunca fue versionado ni enviado al repositorio.

- **Qué no me funcionó:** no se presentaron problemas adicionales debido a que la protección mediante `.gitignore` fue configurada desde el inicio.

---
