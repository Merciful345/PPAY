# PPAY

Tablero en español para analizar interacciones de atención. Funciona en el navegador, procesa el CSV localmente y conserva intacto el archivo original.

## Abrir la aplicación

1. Descargá o cloná este repositorio.
2. Abrí `index.html` con Chrome o Edge.
3. Pulsá **Cargar CSV** y elegí tu exportación.

En Windows también podés ejecutar `ABRIR.bat` si tenés Python instalado. Esto sirve la carpeta en `http://localhost:8765`, únicamente en tu equipo. Cerrá el servidor con Ctrl+C al terminar.

El CSV se guarda como una copia en IndexedDB del navegador para recuperarlo al recargar. Usá el mismo navegador, perfil y dirección de la página. **Borrar copia guardada** elimina esa copia, sin modificar el archivo original.

## Vistas y reglas

- **TMO:** (Total de ACW + Manejo total) / atendidas con ambos tiempos informados, convertido a segundos. Atendidas son casos distintos donde participó el asesor. No se aplica el filtro del último asesor a TMO. En compartidos, los tiempos son del caso completo.
- **FCR:** porcentaje de casos sin otro contacto del mismo cliente en siete días, entre los evaluables. Se distingue el seguimiento incompleto.
- **CxH:** cierres por fecha y hora asignados al último asesor. Se excluyen las conclusiones que terminan en CLIENTE NO CONTESTA.
- **Casos:** detalle del caso, historial y todas las columnas originales.
- **Actividad:** matriz por asesor y fecha, columnas, distribución por canal e histogramas.

Las columnas se identifican por encabezado, independientemente de su orden. El historial de recontactos se calcula con todo el archivo antes de aplicar los filtros de visualización. La empresa del asesor es un indicio obtenido de filas con un asesor y una división; no se infiere cruzando listas por posición.

La guía de uso ampliada está en `LEEME.txt`.

## Validación sin datos reales

Requiere Node.js:

```sh
node tests/smoke.cjs
```

La prueba utiliza únicamente datos ficticios. No requiere instalar dependencias.

## Archivos locales excluidos

El repositorio contiene la aplicación, no los datos de atención. El CSV, las exportaciones, los documentos con ejemplos reales, las credenciales y las pruebas locales que referencian casos reales se excluyen mediante `.gitignore`.
