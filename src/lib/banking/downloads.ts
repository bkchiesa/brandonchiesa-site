import { statSync } from "node:fs";
import { join } from "node:path";
import { BANKING_TEMPLATES, type BankingTemplate } from "../../data/banking/templates";

export interface BankingTemplateFile extends BankingTemplate {
  bytes: number;
  sizeLabel: string;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 10) return `${kb.toFixed(1)} KB`;
  return `${Math.round(kb)} KB`;
}

/** Build-time file sizes for the public placeholder downloads. */
export function bankingTemplateFiles(): BankingTemplateFile[] {
  return BANKING_TEMPLATES.map((item) => {
    const bytes = statSync(join(process.cwd(), "public", item.href)).size;
    return { ...item, bytes, sizeLabel: formatFileSize(bytes) };
  });
}
