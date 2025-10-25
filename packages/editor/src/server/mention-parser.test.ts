import { describe, it, expect } from "vitest";
import { parseMentions, calculateMentionDiff, getUniqueMentionedUserIds, countMentionsByType } from "./mention-parser";
import type { JSONContent } from "@tiptap/core";
import { MentionType } from "@idea/contracts";

describe("parseMentions", () => {
  it("should parse single mention from content", () => {
    const content: JSONContent = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "Hi " },
            {
              type: "mention",
              attrs: {
                id: "m1",
                type: MentionType.USER,
                modelId: "user-1",
                label: "Alice",
                actorId: "user-2",
              },
            },
          ],
        },
      ],
    };

    const mentions = parseMentions(content);

    expect(mentions).toHaveLength(1);
    expect(mentions[0]).toEqual({
      id: "m1",
      type: MentionType.USER,
      modelId: "user-1",
      label: "Alice",
      actorId: "user-2",
    });
  });

  it("should parse multiple mentions", () => {
    const content: JSONContent = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "Hi " },
            {
              type: "mention",
              attrs: { id: "m1", type: MentionType.USER, modelId: "user-1", label: "Alice", actorId: "user-3" },
            },
            { type: "text", text: " and " },
            {
              type: "mention",
              attrs: { id: "m2", type: MentionType.USER, modelId: "user-2", label: "Bob", actorId: "user-3" },
            },
          ],
        },
      ],
    };

    const mentions = parseMentions(content);

    expect(mentions).toHaveLength(2);
    expect(mentions[0].modelId).toBe("user-1");
    expect(mentions[1].modelId).toBe("user-2");
  });

  it("should deduplicate mentions by ID", () => {
    const content: JSONContent = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "mention",
              attrs: { id: "m1", type: MentionType.USER, modelId: "user-1", label: "Alice" },
            },
            {
              type: "mention",
              attrs: { id: "m1", type: MentionType.USER, modelId: "user-1", label: "Alice" },
            },
          ],
        },
      ],
    };

    const mentions = parseMentions(content);

    expect(mentions).toHaveLength(1);
  });

  it("should filter by mention type", () => {
    const content: JSONContent = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "mention",
              attrs: { id: "m1", type: MentionType.USER, modelId: "user-1", label: "Alice" },
            },
          ],
        },
      ],
    };

    const userMentions = parseMentions(content, { type: MentionType.USER });

    expect(userMentions).toHaveLength(1);
  });

  it("should filter by modelId", () => {
    const content: JSONContent = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "mention",
              attrs: { id: "m1", type: MentionType.USER, modelId: "user-1", label: "Alice" },
            },
            {
              type: "mention",
              attrs: { id: "m2", type: MentionType.USER, modelId: "user-2", label: "Bob" },
            },
          ],
        },
      ],
    };

    const filtered = parseMentions(content, { modelId: "user-1" });

    expect(filtered).toHaveLength(1);
    expect(filtered[0].modelId).toBe("user-1");
  });

  it("should handle nested structures", () => {
    const content: JSONContent = {
      type: "doc",
      content: [
        {
          type: "blockquote",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "mention",
                  attrs: { id: "m1", type: MentionType.USER, modelId: "user-1", label: "Alice" },
                },
              ],
            },
          ],
        },
      ],
    };

    const mentions = parseMentions(content);

    expect(mentions).toHaveLength(1);
    expect(mentions[0].modelId).toBe("user-1");
  });

  it("should return empty array for null/undefined content", () => {
    expect(parseMentions(null)).toEqual([]);
    expect(parseMentions(undefined)).toEqual([]);
  });

  it("should return empty array for content with no mentions", () => {
    const content: JSONContent = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Hello world" }],
        },
      ],
    };

    const mentions = parseMentions(content);

    expect(mentions).toEqual([]);
  });
});

describe("calculateMentionDiff", () => {
  it("should return new mentions", () => {
    const oldContent: JSONContent = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "mention",
              attrs: { id: "m1", type: MentionType.USER, modelId: "user-1", label: "Alice" },
            },
          ],
        },
      ],
    };

    const newContent: JSONContent = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "mention",
              attrs: { id: "m1", type: MentionType.USER, modelId: "user-1", label: "Alice" },
            },
            {
              type: "mention",
              attrs: { id: "m2", type: MentionType.USER, modelId: "user-2", label: "Bob" },
            },
          ],
        },
      ],
    };

    const diff = calculateMentionDiff(oldContent, newContent);

    expect(diff).toHaveLength(1);
    expect(diff[0].id).toBe("m2");
    expect(diff[0].modelId).toBe("user-2");
  });

  it("should return empty array when no new mentions", () => {
    const content: JSONContent = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "mention",
              attrs: { id: "m1", type: MentionType.USER, modelId: "user-1", label: "Alice" },
            },
          ],
        },
      ],
    };

    const diff = calculateMentionDiff(content, content);

    expect(diff).toEqual([]);
  });

  it("should handle null old content (all mentions are new)", () => {
    const newContent: JSONContent = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "mention",
              attrs: { id: "m1", type: MentionType.USER, modelId: "user-1", label: "Alice" },
            },
          ],
        },
      ],
    };

    const diff = calculateMentionDiff(null, newContent);

    expect(diff).toHaveLength(1);
    expect(diff[0].modelId).toBe("user-1");
  });
});

describe("getUniqueMentionedUserIds", () => {
  it("should extract user IDs from mentions", () => {
    const mentions = [
      { id: "m1", type: "user" as const, modelId: "user-1", label: "Alice" },
      { id: "m2", type: "user" as const, modelId: "user-2", label: "Bob" },
    ];

    const userIds = getUniqueMentionedUserIds(mentions);

    expect(userIds).toEqual(["user-1", "user-2"]);
  });

  it("should deduplicate user IDs", () => {
    const mentions = [
      { id: "m1", type: "user" as const, modelId: "user-1", label: "Alice" },
      { id: "m2", type: "user" as const, modelId: "user-1", label: "Alice" },
    ];

    const userIds = getUniqueMentionedUserIds(mentions);

    expect(userIds).toEqual(["user-1"]);
  });

  it("should return empty array for empty mentions", () => {
    const userIds = getUniqueMentionedUserIds([]);

    expect(userIds).toEqual([]);
  });
});

describe("countMentionsByType", () => {
  it("should count mentions by type", () => {
    const content: JSONContent = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "mention",
              attrs: { id: "m1", type: MentionType.USER, modelId: "user-1", label: "Alice" },
            },
            {
              type: "mention",
              attrs: { id: "m2", type: MentionType.USER, modelId: "user-2", label: "Bob" },
            },
          ],
        },
      ],
    };

    const counts = countMentionsByType(content);

    expect(counts.user).toBe(2);
  });

  it("should return zero counts for empty content", () => {
    const counts = countMentionsByType(null);

    expect(counts.user).toBe(0);
  });
});
