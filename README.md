# Rutina

App de escritorio (Windows y Mac) para planear comidas, compra y entrenos. Los datos se guardan en un archivo local; no hay servidor ni cuentas.

```
src/      interfaz (HTML/CSS/JS sin build) y lógica pura (logic.js)
main.js   proceso principal de Electron (ventana + guardado en archivo)
preload.js puente seguro entre la interfaz y el guardado
site/     web de descarga (estática)
test/     tests de la lógica (npm test)
```

## Probarla en tu ordenador
```bash
npm install
npm start
```

## Crear los instaladores
Los instaladores de Mac solo se pueden crear en un Mac, y los de Windows en Windows, así que se hace con GitHub Actions:

1. Sube esta carpeta a un repositorio de GitHub.
2. Crea una etiqueta de versión: `git tag v0.1.0 && git push --tags`.
3. En la pestaña *Actions* se generan `Rutina-mac-arm64.dmg`, `Rutina-mac-x64.dmg` y `Rutina-win-x64.exe`, y se publican en *Releases*.
4. En `site/index.html` cambia `charlymanso` por tu usuario de GitHub y publica la carpeta `site/` (GitHub Pages, Netlify, etc.).

## Firma (opcional, más adelante)
Sin firma, Mac y Windows piden confirmación al abrir la app la primera vez. Para quitar el aviso hace falta una cuenta de desarrollador de Apple (99 €/año) y un certificado de firma de código de Windows.
