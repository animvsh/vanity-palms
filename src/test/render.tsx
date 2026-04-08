import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

function normalizeText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

export async function renderWithRouter(
  ui: React.ReactNode,
  initialEntries: string[] = ["/"],
) {
  const container = document.createElement("div");
  document.body.appendChild(container);

  let root: Root;

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  await act(async () => {
    root = createRoot(container);
    root.render(
      <QueryClientProvider client={queryClient}>
        <HelmetProvider>
          <MemoryRouter
            initialEntries={initialEntries}
            future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
          >
            {ui}
          </MemoryRouter>
        </HelmetProvider>
      </QueryClientProvider>,
    );
  });

  return {
    container,
    unmount: async () => {
      await act(async () => {
        root.unmount();
      });
      container.remove();
    },
  };
}

export async function waitFor<T>(assertion: () => T, timeoutMs = 1500) {
  const start = Date.now();

  while (true) {
    try {
      return assertion();
    } catch (error) {
      if (Date.now() - start > timeoutMs) {
        throw error;
      }
      await new Promise((resolve) => window.setTimeout(resolve, 20));
    }
  }
}

export async function click(element: Element) {
  await act(async () => {
    element.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
}

export async function changeValue(element: HTMLInputElement, value: string) {
  await act(async () => {
    const descriptor = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    );
    descriptor?.set?.call(element, value);
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
  });
}

export function findElementByText(container: ParentNode, text: string, selector = "*") {
  return Array.from(container.querySelectorAll<HTMLElement>(selector)).find((element) =>
    normalizeText(element.textContent ?? "").includes(normalizeText(text)),
  ) ?? null;
}

export function findButtonByText(container: ParentNode, text: string) {
  return findElementByText(container, text, "button");
}

export function findLinkByText(container: ParentNode, text: string) {
  return findElementByText(container, text, "a");
}
