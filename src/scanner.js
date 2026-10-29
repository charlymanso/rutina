// Lector de códigos de barras con la cámara. Usa el detector del navegador si existe (Chrome, Android)
// y, si no (iPhone/Safari), la librería ZXing incluida en vendor/. Todo ocurre en el dispositivo: no se sube ninguna imagen.
const FORMATOS = ['ean_13', 'ean_8', 'upc_a', 'upc_e'];

export const hayCamara = () => !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);

function cargarZXing() {
  if (window.ZXing) return Promise.resolve(window.ZXing);
  return new Promise((ok, ko) => { const s = document.createElement('script'); s.src = 'vendor/zxing.min.js'; s.onload = () => ok(window.ZXing); s.onerror = () => ko(new Error('zxing')); document.head.append(s); });
}

// Abre la cámara en `video` y llama a onCodigo(texto) una vez. Devuelve una función para pararla.
export async function iniciar(video, onCodigo) {
  const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
  video.srcObject = stream; video.setAttribute('playsinline', ''); video.muted = true; await video.play().catch(() => {});
  let vivo = true, hecho = false;
  const fin = (c) => { if (hecho || !vivo) return; hecho = true; onCodigo(c); };
  const parar = () => { vivo = false; stream.getTracks().forEach((t) => t.stop()); video.srcObject = null; };
  if ('BarcodeDetector' in window) {
    try {
      const det = new window.BarcodeDetector({ formats: FORMATOS });
      (async function bucle() { while (vivo) { try { const r = await det.detect(video); if (r.length) return fin(r[0].rawValue); } catch {} await new Promise((x) => setTimeout(x, 200)); } })();
      return parar;
    } catch {}
  }
  const Z = await cargarZXing();
  const hints = new Map(); hints.set(Z.DecodeHintType.POSSIBLE_FORMATS, [Z.BarcodeFormat.EAN_13, Z.BarcodeFormat.EAN_8, Z.BarcodeFormat.UPC_A, Z.BarcodeFormat.UPC_E]); hints.set(Z.DecodeHintType.TRY_HARDER, true);
  const lector = new Z.MultiFormatReader(); lector.setHints(hints);
  const lienzo = document.createElement('canvas'), ctx = lienzo.getContext('2d', { willReadFrequently: true });
  (async function bucle() {
    while (vivo) {
      if (video.videoWidth) {
        const w = Math.min(video.videoWidth, 960), hh = Math.round(w * video.videoHeight / video.videoWidth); lienzo.width = w; lienzo.height = hh; ctx.drawImage(video, 0, 0, w, hh);
        try { const lum = new Z.HTMLCanvasElementLuminanceSource(lienzo), bmp = new Z.BinaryBitmap(new Z.HybridBinarizer(lum)); return fin(lector.decode(bmp).getText()); } catch { /* sin código en este fotograma */ }
      }
      await new Promise((x) => setTimeout(x, 120));
    }
  })();
  return parar;
}
