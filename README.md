# Perfil — Kiara De La Vega

Sitio personal publicado en https://KrisD08.github.io, con un libro de
visitas de tres servicios en contenedores (LAB-02, IF-1116).

## Arquitectura

```
Navegador → web (nginx, puerto 8080) → api (Node/Express, 3000) → db (Postgres, 5432)
```

- **`web`**: nginx sin privilegios. Sirve `index.html` y reenvía `/api/` hacia `api`.
- **`api`**: Node.js/Express. El libro de visitas: `GET /api/health`, `GET /api/mensajes`, `POST /api/mensajes`.
- **`db`**: Postgres 16, con un volumen (`pgdata`) para que los mensajes persistan.

Dos redes: `frontend` (web↔api) y `backend` (api↔db). Solo `web` publica
un puerto hacia el host; `api` y `db` no son alcanzables desde fuera de Docker.

## Cómo correrlo en local

```bash
cp .env.example .env      # solo la primera vez
docker compose up -d --build --wait
```

Abre `http://localhost:8080`. Para ver que los datos persisten:

```bash
docker compose down
docker compose up -d
# los mensajes siguen ahí

docker compose down -v
docker compose up -d --build --wait
# ahora sí desaparecen: se borró el volumen
```

## En GitHub Codespaces

`Code → Codespaces → Create codespace on main`. El `.devcontainer/`
levanta los tres servicios solo y abre el puerto 8080 en el navegador,
sin que haga falta escribir ningún comando.

## Flujo de trabajo

- `main` protegida; todo cambio entra por pull request.
- Una rama por cambio: `feature/*`, `fix/*` y `docs/*`.
- Mensajes de commit en imperativo, de máximo 50 caracteres.

---

## 📓 Bitácora de decisiones

### Reto 1: Imagen mínima con multi-stage

- **Decisión:** el `Dockerfile` de `api/` usa dos etapas: `deps` (Node
  completo, instala dependencias con npm) y `runtime`, basada en
  `gcr.io/distroless/nodejs20-debian12:nonroot`, que solo copia
  `node_modules` y el código ya listo.
- **Alternativas que evalué:**
  - `node:20-alpine` como imagen final: mucho más chica que `node:20`
    completo, pero sigue trayendo un shell y un gestor de paquetes que
    la API nunca usa en producción.
  - `node:20-slim` (Debian recortado): más compatible que Alpine (Alpine
    usa `musl` en vez de `glibc`, lo que a veces rompe paquetes nativos),
    pero más pesada que Alpine o que distroless.
- **Por qué elegí esta:** distroless no tiene shell, ni `npm`, ni
  gestor de paquetes: si alguien compromete la API, no tiene con qué
  moverse dentro del contenedor. Y como esta API es JS puro (sin
  dependencias nativas), no corro el riesgo de incompatibilidad de Alpine.
