// Calculadora de calorías y macros. Mismas fórmulas que Macrómetro (Mifflin-St Jeor).
export const ACTIVIDADES = [[1.2, 'Sedentario', 'Oficina, sin deporte'], [1.375, 'Ligera', '1-3 entrenos por semana'], [1.55, 'Moderada', '3-5 entrenos por semana'],
  [1.725, 'Alta', '6-7 entrenos por semana'], [1.9, 'Muy alta', 'Doble sesión o trabajo físico']];
export const METAS = [['def', 'Perder grasa', 'Déficit del 20 %', 0.8], ['man', 'Mantener', 'Mantener tu peso', 1], ['vol', 'Ganar músculo', 'Superávit del 10 %', 1.1]];
export const SEXOS = [['h', 'Hombre'], ['m', 'Mujer'], ['o', 'Prefiero no decirlo']];

const r10 = (n) => Math.round(n / 10) * 10;
const SUELO = { h: 1500, m: 1200, o: 1350 }; // por debajo de esto no se recomienda bajar sin control profesional

export function calcularObjetivo({ sexo, edad, peso, altura, actividad, meta, entrenos = 0 }) {
  edad = +edad; peso = +peso; altura = +altura; actividad = +actividad; entrenos = Math.max(0, Math.min(7, Math.round(+entrenos || 0)));
  if (!(edad >= 16 && edad <= 90)) return { error: 'La edad debe estar entre 16 y 90 años.' };
  if (!(peso >= 30 && peso <= 300)) return { error: 'El peso debe estar entre 30 y 300 kg.' };
  if (!(altura >= 120 && altura <= 230)) return { error: 'La altura debe estar entre 120 y 230 cm.' };
  if (!SEXOS.some(([v]) => v === sexo) || !METAS.some(([v]) => v === meta) || !ACTIVIDADES.some(([v]) => v === actividad)) return { error: 'Completa todos los datos.' };

  const bmr = 10 * peso + 6.25 * altura - 5 * edad + (sexo === 'h' ? 5 : sexo === 'm' ? -161 : -78);
  const tdee = bmr * actividad, factor = METAS.find(([v]) => v === meta)[3];
  let kcal = tdee * factor; const avisos = [];
  if (kcal < SUELO[sexo]) { kcal = SUELO[sexo]; avisos.push(`Tu objetivo quedaba por debajo de ${SUELO[sexo]} kcal. Lo he subido a ese mínimo: comer menos de eso solo es recomendable con seguimiento profesional.`); }
  if (edad < 18) avisos.push('Estas fórmulas están pensadas para adultos. Si eres menor de 18 años, consulta con un profesional antes de seguirlas.');
  const imc = peso / ((altura / 100) ** 2);
  if (imc < 18.5 && meta === 'def') avisos.push('Con tu peso y altura, perder grasa no suele ser recomendable. Consulta con un profesional.');

  const prot = peso * (meta === 'def' ? 2 : 1.8);
  const grasa = Math.max(kcal * 0.25 / 9, peso * 0.8);
  const carb = Math.max((kcal - prot * 4 - grasa * 9) / 4, 0);
  if (prot * 4 > kcal * 0.45) avisos.push('La proteína sale muy alta para tus calorías. Puedes bajarla un poco si lo prefieres.');

  // Días de entreno comes algo más y los de descanso algo menos, de modo que la media semanal es tu objetivo.
  const extra = entrenos > 0 && entrenos < 7 ? Math.round(kcal * 0.08) : 0;
  const sin = extra ? kcal - (extra * entrenos) / 7 : kcal, gym = extra ? sin + extra : kcal;
  return { bmr: Math.round(bmr), tdee: Math.round(tdee), kcal: r10(kcal), gym: r10(gym), sin: r10(sin), prot: Math.round(prot), carb: Math.round(carb), grasa: Math.round(grasa), imc: Math.round(imc * 10) / 10, avisos, entrenos };
}
