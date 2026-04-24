/** Dispatched after finance data changes so shell chrome (e.g. alert badge) can refetch immediately. */
export const FA_INVALIDATE_ALERT_COUNT = "fa:invalidate-alert-count";

export function invalidateAlertCount() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(FA_INVALIDATE_ALERT_COUNT));
}
