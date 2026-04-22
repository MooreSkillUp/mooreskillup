export type PaymentMethod = "paystack" | "opay";

const nairaFormatter = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  maximumFractionDigits: 0,
});

export function formatNaira(amount: number) {
  return nairaFormatter.format(amount);
}

export function getCourseActionLabel(price: number, owned: boolean) {
  if (price === 0) return "Start Course";
  if (owned) return "Open Course";
  return "Unlock Course";
}

export function getPaymentMethodLabel(method: PaymentMethod) {
  return method === "paystack" ? "Paystack" : "OPay";
}

export function getPaymentMethodDescription(method: PaymentMethod) {
  if (method === "paystack") {
    return "Card, bank transfer, and mobile-ready checkout for Nigerian learners.";
  }

  return "Fast mobile wallet checkout with a familiar OPay payment experience.";
}

export function buildPaymentReference(method: PaymentMethod) {
  const prefix = method === "paystack" ? "PSTK" : "OPAY";
  return `${prefix}-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
}
