import { describe, expect, it } from "vitest";
import { GetSelectedPic, GetSelectedUserHash, MemberList } from "@/commonFunc/group";

describe("group member helpers", () => {
  it("returns group members when backend sends members as an object", () => {
    // This verifies the frontend can read the current backend group-info response shape.
    const members = MemberList({
      members: {
        "1": {
          user_hash: "hash-alice",
          display_name: "Alice",
          picture_url: "https://example.com/alice.png",
        },
        "2": {
          user_hash: "hash-bob",
          display_name: "Bob",
          picture_url: "https://example.com/bob.png",
        },
      },
    });

    expect(members).toHaveLength(2);
    expect(members[0]).toMatchObject({
      user_hash: "hash-alice",
      display_name: "Alice",
    });
  });

  it("finds the selected member picture by display name", () => {
    // This protects the add-task dropdown UI: it displays names but still shows the matched avatar.
    const pictureUrl = GetSelectedPic(
      {
        members: {
          "1": {
            user_hash: "hash-alice",
            display_name: "Alice",
            picture_url: "https://example.com/alice.png",
          },
        },
      },
      "Alice",
    );

    expect(pictureUrl).toBe("https://example.com/alice.png");
  });

  it("returns user_hash for the selected display name", () => {
    // This protects task assignment: the dropdown shows display_name, but payload identity uses user_hash.
    const userHash = GetSelectedUserHash(
      {
        members: {
          "1": {
            user_hash: "hash-alice",
            display_name: "Alice",
            picture_url: "",
          },
        },
      },
      "Alice",
    );

    expect(userHash).toBe("hash-alice");
  });

  it("falls back to userId when older member data does not have user_hash", () => {
    // This keeps old cached/local group data usable while the backend/frontend naming is in transition.
    const userHash = GetSelectedUserHash(
      {
        group_members: [
          {
            userId: "legacy-user-id",
            display_name: "Legacy",
            picture_url: "",
          },
        ],
      },
      "Legacy",
    );

    expect(userHash).toBe("legacy-user-id");
  });
});
