# PPAY

Tablero en español para analizar FCR. Funciona en el navegador, procesa Excel y CSV localmente y conserva intactos los archivos originales.

## Abrir la aplicación

El botón **Tema oscuro / Tema claro** de la barra superior cambia la apariencia de toda la aplicación: ingreso, tablero, perfiles, solicitudes, tablas y diálogos. La elección queda guardada en este navegador, se restaura al recargar y se aplica sin reiniciar la sesión ni modificar filtros o datos. El tema predeterminado es claro.

1. Descargá o cloná este repositorio.
2. Abrí `index.html` con Chrome o Edge.
3. Pulsá **Cargar Excel o CSV** y elegí una o varias exportaciones de FCR.
4. Indicá el período si lo conocés, o dejá que se detecte cuando el archivo trae mes y año claros.

También podés arrastrar uno o varios `.xlsx` o `.csv` sobre el tablero y soltarlos cuando aparezca el resaltado. Se usa la biblioteca compartida de Supabase y el período indicado para nuevas cargas. El botón de selección sigue disponible. No se aceptan nuevas cargas durante el procesamiento de otra ni sin sesión autorizada.

En Windows también podés ejecutar `ABRIR.bat` si tenés Python instalado. Esto sirve la carpeta en `http://localhost:8765`, únicamente en tu equipo. Cerrá el servidor con Ctrl+C al terminar.

Los archivos se guardan exclusivamente en la biblioteca privada de Supabase. Las copias locales de versiones anteriores se conservan en el navegador, pero no se usan ni se suben de forma automática.

## Biblioteca compartida con Supabase

La página abre en **Iniciar sesión** y mantiene el tablero oculto e inactivo hasta validar la cuenta y sus permisos. **Primera vez · Solicitar acceso** permite registrar nombre, correo y contraseña, sin validación por email. La cuenta queda pendiente hasta que Gonzalo la acepte desde **Mi perfil → Solicitudes de acceso**. También puede rechazarla. La persona puede usar **Revisar estado** sin volver a crear su cuenta. Una cuenta pendiente o rechazada no accede al tablero ni a los archivos. La contraseña solo la administra Supabase Auth, no se guarda en la tabla de solicitudes ni se muestra al administrador.

Al entrar, las cargas se guardan en el bucket privado `fcr-files` y su índice mensual en `fcr_imports`. Otros supervisores autorizados pueden abrirlas desde otra computadora. No hay selector ni respaldo automático en una biblioteca local: si Supabase falla, se muestra el error y el archivo no se presenta como guardado. Las copias locales antiguas no se suben automáticamente; para compartirlas, cargá el original. El límite es 50 MB por archivo. **Cerrar sesión** vuelve al ingreso y retira el tablero de la vista.

El guardado conserva los bytes originales y verifica su SHA-256 al descargar. No se sobrescriben objetos. El mismo contenido y período se reutiliza; otro contenido se guarda por separado. Al eliminar en Supabase se retira la copia compartida para todos los supervisores, con confirmación explícita. Si falla la eliminación física después de retirar el índice, se muestra un aviso para que un administrador retire el objeto huérfano.

La configuración pública del cliente está en `supabase-config.js`. Nunca agregar contraseñas PostgreSQL, claves `secret` o `service_role` a ese archivo. La sesión del supervisor se conserva en este navegador; cerrar sesión cierra las ventanas de detalle y retira los datos compartidos de la pantalla. Los cálculos FCR siguen ejecutándose en el navegador.

### Equipos por supervisor

**Mi perfil → Ver mi equipo** abre una página propia del supervisor (`#/supervisores/<id>`). Gonzalo puede entrar a **Todos los usuarios → Ver equipo** en cada cuenta aprobada. Cada perfil muestra sus agentes asignados y enlaces a su FCR. Solo Gonzalo puede agregar o quitar integrantes; el supervisor puede consultar su propio equipo y no puede editarlo ni consultar el perfil de equipo de otro supervisor.

Los equipos se actualizan al cargar o abrir un Excel/CSV: cada Representante se asigna al Supervisor indicado. Se crean equipos aunque ese supervisor todavía no tenga cuenta; una cuenta aprobada se vincula solo si coincide su nombre completo, sin diferencias de orden, acentos o puntuación. No se conceden permisos de acceso por aparecer en un archivo.

Los cambios manuales de Gonzalo tienen prioridad. Quitar un agente impide que se vuelva a agregar automáticamente; se puede agregar de nuevo manualmente. Un archivo de un mes anterior no reemplaza asignaciones automáticas más recientes. Si un agente tiene distintos supervisores en el mismo archivo, no se le asigna automáticamente. La migración `008-automatic-teams.sql` incorpora perfiles y sincronización; los archivos originales y los cálculos FCR no cambian.

