# Rutina

Tu día en un solo sitio: menú semanal con calorías y proteína, lista de la compra, entrenos con registro de pesos y un resumen de lo que llevas comido. Funciona como **app de escritorio** (Windows y Mac), como **web instalable** en el móvil (PWA) y, opcionalmente, con una **cuenta** para sincronizar entre dispositivos.

## Qué hace
- **Hoy:** las comidas del día con su check, nutrición que se completa según marcas lo comido (en rojo si te pasas de calorías), extras fuera del plan, entreno de hoy.
- **Menú:** semana a semana (ciclo de 1 o 2 semanas), con desayuno, media mañana, comida, merienda y cena; repetir un plato en varios días; recomendador de menús según tu objetivo.
- **Platos:** los creas con ingredientes en Ajustes y los eliges en cualquier comida. Hoy puedes cambiar el plato o las cantidades solo por ese día.
- **Compra:** sale del menú, agrupada por secciones del súper, con extras tuyos (etiqueta «Extra») y «Copiar lista».
- **Entreno:** sesiones con varios días, pesos recordados, ejercicios añadidos o quitados solo por hoy.
- **Alimentos:** base incluida, productos de supermercado (Open Food Facts) y lector de códigos de barras con la cámara.
- En el móvil, deslizar una fila hacia la izquierda la borra (con «Deshacer»).

## Estructura
```
src/        interfaz (HTML/CSS/JS sin build) y lógica pura (logic.js)
main.js     proceso principal de Electron (ventana, guardado en archivo, búsqueda de alimentos)
preload.js  puente seguro entre la interfaz y el sistema
site/       web de descarga (estática)
supabase/   tabla de cuentas (schema.sql) y función de búsqueda de alimentos para la web
test/       tests de la lógica (npm test)
docs/       cómo activar las cuentas (CUENTAS.md)
```

## Probarla en tu ordenador
```bash
npm install
npm start      # app de escritorio
npm test       # tests de la lógica
```
Para la versión web basta servir `src/` con cualquier servidor estático (`python3 -m http.server`).

## Publicar versiones
Todo está automatizado con GitHub Actions: al subir a `main` un `package.json` con una versión **nueva**, se crean los instaladores (`Rutina-win-x64.exe`, `Rutina-mac-*.dmg/zip`), se publican en *Releases* y se actualiza la web (`/app/` es la versión móvil). Windows se actualiza solo; en Mac la app avisa de la versión nueva.

## Cuentas (opcional)
Con una cuenta, el plan se guarda también en la nube (Supabase, correo/contraseña o Google) y se sincroniza. Si hay cambios en los dos sitios a la vez, la app pregunta cuál conservar; nunca pisa nada sin avisar. Las cuentas quedan apagadas mientras `src/config.js` tenga la dirección vacía. Pasos en [docs/CUENTAS.md](docs/CUENTAS.md).

La función `supabase/functions/alimentos` permite buscar productos desde el navegador (que no puede consultar Open Food Facts directamente). Se despliega con `supabase functions deploy alimentos`.

## Firma (opcional, más adelante)
Sin firma, Mac y Windows piden confirmación al abrir la app la primera vez. Para quitar el aviso hace falta una cuenta de desarrollador de Apple (99 €/año) y un certificado de firma de código de Windows.
