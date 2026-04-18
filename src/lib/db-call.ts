import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Open a signed URL for a private storage file in a new tab.
 * Falls back to the raw value if it looks like a full URL (legacy data).
 */
export async function openSignedContract(filePath: string) {
  // Legacy rows may still hold full URLs
  if (filePath.startsWith("http")) {
    window.open(filePath, "_blank");
    return;
  }
  const { data, error } = await supabase.storage
    .from("contracts")
    .createSignedUrl(filePath, 3600);
  if (error || !data?.signedUrl) {
    toast.error("Could not load contract. Please try again.");
    return;
  }
  window.open(data.signedUrl, "_blank");
}

export async function downloadSignedContract(filePath: string) {
  if (filePath.startsWith("http")) {
    window.open(filePath, "_blank");
    return;
  }
  const { data, error } = await supabase.storage
    .from("contracts")
    .createSignedUrl(filePath, 3600);
  if (error || !data?.signedUrl) {
    toast.error("Could not download contract. Please try again.");
    return;
  }
  const link = document.createElement("a");
  link.href = data.signedUrl;
  link.download = `contract-${filePath.split("/").pop()}`;
  link.click();
}



const SAFE_ERROR_MESSAGES: Record<string, string> = {
  "23505": "This record already exists.",
  "23503": "A referenced record was not found.",
  "23502": "A required field is missing.",
  "42501": "You don't have permission to do that.",
  "PGRST301": "You don't have permission to do that.",
  "22P02": "Invalid input format.",
  "23514": "The value provided is not allowed.",
};

function getSafeErrorMessage(error: { code?: string; message?: string }): string {
  if (error.code && SAFE_ERROR_MESSAGES[error.code]) {
    return SAFE_ERROR_MESSAGES[error.code];
  }
  return "Something went wrong. Please try again.";
}

/**
 * Wraps a Supabase query call with error handling.
 * Shows a safe toast on error and returns null.
 */
export async function dbCall<T>(
  query: PromiseLike<{ data: T; error: any }>
): Promise<T | null> {
  const { data, error } = await query;
  if (error) {
    console.error("[dbCall]", error);
    toast.error(getSafeErrorMessage(error));
    return null;
  }
  return data;
}