### Preparación administrativa

Solo Gonzalo, como administrador, puede cargar Excel/CSV, cambiar sus períodos o eliminar archivos. Los supervisores aprobados tienen acceso de lectura; el selector y el arrastre de archivos están deshabilitados para ellos y las políticas de Supabase también rechazan las escrituras. Para actualizar una instalación existente, aplicar `004-admin-files-and-users.sql` y `005-password-reset.sql` después de las migraciones anteriores. La preparación automática aplica las ocho migraciones en orden.

La campana de la barra superior muestra a Gonzalo cuántas solicitudes están pendientes. Se actualiza al entrar, al revisar una solicitud y cada 30 segundos mientras la pestaña está visible. **Mi perfil → Todos los usuarios** incluye las cuentas pendientes, rechazadas y aprobadas, con su rol y último ingreso. La información de administración no está disponible para supervisores comunes.

En esa lista, **Blanquear contraseña** permite al administrador generar una contraseña temporal para una cuenta que no sea administradora. Requiere confirmar dentro de la fila. Se reemplaza el hash de la contraseña, se cierran sus sesiones anteriores y se muestra la nueva clave únicamente en esa vista para copiarla. No se guarda la clave en texto plano ni se envía por correo. La cuenta puede cambiarla desde **Mi perfil → Cambiar mi contraseña**. La recuperación de una cuenta administradora queda fuera de este botón para evitar bloquear al propio administrador.

En **Mi perfil → Solicitudes de acceso**, Gonzalo puede alternar entre **Pendientes** y **Rechazadas**. Las rechazadas tienen el botón **Aprobar acceso** para cambiar la decisión. La persona podrá pulsar **Revisar estado** o volver a ingresar. Solo el administrador puede hacerlo; la base rechaza cambios desde una lista desactualizada. Para instalaciones existentes, aplicar `supabase/003-review-rejected.sql` después de las migraciones anteriores.

El proyecto necesita `supabase/schema.sql` y después `supabase/002-access-requests.sql`: tablas con RLS, solicitudes de acceso, administradores y bucket privado. La segunda migración reemplaza la antigua habilitación por lista de correos. Ningún registro nuevo obtiene permisos automáticamente por su email o por lo que declare en sus metadatos. Solo un administrador puede aceptar/rechazar mediante una función protegida en la base; un supervisor común no puede aprobarse ni ascender a administrador.

Para otro proyecto: instalar Node.js 22+, ejecutar `npm ci`, configurar `DATABASE_URL` mediante variables de entorno o un `.env` local excluido de Git; después ejecutar `npm run supabase:setup`. La preparación usa TLS con verificación de certificado y nombre del servidor. `PGSSLROOTCERT` permite usar una CA oficial descargada desde Supabase. El `.env` nunca debe publicarse ni copiarse al hosting estático.

Para habilitar al primer administrador, este debe solicitar su cuenta primero. Un operador con acceso a la base debe verificar su identidad y ejecutar el siguiente SQL reemplazando el ejemplo, o ejecutar la preparación con `FCR_ADMIN_EMAIL`. Esta habilitación inicial no se puede realizar desde una cuenta pendiente del navegador. Los demás accesos se aprueban desde Mi perfil.

```sql
begin;
insert into public.fcr_supervisors(user_id)
select id from auth.users
where lower(trim(email))='administrador@example.com'
on conflict do nothing;
insert into public.fcr_access_admins(user_id)
select id from auth.users where lower(trim(email))='administrador@example.com'
on conflict do nothing;
update public.fcr_access_requests set status='approved',reviewed_at=now()
where user_id in(select id from auth.users where lower(trim(email))='administrador@example.com');
commit;
```

En Supabase **Authentication → Sign In / Providers → Email**, desactivar **Confirm email** y guardar. El cliente comprueba ese ajuste antes de solicitar una cuenta: si sigue activo, no llama al registro ni envía un correo. Las cuentas de la versión anterior que hayan quedado sin confirmar deben migrarse explícitamente para permitir login sin email; esto no les otorga permisos de tablero. No se requiere instalar Node.js para usar la página: el SDK oficial está incluido en `vendor/supabase.min.js`; `npm run build:supabase` lo vuelve a generar con la versión fijada en el lockfile.

`npm run supabase:verify` valida RLS en la base mediante usuarios ficticios dentro de una transacción que se revierte; no sube ni consulta archivos reales.

## Biblioteca de meses y perfiles

