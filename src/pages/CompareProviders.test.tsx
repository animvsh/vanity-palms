import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { procedures, providers, reviews } from "@/data/mockData";
import {
  fetchProcedures,
  fetchProvidersByIds,
  fetchReviewsByProcedure,
  trackEvent,
} from "@/lib/api";
import CompareProviders from "@/pages/CompareProviders";
import {
  click,
  findButtonByText,
  renderWithRouter,
  waitFor,
} from "@/test/render";

vi.mock("@/lib/api", () => ({
  fetchProvidersByIds: vi.fn(),
  fetchProcedures: vi.fn(),
  fetchReviewsByProcedure: vi.fn(),
  trackEvent: vi.fn(),
}));

const fetchProvidersByIdsMock = vi.mocked(fetchProvidersByIds);
const fetchProceduresMock = vi.mocked(fetchProcedures);
const fetchReviewsByProcedureMock = vi.mocked(fetchReviewsByProcedure);
const trackEventMock = vi.mocked(trackEvent);

describe("CompareProviders", () => {
  let mounted: Awaited<ReturnType<typeof renderWithRouter>> | null = null;

  beforeEach(() => {
    vi.clearAllMocks();
    fetchProvidersByIdsMock.mockResolvedValue([providers[0], providers[2]]);
    fetchProceduresMock.mockResolvedValue(procedures);
    fetchReviewsByProcedureMock.mockResolvedValue(
      reviews.filter((review) => review.procedureId === "rhinoplasty"),
    );
    trackEventMock.mockResolvedValue(undefined);
  });

  afterEach(async () => {
    if (mounted) {
      await mounted.unmount();
      mounted = null;
    }
  });

  test("loads selected providers and opens the review modal for a shared procedure", async () => {
    mounted = await renderWithRouter(<CompareProviders />, ["/compare?ids=dr-chen,dr-patel"]);

    await waitFor(() => {
      expect(fetchProvidersByIdsMock).toHaveBeenCalledWith(["dr-chen", "dr-patel"]);
    });

    await waitFor(() => {
      expect(trackEventMock).toHaveBeenCalledWith("dr-chen", "compare_view");
      expect(trackEventMock).toHaveBeenCalledWith("dr-patel", "compare_view");
    });

    const rhinoplastyButton = await waitFor(() => {
      const button = findButtonByText(mounted!.container, "Rhinoplasty");
      expect(button).not.toBeNull();
      return button!;
    });

    await click(rhinoplastyButton);

    await waitFor(() => {
      expect(fetchReviewsByProcedureMock).toHaveBeenCalledWith("rhinoplasty");
    });

    await waitFor(() => {
      expect(document.body.textContent).toContain("Rhinoplasty — Reviews");
    });

    expect(document.body.textContent).toContain("(3 reviews)");
    expect(document.body.textContent).toContain("Jessica M.");
  });

  test("shows the fallback state when fewer than two providers are selected", async () => {
    mounted = await renderWithRouter(<CompareProviders />, ["/compare?ids=dr-chen"]);

    await waitFor(() => {
      expect(mounted?.container.textContent).toContain("Select at least 2 providers to compare.");
    });

    expect(fetchProvidersByIdsMock).not.toHaveBeenCalled();
    expect(trackEventMock).not.toHaveBeenCalled();
  });
});
