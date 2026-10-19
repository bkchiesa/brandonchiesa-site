import { describe, expect, it } from "vitest";
import { rooms, withBase } from "./site";

describe("rooms", () => {
  it("lists Banking between Coding and Videography", () => {
    expect(rooms.map((room) => room.name)).toEqual([
      "Career",
      "Coding",
      "Banking",
      "Videography",
      "Contact",
    ]);
    expect(rooms.find((room) => room.id === "banking")?.path).toBe("banking/");
  });

  it("keeps hash links on banking section nav", () => {
    expect(withBase("/banking/#calculators")).toBe("/banking/#calculators");
    expect(withBase("/banking/templates/#loan-package-checklist")).toBe("/banking/templates/#loan-package-checklist");
  });
});
