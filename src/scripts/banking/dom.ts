export function setText(root: ParentNode, name: string, text: string): void {
  const node = root.querySelector(`[data-out="${name}"]`);
  if (node) node.textContent = text;
}

export function field(root: ParentNode, name: string): HTMLInputElement | HTMLSelectElement | null {
  const node = root.querySelector(`[data-field="${name}"]`);
  if (node instanceof HTMLInputElement || node instanceof HTMLSelectElement) return node;
  return null;
}

export function inputField(root: ParentNode, name: string): HTMLInputElement | null {
  const node = field(root, name);
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

export function clearErrors(root: ParentNode): void {
  root.querySelectorAll<HTMLElement>("[data-error]").forEach((node) => {
    node.textContent = "";
  });
}

export function showError(root: ParentNode, name: string, message: string): void {
  const node = root.querySelector(`[data-error="${name}"]`);
  if (node) node.textContent = message;
  const input = root.querySelector(`[data-field="${name}"]`);
  if (input instanceof HTMLElement) input.setAttribute("aria-invalid", "true");
}

export function clearInvalid(root: ParentNode): void {
  root.querySelectorAll<HTMLElement>("[aria-invalid]").forEach((node) => {
    node.removeAttribute("aria-invalid");
  });
}

export function isTouched(root: HTMLElement): boolean {
  return root.dataset.touched === "true";
}

export function setPrompt(root: ParentNode, text: string): void {
  const prompt = root.querySelector<HTMLElement>("[data-prompt]");
  if (!prompt) return;
  prompt.hidden = false;
  prompt.textContent = text;
}

export function hidePrompt(root: ParentNode): void {
  const prompt = root.querySelector<HTMLElement>("[data-prompt]");
  if (prompt) prompt.hidden = true;
}

export function hideResults(root: HTMLElement): void {
  const results = root.querySelector<HTMLElement>("[data-results]");
  if (results) {
    results.hidden = true;
    results.classList.remove("is-stale");
  }
  delete root.dataset.hasResult;
}

export function showResults(root: HTMLElement): void {
  const results = root.querySelector<HTMLElement>("[data-results]");
  if (results) {
    results.hidden = false;
    results.classList.remove("is-stale");
  }
  root.dataset.hasResult = "true";
}

export function bindDebounced(root: HTMLElement, render: () => void): void {
  let timer = 0;
  const schedule = () => {
    root.dataset.touched = "true";
    window.clearTimeout(timer);
    timer = window.setTimeout(render, 150);
  };
  root.addEventListener("input", schedule);
  root.addEventListener("change", schedule);
  render();
  root.dataset.ready = "true";
}
