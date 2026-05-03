// Safe arithmetic formula evaluator with variables L (ancho) y H (alto).
// Soporta + - * / ( ) y números decimales. Cualquier otro caracter => null.
export function evalFormula(expr: string | null | undefined, vars: { L: number; H: number }): number | null {
  if (!expr) return null;
  let s = expr.replace(/\s+/g, "");
  // Replace L and H (case insensitive) by their numeric values
  s = s.replace(/[lL]/g, `(${vars.L})`).replace(/[hH]/g, `(${vars.H})`);
  if (!/^[-+*/().0-9]+$/.test(s)) return null;
  try {
    // eslint-disable-next-line no-new-func
    const fn = new Function(`return (${s});`);
    const v = fn();
    return typeof v === "number" && isFinite(v) ? v : null;
  } catch {
    return null;
  }
}
