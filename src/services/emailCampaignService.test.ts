import { beforeEach, describe, expect, it, vi } from "vitest";

const campaignSingleMock = vi.fn();
const templateSingleMock = vi.fn();
const queueBulkEmailsMock = vi.fn();

vi.mock("@/integrations/supabase/client", () => {
  const createEqChain = (table: string) => ({
    eq: vi.fn((_column: string, _value: unknown) => ({
      single: table === "email_campaigns" ? campaignSingleMock : templateSingleMock,
    })),
  });

  return {
    supabase: {
      from: vi.fn((table: string) => ({
        select: vi.fn(() => createEqChain(table)),
        update: vi.fn(() => ({
          eq: vi.fn(),
        })),
      })),
    },
  };
});

vi.mock("./emailQueueService", () => ({
  queueBulkEmails: queueBulkEmailsMock,
}));

vi.mock("./emailService", () => ({
  replaceTemplateVariables: vi.fn((value: string) => value),
}));

vi.mock("./emailTrackingService", () => ({
  prepareEmailForTracking: vi.fn((html: string) => html),
}));

describe("sendCampaign", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("blocks campaign sends when the stored html is not send-ready", async () => {
    campaignSingleMock.mockResolvedValue({
      data: {
        id: "campaign-1",
        name: "Unsafe Campaign",
        subject: "Promo",
        html_content: "<p>unsubscribe here</p>",
        campaign_type: "promotional",
        target_audience: "all",
        track_opens: true,
        track_clicks: true,
        status: "draft",
      },
      error: null,
    });

    const { sendCampaign } = await import("./emailCampaignService");
    const result = await sendCampaign("campaign-1");

    expect(result.success).toBe(false);
    expect(result.queued).toBe(0);
    expect(result.errors).toEqual([
      "Campaign is not send-ready: An unsubscribe link is shown, but the unsubscribe placeholder is missing.",
    ]);
    expect(queueBulkEmailsMock).not.toHaveBeenCalled();
    expect(templateSingleMock).not.toHaveBeenCalled();
  });
});
