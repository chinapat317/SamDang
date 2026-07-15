import { afterEach, describe, expect, it, vi } from "vitest";
import { CheckRole, GetAllUsers, GetUsersByRole, UpdateUsersRole } from "@/commonFunc/user";

describe("user API helpers", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("loads all users with Authorization header and no uid request body", async () => {
    // This protects the token-auth flow: current user identity must come from the LIFF access token.
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    });
    vi.stubGlobal("fetch", fetchMock);

    await GetAllUsers("line-access-token");

    const [, requestInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(requestInit.headers).toMatchObject({
      authorization: "Bearer line-access-token",
    });
    expect(requestInit.body).toBeUndefined();
  });

  it("checks role by sending role filter only, not current user uid", async () => {
    // This verifies admin/manager checks trust backend token verification instead of frontend uid JSON.
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ is_allowed: true }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const allowed = await CheckRole("line-access-token", ["manager", "admin"]);

    const [, requestInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(allowed).toBe(true);
    expect(JSON.parse(String(requestInit.body))).toEqual({
      role: ["manager", "admin"],
    });
  });

  it("loads users by role using token auth while keeping role in the body", async () => {
    // This covers the admin edit page: auth is header-based, but role filtering stays request data.
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    });
    vi.stubGlobal("fetch", fetchMock);

    await GetUsersByRole("line-access-token", ["member"]);

    const [, requestInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(requestInit.headers).toMatchObject({
      authorization: "Bearer line-access-token",
    });
    expect(JSON.parse(String(requestInit.body))).toEqual({
      role: ["member"],
    });
  });

  it("updates target user roles without sending current user uid", async () => {
    // This allows target user uid values while ensuring the acting admin still comes from the token.
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
    });
    vi.stubGlobal("fetch", fetchMock);

    await UpdateUsersRole("line-access-token", [{ uid: "target-user", role: "manager" }]);

    const [, requestInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(requestInit.headers).toMatchObject({
      authorization: "Bearer line-access-token",
    });
    expect(JSON.parse(String(requestInit.body))).toEqual({
      users: [{ uid: "target-user", role: "manager" }],
    });
  });
});