- **Archivos y meses guardados** permite abrir meses anteriores, editar el período y descargar el original guardado.
- Cada carga es independiente: no se suman meses ni versiones automáticamente.
- El mismo contenido y período no se duplican. Un contenido diferente queda como otra versión, aunque tenga el mismo nombre.
- Si el archivo no incluye un período inequívoco, queda **Sin período** hasta que lo indiques. No se supone el año actual.
- Eliminar un guardado requiere confirmación dentro de la página y afecta solo esa copia local.
- La última copia FCR de versiones anteriores se migra a la biblioteca sin borrarla del almacenamiento anterior.
- **Ver perfil** abre una página propia del representante, por ejemplo `#/fcr/usuario/teco%3A123456`. Conserva el usuario al cambiar de mes y al recargar esa ruta; si falta en un mes, informa que no tiene registros. El botón Volver a FCR regresa al listado.
- El perfil muestra FCR a 7 días, 24 horas y 12 horas para todo el archivo seleccionado. Los filtros del detalle no cambian sus porcentajes.
- Las tarjetas **TMO** y **CxH** del perfil muestran únicamente **PRÓXIMAMENTE**.

## Vista activa

El tablero está separado por rutas: **Resumen** (`#/fcr`) muestra los indicadores generales; **Asesores**, **Comparación mensual**, **Registros** y **Archivos** tienen sus propias pestañas bajo `#/fcr/...`. El archivo abierto se conserva al navegar. Los filtros de detalle se usan en Asesores y Registros; el resumen y la comparación general usan todos los registros del archivo.

Gonzalo tiene además **Equipos** (`#/equipos`), con todos los supervisores aprobados y una vista previa de sus agentes. Desde cada tarjeta puede abrir y editar el equipo completo. Los supervisores comunes tienen el enlace a su propio equipo. La migración `007-team-directory.sql` protege el directorio completo para el administrador.

Por ahora se muestra solo **FCR**. La página abre en `#/fcr`; las rutas anteriores redirigen a esta vista. No se recupera ni se procesa el CSV antiguo al iniciar, pero su copia local se conserva.

Para reactivar los demás indicadores, cambiá `fcrOnly` a `false` en `config.js`.

## Funciones conservadas y vista actual

- **FCR está activo:** usa los indicadores del Excel o CSV a 7 días, 24 horas y 12 horas. Cero significa sin recontacto y uno con recontacto.
- **TMO, CxH, Casos y Actividad están desactivados:** se conserva su implementación anterior para una eventual reactivación. Los perfiles actuales no muestran esos cálculos antiguos.

Las columnas se identifican por encabezado, independientemente de su orden. El historial de recontactos se calcula con todo el archivo antes de aplicar los filtros de visualización. La empresa del asesor es un indicio obtenido de filas con un asesor y una división; no se infiere cruzando listas por posición.

## FCR desde Excel o CSV

Entrá a **FCR → Cargar Excel o CSV** y seleccioná exportaciones `.xlsx` o `.csv`. El CSV admite UTF-8 o Windows-1252 y separadores coma, punto y coma o tabulación. Se reconocen los encabezados aunque estén después de filas de metadatos. Se requieren Representante, CODIGO_LLAMADA, ATENDIDAS y RECONTACTO_7D / 24H / 12H; se admite el prefijo «Suma de».

Cada fila debe representar una atendida con indicadores binarios. Por ventana, FCR = casos con indicador 0 / casos con indicador 0 o 1. Los valores vacíos o inválidos no se convierten en cero. Los totales se recalculan desde las cantidades. Los porcentajes exportados se contrastan con los indicadores, que son la fuente del cálculo.

La clave conserva el código de llamada completo y el identificador del representante. Los duplicados idénticos cuentan una vez; los indicadores contradictorios quedan no evaluables para la ventana afectada. El Excel se guarda localmente por separado del CSV. Sus filtros por representante, supervisor, cola y resultado son propios; no se le aplican las fechas ni las reglas de cierre del CSV.

### Aviso de tabulación coincidente

Cuando hay al menos un indicador de recontacto igual a 1, se comparan **TAB1–TAB4** con **TAB1_RECONTACTO–TAB4_RECONTACTO**, nivel por nivel. Se ignoran mayúsculas, espacios sobrantes y diferencias de composición Unicode; los valores originales no se alteran.

- Coinciden todos los niveles informados: aviso **«Misma tabulación»**, con cantidad de niveles comparados.
- Hay un nivel informado distinto: **«Tabulación distinta»**.
- Faltan datos de un lado, todas las tabulaciones están vacías o los duplicados se contradicen: **«No evaluable»**.
- Los indicadores no muestran recontacto: no se emite el aviso de coincidencia.

Los niveles vacíos en ambos lados no prueban coincidencia. El detalle muestra la comparación completa y los originales. El filtro **Tabulaciones → Coinciden** reúne estos casos. El aviso no cambia los indicadores FCR ni presupone que la tabulación de recontacto sea diferente por cada ventana.

