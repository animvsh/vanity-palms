import { describe, expect, test } from "vitest";

import ProviderCard from "@/components/ProviderCard";
import { providers } from "@/data/mockData";
import { renderWithRouter, waitFor } from "@/test/render";

describe("ProviderCard", () => {
  test("renders an Instagram link when the provider has one", async () => {
    const provider = {
      ...providers[0],
      instagramUrl: "https://instagram.com/drsarahchen",
    };

    const mounted = await renderWithRouter(<ProviderCard provider={provider} />);

    await waitFor(() => {
      const link = mounted.container.querySelector('a[href="https://instagram.com/drsarahchen"]');
      expect(link).not.toBeNull();
      expect(link?.textContent).toContain("Instagram");
    });

    await mounted.unmount();
  });
});
