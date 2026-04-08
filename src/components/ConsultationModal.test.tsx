import { beforeEach, describe, expect, test, vi } from "vitest";

import ConsultationModal from "@/components/ConsultationModal";
import { sendPublicConsultationMessage, submitConsultation, trackEvent } from "@/lib/api";
import { changeValue, click, renderWithRouter, waitFor } from "@/test/render";

vi.mock("@/lib/api", () => ({
  submitConsultation: vi.fn(),
  sendPublicConsultationMessage: vi.fn(),
  trackEvent: vi.fn(),
}));

const submitConsultationMock = vi.mocked(submitConsultation);
const sendPublicConsultationMessageMock = vi.mocked(sendPublicConsultationMessage);
const trackEventMock = vi.mocked(trackEvent);

describe("ConsultationModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    submitConsultationMock.mockResolvedValue({
      id: "consultation-123",
      accessToken: "secure-token-123",
    });
    sendPublicConsultationMessageMock.mockResolvedValue({
      id: "message-1",
      consultationId: "consultation-123",
      senderType: "patient",
      senderName: "Jane Doe",
      body: "I would like to learn more.",
      readAt: null,
      createdAt: new Date().toISOString(),
    });
    trackEventMock.mockResolvedValue(undefined);
  });

  test("uses the secure consultation access token for continue messaging flow", async () => {
    const mounted = await renderWithRouter(
      <ConsultationModal
        open={true}
        onOpenChange={() => {}}
        providerName="Dr. Test"
        providerId="dr-test"
      />,
    );

    await waitFor(() => {
      expect(document.body.querySelector('#name')).not.toBeNull();
    });

    await changeValue(document.body.querySelector('#name') as HTMLInputElement, 'Jane Doe');
    await changeValue(document.body.querySelector('#email') as HTMLInputElement, 'jane@example.com');
    await changeValue(document.body.querySelector('#phone') as HTMLInputElement, '3105551234');
    await changeValue(document.body.querySelector('#date') as HTMLInputElement, '2026-04-30');

    // For textarea, use HTMLTextAreaElement prototype to trigger React's controlled onChange
    const messageField = document.body.querySelector('#message') as HTMLTextAreaElement;
    const textareaDescriptor = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value');
    textareaDescriptor?.set?.call(messageField, 'I would like to learn more.');
    messageField.dispatchEvent(new Event('input', { bubbles: true }));
    messageField.dispatchEvent(new Event('change', { bubbles: true }));

    const submitButton = Array.from(document.body.querySelectorAll('button')).find((btn) =>
      btn.textContent?.includes('Send Request'),
    );
    expect(submitButton).toBeTruthy();
    await click(submitButton!);

    await waitFor(() => {
      expect(submitConsultationMock).toHaveBeenCalled();
      expect(sendPublicConsultationMessageMock).toHaveBeenCalledWith(
        expect.objectContaining({ consultationToken: 'secure-token-123' }),
      );
    });

    await waitFor(() => {
      expect(document.body.textContent ?? '').toContain('Continue Messaging');
    });

    await mounted.unmount();
  });
});
