# LAB-05: Terraform en Google Cloud

Fecha de los tres labs: 31/10/2026.
Perfil público de Google Skills: KIARA KRISTELL KAROLINE DE LA VEGA HUARANCCA

## Evidencia

| Lab | Puntaje | Captura | Carpeta |
|-----|---------|---------|---------|
| GSP233, Deploy Kubernetes Load Balancer Service with Terraform | 100/100 | [evidencia/gsp233.png](evidencia/gsp233.png) | [01-gsp233/](01-gsp233/) |
| GSP497, Cloud Operations for GKE | 100/100 | [evidencia/gsp497.png](evidencia/gsp497.png) | [02-gsp497/](02-gsp497/) |
| GSP345, Challenge Lab | 100/100 | [evidencia/gsp345.png](evidencia/gsp345.png) | [03-gsp345/](03-gsp345/) |

Otras capturas: NGINX respondiendo ([gsp233-nginx.png](evidencia/gsp233-nginx.png)); métricas de Prometheus en Cloud Monitoring ([monitoring.png](evidencia/monitoring.png), [monitoring-tabla.png](evidencia/monitoring-tabla.png)); plan, `apply` y `destroy` del lab 2 ([gsp497-plan-inicial.png](evidencia/gsp497-plan-inicial.png), [gsp497-apply.png](evidencia/gsp497-apply.png), [gsp497-destroy.png](evidencia/gsp497-destroy.png)); puntaje parcial del lab 2 ([gsp497-50.png](evidencia/gsp497-50.png)).

### GSP233: qué dice el plan
`01-gsp233/plan-inicial.txt` termina en `Plan: 7 to add, 0 to change, 0 to destroy.` Los siete recursos son `google_compute_address.default`, `google_compute_network.default`, `google_compute_subnetwork.default`, `google_container_cluster.default`, `kubernetes_namespace.staging`, `kubernetes_replication_controller.nginx` y `kubernetes_service.nginx`. El provider `kubernetes` se configura con el endpoint y las credenciales del clúster que crea `google`, así que `kubernetes_service.nginx` solo se puede crear cuando el clúster ya existe.

### GSP497: plan y destroy
`02-gsp497/plan-inicial.txt` termina en `Plan: 5 to add, 0 to change, 0 to destroy.` (el clúster `google_container_cluster.primary`, la política de alertas `prometheus_mem_alloc` y tres `google_project_service`: `container`, `logging` y `monitoring`). `02-gsp497/destroy.txt` termina en `Destroy complete! Resources: 5 destroyed.`, el mismo número.

### GSP345: por tarea

| Tarea | Puntos en Google | Evidencia |
|-------|:----------------:|-----------|
| 1. Estructura de archivos y módulos | sin puntaje | `main.tf`, `variables.tf`, `modules/` |
| 2. Importar las dos instancias | 20 | `plan-2.txt`: `tf-instance-1` y `tf-instance-2` aparecen como `~ update in-place` (atributos `allow_stopping_for_update` y `metadata_startup_script`), sin destruir ni recrear |
| 3. Backend remoto | 10 | `plan-3a.txt` (crea el bucket `tf-bucket-184521`) y `plan-3.txt` (`No changes` tras migrar el estado) |
| 4. Modificar | 20 | `plan-4.txt`: `machine_type` de `tf-instance-2` pasa de `e2-micro` a `e2-standard-2` |
| 5. Destruir | 10 | `plan-5.txt`: `Plan: 0 to add, 0 to change, 1 to destroy` (`tf-instance-3`) |
| 6. Módulo del Registry | 20 | `plan-6.txt`: las dos instancias pasan a `tf-vpc-830600`, `subnet-01` y `subnet-02`; módulo `terraform-google-modules/network/google` versión `10.0.0` |
| 7. Firewall | 20 | `plan-7.txt`: `Plan: 1 to add`, regla `tf-firewall`, tcp 80, origen `0.0.0.0/0` |

