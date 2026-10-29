const { chromium } = require('playwright');
// Prueba de interfaz (Playwright). La lanza `npm run test:e2e` (test/e2e/run.cjs), que sirve la app y fija BASE.
const BASE = process.env.BASE, SHOTS = process.env.SHOTS || require('os').tmpdir();
const ok = (c, t) => { console.log(c ? 'OK  ' : 'FALLO', t); if (!c) process.exitCode = 1; };
(async () => {
  const b = await chromium.launch(), ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }), errs = [];
  await ctx.route(BASE + '/config.js', (r) => r.fulfill({ contentType: 'text/javascript', body: "export const NUBE={url:'',anonKey:'',google:false};" }));
  const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(e.message));
  await p.addInitScript(() => { window.rutina = { platform: 'win32', load: async () => { try { return JSON.parse(localStorage.getItem('stub')); } catch { return null; } }, save: async (x) => { localStorage.setItem('stub', JSON.stringify(x)); }, version: async () => '0' }; });
  await p.goto(BASE + '/index.html'); await p.waitForSelector('.sheet'); await p.fill('input[placeholder="Tu nombre"]', 'Ana'); await p.click('text=Empezar con un plan de ejemplo'); await p.waitForSelector('h1.title');
  await p.click('nav >> text=Menú'); await p.click('#fija-desayuno-0'); await p.waitForSelector('#plato-elegir'); ok(!(await p.locator('.sheet').last().textContent()).includes('null'), 'Desayuno: sin "null" arriba'); await p.click('.sheet >> text=Cancelar'); await p.click('.plato >> nth=0'); await p.waitForSelector('#plato-elegir');
  ok(!(await p.locator('.sheet').last().textContent()).includes('null') && !(await p.locator('.sheet').last().textContent()).includes('undefined'), 'Sin "null" en el editor de plato');
  ok(await p.locator('.itemrow select').count() === 0 && await p.locator('.itemrow .nm').count() > 0, 'Cada alimento es solo texto, ya no se cambia con un desplegable');
  await p.click('#plato-elegir'); await p.waitForSelector('#elegir-gestionar');
  ok((await p.locator('.sheet').last().locator('.res').first().textContent()).includes('Gestionar platos'), 'Selector en lista: "Gestionar platos" va el primero');
  ok(await p.locator('.sheet').last().locator('text=En tu menú').count() === 1, 'Los platos del menú siguen disponibles');
  await p.click('#elegir-gestionar'); await p.waitForSelector('#plato-nuevo');
  ok(await p.locator('.sheet').count() === 0 && (await p.textContent('h1.title')) === 'Platos', 'Gestionar platos lleva a Ajustes > Platos');
  ok(await p.locator('#platos-importar').count() === 1 && await p.locator('#platos-vacio').count() === 1, 'Vacío: invita a crear o a guardar los del menú');
  await p.click('#plato-nuevo'); await p.waitForSelector('#nuevo-plato-nombre');
  await p.click('.sheet >> nth=-1 >> text=Guardar plato'); ok((await p.locator('.sheet').last().textContent()).includes('Escribe el nombre'), 'Pide nombre');
  await p.fill('#nuevo-plato-nombre', 'Bowl de arroz y pollo'); await p.click('.sheet >> nth=-1 >> text=Guardar plato'); ok((await p.locator('.sheet').last().textContent()).includes('al menos un ingrediente'), 'Pide ingredientes');
  await p.locator('.sheet').last().locator('#anadir-alimento').click(); await p.fill('#buscar-alimento', 'arroz'); await p.click('.res >> nth=0'); await p.waitForTimeout(200);
  await p.locator('.sheet').last().locator('#anadir-alimento').click(); await p.fill('#buscar-alimento', 'pollo'); await p.click('.res >> nth=0'); await p.waitForTimeout(200);
  ok((await p.textContent('#nuevo-plato-total')).includes('kcal'), 'Total: ' + await p.textContent('#nuevo-plato-total'));
  await p.click('.sheet >> nth=-1 >> text=Guardar plato'); await p.waitForTimeout(300);
  ok(await p.locator('#platos-lista .row').count() === 1 && (await p.textContent('#platos-lista')).includes('Bowl de arroz y pollo'), 'Aparece en la lista de platos');
  await p.click('#aj-atras'); ok((await p.textContent('#aj-platos')).includes('1 plato guardado'), 'El resumen en Ajustes lo cuenta');
  // editar
  await p.click('#aj-platos'); await p.click('#platos-lista .row >> nth=0'); await p.waitForSelector('#plato-borrar');
  await p.fill('#nuevo-plato-nombre', 'Bowl XL'); await p.fill('.sheet .itemrow input >> nth=0', '120'); await p.click('.sheet >> nth=-1 >> text=Guardar'); await p.waitForTimeout(300);
  const g = await p.evaluate(() => JSON.parse(localStorage.getItem('stub')).platosPropios); ok(g.length === 1 && g[0].t === 'Bowl XL' && g[0].items[0][1] === 120, 'Editar: cambia nombre y cantidad sin duplicar');
  // importar los del menú
  await p.click('#platos-importar'); await p.waitForTimeout(300); ok(await p.locator('#platos-lista .row').count() > 5 && await p.locator('#platos-importar').count() === 0, 'Guardar los de mi menú los añade todos');
  // usarlo desde el menú
  await p.click('nav >> text=Menú'); await p.click('.plato >> nth=1'); await p.waitForSelector('#plato-elegir'); await p.click('#plato-elegir');
  ok(await p.locator('.sheet').last().locator('text=Mis platos').count() === 1 && await p.locator('.sheet').last().locator('.res:has-text("Bowl XL")').count() === 1, 'En el menú sale en "Mis platos"');
  await p.click('.res:has-text("Bowl XL")'); ok((await p.textContent('#plato-nombre')) === 'Bowl XL' && await p.locator('.itemrow .nm').count() === 2, 'Al elegirlo copia nombre e ingredientes');
  await p.click('.sheet >> text=Cancelar');
  // borrar
  await p.click('nav >> text=Ajustes'); await p.click('#aj-platos'); await p.click('#platos-lista .row:has-text("Bowl XL")'); await p.click('#plato-borrar'); await p.locator('.sheet').last().locator('header .btn:not(.plain)').click(); await p.waitForTimeout(300);
  ok(!(await p.textContent('#platos-lista')).includes('Bowl XL'), 'Borrar plato lo quita de la lista');
  // menú ordenado
  await p.click('nav >> text=Menú'); const orden = await p.evaluate(() => [...document.querySelectorAll('.dayrow')[0].querySelectorAll('.meal .label')].map((x) => x.textContent)); ok(orden.join(',') === 'Desayuno,Media mañana,Comida,Cena', 'Menú: comidas en orden del día (' + orden.join(',') + ')');
  // un día que se pasa sale en rojo en el menú
  await p.click('.plato >> nth=0'); await p.waitForSelector('#plato-elegir'); await p.fill('.itemrow input >> nth=0', '900'); await p.locator('.sheet').last().locator('header .btn:not(.plain)').click(); await p.waitForTimeout(300);
  ok(await p.locator('.dayrow .dtot .bar.over').count() >= 1 && (await p.locator('.dayrow .dtot .over').first().evaluate((e) => getComputedStyle(e).color)) === 'rgb(229, 55, 43)', 'Menú: un día que se pasa sale en rojo');
  ok(errs.length === 0, 'Sin errores JS ' + errs.join('|'));
  await p.waitForTimeout(900); await p.screenshot({ path: SHOTS + '/plato.png' }); await b.close();
})();