- **Fuentes consultadas:** _(pega aquí los enlaces reales que revisaste:
  la página de_ [`distroless` en GitHub](https://github.com/GoogleContainerTools/distroless)_,
  la documentación de Docker sobre multi-stage builds, algún artículo que
  hayas leído)_
- **Cómo lo verifiqué:** `docker images | grep perfil-api` antes y
  después del cambio, y `docker history ghcr.io/USUARIO/perfil-api:1.0`.
  _(Pega aquí la tabla real con los tamaños de tu build ingenuo — por
  ejemplo, `FROM node:20` sin multi-stage — contra el final. Debe ser
  menos de la mitad.)_
- **Qué no me funcionó:** _(honesto: si probaste `node:20-alpine` como
  base para el runtime y algo no encajó, o si `distroless` te dio algún
  error de permisos al escribir en el filesystem, cuéntalo aquí.)_

### Reto 2: Arranque ordenado con healthchecks

- **Decisión:** cada servicio tiene su propio `HEALTHCHECK`, y
  `compose.yaml` usa `depends_on: condition: service_healthy` para que
  `api` espere a `db` sano, y `web` espere a `api` sano.
- **Alternativas que evalué:**
  - Dejar solo `depends_on` sin condición: arranca los contenedores en
    orden, pero no espera a que el proceso adentro esté listo para
    aceptar conexiones — Postgres tarda unos segundos más en aceptar
    conexiones de lo que tarda en arrancar el contenedor.
  - Un script `wait-for-it.sh` dentro de la API que reintente la
    conexión: funciona, pero mueve la responsabilidad de "estoy sano" a
    un script externo en vez de dejar que cada servicio declare su
    propia salud con Docker.
- **Por qué elegí esta:** los `HEALTHCHECK` son nativos de Docker/Compose,
  no dependen de instalar nada extra, y son los que hacen posible el
  `--wait` del `postStartCommand` en el devcontainer.
- **Fuentes consultadas:** _(documentación oficial de Compose sobre
  `healthcheck` y `depends_on`, la página de `pg_isready`)_
- **Cómo lo verifiqué:** `docker compose up -d --build --wait` termina
  solo cuando los tres están sanos, y `docker compose ps` los muestra
  como `healthy`. _(pega aquí la salida real de `docker compose ps`)_
- **Qué no me funcionó:** _(por ejemplo, si al principio tu healthcheck
  de la API fallaba porque intentaste usar `curl` y no estaba instalado
  en la imagen distroless — cuéntalo, es justo el punto que pide el
  enunciado.)_

### Reto 3: Nadie es root

- **Decisión:** `web` usa `nginxinc/nginx-unprivileged`, que escucha en
  8080 en vez de 80 y corre como usuario `nginx` sin privilegios. `api`
  usa la imagen `distroless:nonroot`, que ya trae su propio usuario sin
  privilegios (uid 65532). `db` usa la imagen oficial de Postgres, que
  internamente ya baja privilegios al usuario `postgres` antes de
  arrancar el proceso.
- **Alternativas que evalué:**
  - Usar `nginx:alpine` normal + `USER nginx` manual: no funciona sin
    más, porque el puerto 80 requiere el privilegio
    `CAP_NET_BIND_SERVICE` que un usuario sin privilegios no tiene.
  - Crear yo misma un usuario en el `Dockerfile` de `api` con
    `adduser`: es el patrón clásico, pero `distroless:nonroot` ya lo
    resuelve sin que yo tenga que mantenerlo.
- **Por qué elegí esta:** menos código mío que mantener, y son
  soluciones ya probadas por sus mantenedores.
- **Fuentes consultadas:** _(imagen `nginxinc/nginx-unprivileged` en
  Docker Hub/GitHub, documentación de `distroless`, por qué los puertos
  <1024 requieren privilegios en Linux)_
- **Cómo lo verifiqué:**
  `for s in web api db; do docker compose exec $s whoami; done`
  _(pega la salida real: debería mostrar algo como `nginx`, un uid
  numérico como `65532`, y `postgres`)_
- **Qué no me funcionó:** _(si intentaste `docker compose exec api sh`
  primero para explorar, y te encontraste con que distroless no tiene
  shell — esa es justo la lección del reto, cuéntala.)_

### Reto 4: Red segmentada

- **Decisión:** dos redes en `compose.yaml`: `frontend` (web + api) y
  `backend` (api + db). `api` es el único servicio en ambas. Ni `api`
  ni `db` publican puertos hacia el host.
- **Alternativas que evalué:**
  - Una sola red para los tres servicios: más simple de escribir, pero
    `web` podría alcanzar a `db` directamente si algo saliera mal en la
    configuración de nginx — exactamente lo que el reto pide evitar.
  - Publicar el puerto de `db` "por si acaso" para poder inspeccionarla
    con un cliente SQL desde mi máquina: lo descarté porque rompe el
    criterio de aceptación (nadie fuera de Docker debería llegar a la
    base de datos), y para inspeccionarla ya puedo usar
    `docker compose exec db psql`.
- **Por qué elegí esta:** aplica el principio de mínimo privilegio: cada
  servicio solo alcanza lo que necesita para funcionar.
- **Fuentes consultadas:** _(documentación de Compose sobre "networks",
  diferencia entre `ports` y `expose`)_
- **Cómo lo verifiqué:**
  `docker compose exec web getent hosts db` (debe fallar, "db" no
  resuelve) y `docker compose exec api getent hosts db` (debe resolver).
  _(pega ambas salidas reales)_
- **Qué no me funcionó:** _(si en algún momento tuviste todo en una sola
  red por defecto y viste que "web" SÍ alcanzaba a "db", esa es la
  comparación que vale la pena documentar.)_

### Reto 5: Escaneo de vulnerabilidades

- **Decisión:** Escaneé la imagen publicada en GHCR (`ghcr.io/krisd08/perfil-api:v1.0`) utilizando Trivy para identificar vulnerabilidades heredadas de la imagen base y de los paquetes de Node.js.
- **Alternativas que evalué:** 
  - **Trivy (Aquasecurity):** Elegida porque es open source, altamente compatible con cualquier registro de contenedores (como GHCR) y se puede ejecutar tanto localmente como en pipelines de CI/CD.
  - **Docker Scout:** Ofrece una excelente integración nativa con Docker CLI, pero requiere autenticación adicional y está más atado al ecosistema comercial de Docker.
- **Por qué elegí esta:** Trivy es el estándar de la industria open-source para auditorías rápidas de imágenes y muestra con precisión milimétrica los paquetes del sistema operativo y de lenguajes específicos.
- **Fuentes consultadas:** [Documentación oficial de Trivy](https://trivy.dev/), [Base de datos de vulnerabilidades de Aqua Security (AVD)](https://avd.aquasec.com/).
- **Cómo lo verifiqué:** 
  Ejecuté el comando de escaneo remoto contra el registro:
  ```bash
  docker run --rm aquasec/trivy:latest image ghcr.io/krisd08/perfil-api:v1.0

### Reto 6: Cero secretos y arranque automático

- **Decisión:** `.env` está en `.gitignore` y nunca se commitea. Existe
  `.env.example` con valores de ejemplo (no reales) como plantilla. En
  `.devcontainer/devcontainer.json`, el `postCreateCommand` copia
  `.env.example` a `.env` solo si `.env` todavía no existe, así un
  Codespace nuevo arranca solo sin que nadie haya subido un secreto real
  al repositorio.
- **Alternativas que evalué:**
  - Usar los "Codespaces secrets" (secretos a nivel de cuenta/repositorio
    en GitHub): son la forma "correcta" en producción, pero no le sirven
    a quien califica mi trabajo si no tiene acceso a mi cuenta para
    configurarlos, y el reto pide que arranque solo para cualquiera.
  - Poner la contraseña directamente en `compose.yaml`: viola la regla
    de cero secretos aunque nunca esté en una imagen, porque de todas
    formas queda en el historial de Git.
- **Por qué elegí esta:** la contraseña de `.env.example` es una
  credencial de desarrollo, desechable, que solo protege una base de
  datos que vive y muere con el Codespace. No es un secreto de
  producción (no protege nada real), así que no hay contradicción en
  que quede "a la vista" como plantilla.
- **Fuentes consultadas:** _(documentación de Compose sobre `env_file`,
  documentación de GitHub sobre secretos de Codespaces)_
- **Cómo lo verifiqué:**
  `git log --all --full-history -- .env` (debe salir vacío) y
  `docker history --no-trunc ghcr.io/USUARIO/perfil-api:1.0 | grep -i pass`
  (no debe aparecer ninguna contraseña). _(pega ambas salidas reales)_
- **Qué no me funcionó:**

---

## Historial del curso

- **S02** — Sitio inicial, ramas y pull requests.
- **S03** — LAB-02: libro de visitas con Docker Compose (web + api + db).