`state-list.txt` es la salida final de `terraform state list` (7 recursos: firewall, las dos instancias, el bucket, las dos subredes y la red).

### Limitaciones de la evidencia (GSP345)

- **Tarea 4:** el plan que crea `tf-instance-3` no se conservó. Se perdió el historial de la terminal al refrescar Cloud Shell. `plan-4.txt` es el plan de la modificación y ya muestra `tf-instance-3` en el estado.
- **Tarea 6:** el plan que crea la VPC y las subredes se guardó vacío y no se regeneró. La evidencia es `state-list.txt`, el `main.tf` final y `plan-6.txt`, que conecta las instancias a las subredes.
- Los demás planes se generaron con `terraform plan -no-color > plan-<n>.txt` antes de cada `apply`.

## Bitácora

### GSP233
Cloné el repositorio del lab, completé las variables `region` y `location` (la primera vez el `plan` falló porque no las tenía) y corrí `init`, `plan` y `apply`. El plan mostraba 7 recursos nuevos. Con el clúster creado, el Service de tipo LoadBalancer quedó expuesto en `136.70.114.80` y NGINX respondió en el navegador (`evidencia/gsp233-nginx.png`).
Lo que más me costó fue sacar los `.tf` y el `plan-inicial.txt` de Cloud Shell hacia mi máquina. Lo resolví descargándolos desde el Editor de Cloud Shell. La próxima vez redirijo el plan a un archivo desde el principio.

### GSP497
Desplegué el clúster de GKE y la aplicación de ejemplo con Terraform (`plan-inicial.txt`: 5 recursos, `Apply complete! Resources: 5 added`). En Cloud Monitoring vi la política `Prometheus mem alloc` y la métrica del contenedor `prometheus` en el namespace `default` (`evidencia/monitoring.png`). Al final hice el teardown: `Destroy complete! Resources: 5 destroyed`.
Me costó entender en qué momento guardar cada evidencia, y que `make teardown` debe correrse dentro de la carpeta del repositorio clonado: la primera vez lo corrí desde otro directorio. También refrescar la página me hizo perder el historial de la terminal.

### GSP345
Seguí el orden de las tareas, con un `plan -no-color` guardado antes de cada `apply` y una copia de la carpeta (`gsp345-tarea-<n>`) por tarea.
- **Importar:** definí las dos instancias en `modules/instances` con los atributos que exige `google_compute_instance` y las importé al estado. El plan posterior no destruye nada: solo agrega `allow_stopping_for_update` y mueve el script de arranque a `metadata_startup_script`.
- **Backend remoto:** creé el bucket `tf-bucket-184521`, configuré el backend `gcs` con el prefijo `terraform/state` y volví a correr `init` aceptando copiar el estado local al bucket.
- **Modificar:** agregué una tercera instancia y cambié el tipo de máquina a `e2-standard-2` en las dos primeras. La comprobación de Google falló porque `tf-instance-2` seguía en `e2-micro`; lo corregí y volví a aplicar.
- **Destruir:** quité la tercera instancia y apliqué (1 destroyed). El primer `apply` falló por un error de red transitorio al leer el bucket; al repetirlo funcionó.
- **Módulo del Registry:** usé `terraform-google-modules/network/google` fijado en `10.0.0` para crear `tf-vpc-830600` con `subnet-01` y `subnet-02`, y después conecté cada instancia a su subred.
- **Firewall:** creé `tf-firewall` con tcp 80 y `source_ranges = ["0.0.0.0/0"]`, que es lo que pedía el enunciado.
Lo que más me costó: pegué comandos en archivos `.tf` por error (Terraform dio errores de sintaxis), Cloud Shell perdió la instalación de Terraform y las variables de shell al refrescar, y un bloque del módulo quedó duplicado en `main.tf` (`Duplicate module call`). Lo arreglé borrando el bloque repetido. Además se perdieron dos planes (ver Limitaciones). Lo que cambiaría: no refrescar la página durante el lab, pegar un bloque a la vez y guardar cada plan en archivo desde el primer `apply`.