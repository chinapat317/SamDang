import { afterEach, describe, expect, it, vi } from "vitest";
import { assignTasks } from "@/app/tasks/add/funcs";
import type { TaskRow } from "@/types/types";
import type { SetStateAction } from "react";

function createTaskRow(patch: Partial<TaskRow> = {}): TaskRow {
  return {
    id: "row-1",
    assignedToName: "Alice",
    task: "Prepare report",
    description: "Send the weekly report",
    assignDateISO: "2026-07-15T10:00:00.000Z",
    dueDate: "2026-07-20",
    ...patch,
  };
}

function createStateSetter<T>(initialValue: T) {
  let value = initialValue;
  return {
    get value() {
      return value;
    },
    setValue: vi.fn((nextValue: SetStateAction<T>) => {
      value = typeof nextValue === "function" ? (nextValue as (previousValue: T) => T)(value) : nextValue;
    }),
  };
}

describe("assignTasks", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("submits selected member user_hash instead of display name", async () => {
    // This protects the backend contract: users choose display_name in UI, but assignment identity is user_hash.
    const status = createStateSetter<string | null>(null);
    const assigning = createStateSetter(false);
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => "",
    });
    vi.stubGlobal("fetch", fetchMock);

    const assigned = await assignTasks("line-access-token", {
      groupId: "group-1",
      groupMemJson: {
        members: {
          "1": {
            user_hash: "hash-alice",
            display_name: "Alice",
            picture_url: "",
          },
        },
      },
      taskRows: [createTaskRow()],
      setAssignStatus: status.setValue,
      setAssigning: assigning.setValue,
    });

    expect(assigned).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [, requestInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(requestInit.headers).toMatchObject({
      authorization: "Bearer line-access-token",
    });

    const payload = JSON.parse(String(requestInit.body));
    expect(payload["1"].assigned_to_line_display_name).toBe("hash-alice");
    expect(payload["1"].assigned_to_line_display_name).not.toBe("Alice");
  });

  it("does not call the API when selected member has no user hash", async () => {
    // This prevents sending ambiguous display-name-only assignments to the backend.
    const status = createStateSetter<string | null>(null);
    const assigning = createStateSetter(false);
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const assigned = await assignTasks("line-access-token", {
      groupId: "group-1",
      groupMemJson: {
        members: {
          "1": {
            display_name: "Alice",
            picture_url: "",
          },
        },
      },
      taskRows: [createTaskRow()],
      setAssignStatus: status.setValue,
      setAssigning: assigning.setValue,
    });

    expect(assigned).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(status.value).toBe("Row 1: selected member has no user hash");
  });
});
