import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import * as copy from "../../data/banking/copy";
import { SBA_QUESTIONS } from "../../data/banking/sba-quick-check";
import { BANKING_CARDS } from "../../data/banking/templates";
import { openQuestionPrompt } from "../../scripts/banking/sba";

const DASH = /[\u2013\u2014]/;

function walkStrings(value: unknown, found: string[]): void {
  if (typeof value === "string") {
    found.push(value);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item) => walkStrings(item, found));
    return;
  }
  if (value && typeof value === "object") {
    Object.values(value).forEach((item) => walkStrings(item, found));
  }
}

function filesUnder(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return filesUnder(path);
    return path.endsWith(".astro") || path.endsWith(".ts") ? [path] : [];
  });
}

describe("banking visitor copy", () => {
  it("keeps plain punctuation in the banking copy and quick-check questions", () => {
    const strings: string[] = [];
    walkStrings(copy, strings);
    walkStrings(SBA_QUESTIONS, strings);
    const hits = strings.filter((text) => DASH.test(text));
    expect(hits).toEqual([]);
  });

  it("does not ship a sample loan amount or sample rate in the calculators", () => {
    const pages = filesUnder("src/pages/banking/calculators");
    for (const path of pages) {
      const source = readFileSync(path, "utf8");
      expect(source).not.toMatch(/value="(?:250000|7\.50|7\.5|20000|85|35)"/);
      expect(source).not.toContain("(example only)");
    }
  });

  it("has no em dashes or en dashes in the banking pages", () => {
    const roots = ["src/pages/banking", "src/components/banking", "src/scripts/banking", "src/data/banking", "src/lib/banking"];
    const hits = roots.flatMap((root) =>
      filesUnder(root).filter((path) => DASH.test(readFileSync(path, "utf8"))),
    );
    expect(hits).toEqual([]);
  });

  it("points every published template at a file in the repo", () => {
    for (const card of BANKING_CARDS) {
      expect(card.files.length).toBeGreaterThan(0);
      for (const file of card.files) {
        const bytes = statSync(join("public", file.href)).size;
        expect(bytes).toBeGreaterThan(1000);
      }
    }
  });

  it("names the questions still open on the SBA check", () => {
    expect(openQuestionPrompt([])).toBe("Answer all questions to see your result.");
    expect(openQuestionPrompt([4])).toBe("Answer all questions to see your result. Still open: question 4.");
    expect(openQuestionPrompt([2, 9])).toBe(
      "Answer all questions to see your result. Still open: question 2 and question 9.",
    );
    expect(openQuestionPrompt([1, 3, 13])).toBe(
      "Answer all questions to see your result. Still open: question 1, question 3, and question 13.",
    );
  });
});
