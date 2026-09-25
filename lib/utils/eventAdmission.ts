// Event admission <-> businesses.price_context.
//
// Events have no admission column: the form's Free/Paid toggle and price are
// flattened into price_context as "Free entry" or "$<price> admission". Both
// directions live here so the submit route (write), the edit PATCH (write) and
// the edit GET (read back into the form) can't drift on the format.

const PAID_RE = /^\$(.*) admission$/;

export function admissionToPriceContext(
  isFreeEntry: boolean,
  admissionPrice: string
): string | null {
  if (isFreeEntry) return "Free entry";
  return admissionPrice ? `$${admissionPrice} admission` : null;
}

export function priceContextToAdmission(
  priceContext: string | null | undefined
): { isFreeEntry: boolean; admissionPrice: string } {
  const paid = priceContext ? PAID_RE.exec(priceContext) : null;
  return paid
    ? { isFreeEntry: false, admissionPrice: paid[1] }
    : { isFreeEntry: true, admissionPrice: "" };
}