La guía de uso ampliada está en `LEEME.txt`.

## Validación sin datos reales

Desde cada perfil, **Mostrar al asesor** abre una vista simple con sus tres FCR y las tabulaciones originales que concentran más registros con recontacto. Se puede elegir 7 días, 24 horas o 12 horas. El ranking cuenta registros con indicador 1 por motivo completo; informa también el total de atenciones evaluables del motivo y su proporción de recontactos. Usa todo el archivo del usuario, sin filtros del detalle, y conserva una instantánea mientras la ventana está abierta. Las coincidencias de tabulación se muestran aparte y no alteran el FCR.

**Copiar resumen para compartir** copia un mensaje con el período, los tres FCR y los cinco motivos principales del plazo elegido. Si el navegador no permite acceder al portapapeles, aparece el texto para copiar manualmente. No se envían mensajes automáticamente.

### Comparación mensual de FCR

El resumen FCR y cada perfil comparan el archivo seleccionado con el mes calendario inmediatamente anterior. Cargá ambos archivos y asignales su período en la biblioteca. Por ejemplo, al abrir noviembre se compara con octubre, aunque hoy sea otro mes.

Se muestran FCR 7 días, 24 horas y 12 horas, los registros válidos de ambos meses y la diferencia en puntos porcentuales: pasar de 80 % a 85 % es una mejora de 5 p.p. Un FCR menor indica empeoramiento. La comparación usa todos los registros correspondientes de cada archivo, sin filtros del detalle; en el perfil se conserva el mismo identificador del usuario.

Si falta el mes anterior, no se reemplaza por otro mes. Si hay varias versiones, se debe elegir una. Sin registros válidos en cualquiera de los meses, el resultado es «No comparable», no 0 %. Los archivos pueden tener distinta cobertura; no se ajustan por días trabajados. La variación se redondea a 0,01 p.p. y los cambios que redondean a cero se indican como «Sin cambios visibles».

Requiere Node.js:

```sh
node tests/smoke.cjs
node tests/tmo.cjs
node tests/fcr.cjs
node tests/fcr-tabs.cjs
node tests/fcr-view.cjs
node tests/fcr-library.cjs
node tests/fcr-history-view.cjs
node tests/fcr-only.cjs
node tests/fcr-profile-routes.cjs
node tests/fcr-comparison.cjs
node tests/fcr-coach.cjs
node tests/fcr-cloud.cjs
node tests/fcr-cloud-auth.cjs
node tests/fcr-login-view.cjs
node tests/fcr-account.cjs
node tests/fcr-team.cjs
node tests/fcr-teams-directory.cjs
node tests/fcr-sections.cjs
node tests/fcr-drop.cjs
node tests/fcr-notifications.cjs
node tests/theme.cjs
node tests/fcr-team.cjs
```

La prueba utiliza únicamente datos ficticios. No requiere instalar dependencias.

## Archivos locales excluidos

El repositorio contiene la aplicación, no los datos de atención. El CSV, las exportaciones, los documentos con ejemplos reales, las credenciales y las pruebas locales que referencian casos reales se excluyen mediante `.gitignore`.


### Inicio, seguimiento y control

El resumen de cada supervisor muestra su equipo asignado y sus FCR. Gonzalo conserva la vista general. Las alertas identifican caídas comparables frente al mes anterior y los cinco motivos originales con más recontactos por plazo; informan los volúmenes y la diferencia en puntos porcentuales. El perfil del asesor incluye los últimos 12 meses hasta el archivo abierto, con selección de versión cuando hay varias. Los meses sin datos no se convierten en cero. Los filtros de la lista se recuperan al regresar desde un perfil. Archivos incluye controles de meses faltantes, versiones, contenido idéntico, filas omitidas y supervisores ambiguos.


### PDF e historial

En Resumen se descarga un PDF del equipo del supervisor (o de todos los asesores para Gonzalo). En cada perfil de equipo, Descargar PDF del equipo usa los integrantes de ese perfil. Incluye las tres ventanas FCR, resultados individuales, variación mensual y cinco motivos con más recontactos en 7 días. Usa el archivo abierto completo, sin filtros; compara la misma composición actual del equipo. Si hay varias versiones anteriores, hay que elegir una en Comparación mensual. La generación es local, sin transmitir datos a servicios de PDF.

Historial (`#/historial`) es exclusivo del administrador. La migración `009-audit-history.sql` registra desde su instalación cargas, eliminaciones, cambios de período, asignaciones de agentes, decisiones de acceso y blanqueos. Los eventos se generan en la base dentro de la misma transacción, no se pueden editar desde la página y nunca almacenan contraseñas. No se reconstruyen movimientos anteriores a la instalación.
