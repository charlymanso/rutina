// Se carga con `node --require` antes de cada prueba.
//  - Bloquea la consulta de versiones nuevas (api.github.com): si respondiera a mitad de una prueba, el aviso "Hay una versión nueva"
//    empujaría el contenido hacia abajo y haría fallar clics y gestos por un motivo que no es de la app. (Cada prueba puede volver a permitirla con su propia ruta.)
//  - Si FAKE_DATE está definida (p. ej. 2026-10-26T10:00:00), la app y la propia prueba creen que "hoy" es ese día,
//    para comprobar que nada depende del día de la semana.
const pw = require('playwright'), lanzar = pw.chromium.launch.bind(pw.chromium);
let script = null;
if (process.env.FAKE_DATE) {
  const falsa = new Date(process.env.FAKE_DATE).getTime(), RealDate = Date, desfase = falsa - RealDate.now();
  class FakeDate extends RealDate { constructor(...a) { if (a.length === 0) super(RealDate.now() + desfase); else super(...a); } static now() { return RealDate.now() + desfase; } }
  global.Date = FakeDate;
  script = `(() => { const R = Date, off = ${desfase}; class D extends R { constructor(...a) { if (a.length === 0) super(R.now() + off); else super(...a); } static now() { return R.now() + off; } } window.Date = D; })();`;
}
pw.chromium.launch = async (...args) => {
  const b = await lanzar(...args), nuevo = b.newContext.bind(b);
  b.newContext = async (...x) => {
    const c = await nuevo(...x);
    await c.route(/api\.github\.com/, (r) => r.abort());
    if (script) await c.addInitScript(script);
    return c;
  };
  return b;
};
