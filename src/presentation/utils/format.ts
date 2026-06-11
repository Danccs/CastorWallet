/**
 * Formatea un número como dinero utilizando el punto (.) como separador de miles.
 * Garantiza el separador incluso en números de 4 dígitos (ej: 1.000).
 */
export const formatMoney = (val: number): string => {
  return Math.round(val).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};
