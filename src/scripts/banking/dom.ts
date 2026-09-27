export function setText(root: ParentNode, name: string, text: string): void {
  const node = root.querySelector(`[data-out="${name}"]`);
  if (node) node.textContent = text;
}

export function textField(root: ParentNode, name: string): HTMLInputElement | null {
  const node = root.querySelector(`[data-field="${name}"]`);
  return node instanceof HTMLInputElement ? node : null;
}

export function checkedValue(root: ParentNode, name: string): string | null {
  const node = root.querySelector(`input[name="${CSS.escape(name)}"]:checked`);
  return node instanceof HTMLInputElement ? node.value : null;
}

export function downloadText(filename: string, contents: string, mime: string): void {
  const blob = new Blob([contents], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function fillTable(body: HTMLElement, rows: string[][]): void {
  body.replaceChildren();
  for (const cells of rows) {
    const tr = document.createElement("tr");
    cells.forEach((value, index) => {
      const cell = document.createElement(index === 0 ? "th" : "td");
      cell.textContent = value;
      if (index === 0 && cell instanceof HTMLTableCellElement) cell.scope = "row";
      tr.append(cell);
    });
    body.append(tr);
  }
}
