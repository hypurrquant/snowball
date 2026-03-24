import { toast } from "sonner";
import { translateError } from "./errorMessages";

export function showTxError(error: unknown) {
  const err = error instanceof Error ? error : new Error(String(error));
  const translated = translateError(err);
  toast.error(translated.title, {
    description: `${translated.description}${translated.action ? `\n${translated.action}` : ""}`,
    duration: 8000,
  });
}
