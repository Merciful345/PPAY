# PPAY

Tablero en español para analizar FCR. Funciona en el navegador, procesa Excel y CSV localmente y conserva intactos los archivos originales.

## Abrir la aplicación

1. Descargá o cloná este repositorio.
2. Abrí `index.html` con Chrome o Edge.
3. Pulsá **Cargar Excel o CSV** y elegí una o varias exportaciones de FCR.
4. Indicá el período si lo conocés, o dejá que se detecte cuando el archivo trae mes y año claros.

En Windows también podés ejecutar `ABRIR.bat` si tenés Python instalado. Esto sirve la carpeta en `http://localhost:8765`, únicamente en tu equipo. Cerrá el servidor con Ctrl+C al terminar.

Cada archivo se guarda en la biblioteca local de IndexedDB. Usá el mismo navegador, perfil y dirección de la página para recuperar los meses anteriores. Conservá los originales: esta biblioteca no se sincroniza entre dispositivos y puede perderse si borrás los datos del navegador.

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
```

La prueba utiliza únicamente datos ficticios. No requiere instalar dependencias.

## Archivos locales excluidos

El repositorio contiene la aplicación, no los datos de atención. El CSV, las exportaciones, los documentos con ejemplos reales, las credenciales y las pruebas locales que referencian casos reales se excluyen mediante `.gitignore`.
