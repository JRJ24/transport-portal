/**
 * Formato unico de dinero del portal.
 *
 * Siempre dos decimales: `6000.40` es un monto valido y truncarlo a `RD$6,000`
 * cambia lo que el operador lee. Antes convivian cuatro implementaciones y dos
 * de ellas usaban `maximumFractionDigits: 0`.
 */
const MONEY_FORMAT = new Intl.NumberFormat("es-DO", {
  style: "currency",
  currency: "DOP",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatMoney(value: number | string | null | undefined) {
  const amount = Number(value ?? 0);
  return MONEY_FORMAT.format(Number.isFinite(amount) ? amount : 0);
}
