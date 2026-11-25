import assert from "node:assert/strict";
import { test } from "node:test";
import { CreateRoomBody, JoinRoomBody, UpdateProfileBody } from "@workspace/api-zod";

test("every appearance-saving endpoint accepts new costumes and preserves existing tokens", () => {
  for (const validator of [CreateRoomBody, JoinRoomBody, UpdateProfileBody]) {
    for (const avatar of ["mango", "taro", "b1:5:13:11:11", "b1:0:14:12:0", "b1:5:21:23:11"]) {
      const parsed = validator.safeParse({ hostName: "Test host", displayName: "Test guest", avatar });
      assert.ok(parsed.success, `Rejected supported appearance ${avatar}`);
    }
    for (const avatar of ["b1:0:22:0:0", "b1:0:0:24:0", "b1:0:0:0:12", "b1:6:0:0:0", "b1:0:0:0:0\n", "b1:0:01:0:0"]) {
      assert.equal(validator.safeParse({ hostName: "Test host", displayName: "Test guest", avatar }).success, false);
    }
  }
});
