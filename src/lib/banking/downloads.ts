import { statSync } from "node:fs";
import { join } from "node:path";
import { BANKING_CARDS, type BankingCard, type BankingDownload } from "../../data/banking/templates";

export interface BankingFileView extends BankingDownload {
  bytes: number;
  sizeLabel: string;
}

export interface BankingCardView extends BankingCard {
  files: BankingFileView[];
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 100) return `${kb.toFixed(1)} KB`;
  return `${Math.round(kb)} KB`;
}

/** Build-time sizes for the published template files. */
export function bankingCards(): BankingCardView[] {
  return BANKING_CARDS.map((card) => ({
    ...card,
    files: card.files.map((file) => {
      const bytes = statSync(join(process.cwd(), "public", file.href)).size;
      return { ...file, bytes, sizeLabel: formatFileSize(bytes) };
    }),
  }));
}
