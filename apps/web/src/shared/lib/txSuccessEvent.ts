import type { TxResult } from "@/shared/hooks/useNextActions";

const EVENT_NAME = "snowball:tx-success";

export function emitTxSuccess(result: TxResult) {
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: result }));
}

export function onTxSuccess(handler: (result: TxResult) => void): () => void {
  const listener = (e: Event) => handler((e as CustomEvent).detail);
  window.addEventListener(EVENT_NAME, listener);
  return () => window.removeEventListener(EVENT_NAME, listener);
}
