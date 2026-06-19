// Paystack is the only payment gateway (OPay removed).
export type PaymentMethod = "paystack";

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

export function getPaymentMethodLabel(_method: PaymentMethod) {
  return "Paystack";
}

export function getPaymentMethodDescription(_method: PaymentMethod) {
  return "Card, bank transfer, and mobile-ready checkout for Nigerian learners.";
}

export function buildPaymentReference(_method: PaymentMethod) {
  return `PSTK-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
}
