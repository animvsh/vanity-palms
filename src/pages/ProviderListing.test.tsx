import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { procedures, providers } from "@/data/mockData";
import { fetchProcedures, fetchProviders } from "@/lib/api";
import ProviderListing from "@/pages/ProviderListing";
import {
  changeValue,
  click,
  findButtonByText,
  findLinkByText,
  renderWithRouter,
  waitFor,
} from "@/test/render";

vi.mock("@/lib/api", () => ({
  fetchProviders: vi.fn(),
  fetchProcedures: vi.fn(),
}));

const fetchProvidersMock = vi.mocked(fetchProviders);
const fetchProceduresMock = vi.mocked(fetchProcedures);

describe("ProviderListing", () => {
  let mounted: Awaited<ReturnType<typeof renderWithRouter>> | null = null;

  beforeEach(() => {
    vi.clearAllMocks();
    fetchProvidersMock.mockResolvedValue(providers.slice(0, 5));
    fetchProceduresMock.mockResolvedValue(procedures);
  });

  afterEach(async () => {
    if (mounted) {
      await mounted.unmount();
      mounted = null;
    }
  });

  test("supports provider selection for compare and text search filtering", async () => {
    mounted = await renderWithRouter(<ProviderListing />);

    await waitFor(() => {
      expect(mounted?.container.textContent).toContain("Dr. Sarah Chen");
    });

    const checkboxes = mounted.container.querySelectorAll('[role="checkbox"]');
    await click(checkboxes[0]);
    await click(checkboxes[1]);

    await waitFor(() => {
      expect(mounted?.container.textContent).toContain("2 providers selected");
    });

    const compareLink = findLinkByText(mounted.container, "Compare");
    expect(compareLink).not.toBeNull();
    expect(compareLink?.getAttribute("href")).toBe("/compare?ids=dr-chen,dr-patel");

    const searchInput = mounted.container.querySelector(
      'input[placeholder="Search by name or specialty..."]',
    ) as HTMLInputElement | null;
    expect(searchInput).not.toBeNull();

    await changeValue(searchInput!, "martinez");

    await waitFor(() => {
      expect(mounted?.container.textContent).toContain("1 provider");
    });

    expect(mounted.container.textContent).toContain("Dr. James Martinez");
    expect(mounted.container.textContent).not.toContain("Dr. Sarah Chen");
  });

  test("filters down to providers who perform every selected procedure", async () => {
    mounted = await renderWithRouter(<ProviderListing />);

    await waitFor(() => {
      expect(mounted?.container.textContent).toContain("Dr. Priya Patel");
    });

    const filterToggle = mounted.container
      .querySelector("svg.lucide-sliders-horizontal")
      ?.closest("button");
    expect(filterToggle).not.toBeNull();

    await click(filterToggle!);

    const rhinoplastyButton = await waitFor(() => {
      const button = findButtonByText(mounted!.container, "Rhinoplasty");
      expect(button).not.toBeNull();
      return button!;
    });
    const botoxButton = findButtonByText(mounted.container, "Botox");

    expect(botoxButton).not.toBeNull();

    await click(rhinoplastyButton);
    await click(botoxButton!);

    await waitFor(() => {
      expect(mounted?.container.textContent).toContain(
        "Showing providers who perform all 2 selected procedures",
      );
    });

    expect(mounted.container.textContent).toContain("1 provider");
    expect(mounted.container.textContent).toContain("Dr. Priya Patel");
    expect(mounted.container.textContent).toContain("Performs all selected procedures");
    expect(mounted.container.textContent).not.toContain("Dr. Sarah Chen");
  });
});
