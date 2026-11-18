# SheetJS Community Edition

La aplicación incluye una copia local de `xlsx.mini.min.js` de SheetJS CE 0.20.3 para leer archivos XLSX en el navegador y en el worker FCR. No se descarga código durante el uso del tablero. Los archivos solo se envían a Supabase si el supervisor elige la biblioteca compartida.

- Fuente oficial: https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.mini.min.js
- Licencia original: `SHEETJS-LICENSE.txt` (Apache License 2.0).
- Documentación: https://docs.sheetjs.com/docs/getting-started/installation/standalone/

## Supabase

`supabase.min.js` se genera con `npm run build:supabase` desde el SDK oficial `@supabase/supabase-js` 2.119.0. Las versiones y dependencias se fijan en `package-lock.json`. Las licencias incluidas en el bundle se recopilan en `SUPABASE-LICENSES.txt`.
