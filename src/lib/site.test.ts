import { describe, expect, it } from "vitest";
import { rooms } from "./site";

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
});
