import assert from "node:assert/strict";
import { test } from "node:test";
import { CreateRoomBody, JoinRoomBody, UpdateProfileBody } from "@workspace/api-zod";

test("all 88,704 mix-and-match Bobi appearances fit existing storage and all input contracts", () => {
  let count = 0;
  for (let c = 0; c < 12; c++)
    for (let h = 0; h < 22; h++)
      for (let o = 0; o < 24; o++)
        for (let a = 0; a < 14; a++) {
          const avatar = `b1:${c}:${h}:${o}:${a}`;
          assert.ok(avatar.length <= 16);
          assert.equal(CreateRoomBody.parse({ hostName: "Host", avatar }).avatar, avatar);
          assert.equal(JoinRoomBody.parse({ displayName: "Guest", avatar }).avatar, avatar);
          assert.equal(UpdateProfileBody.parse({ avatar }).avatar, avatar);
          count++;
        }
  assert.equal(count, 88704);
});

test("existing Bobi presets remain accepted without rewriting saved appearances", () => {
  for (const avatar of ["mango", "matcha", "strawberry", "taro", "coconut"])
    assert.equal(UpdateProfileBody.parse({ avatar }).avatar, avatar);
  assert.ok(CreateRoomBody.safeParse({ hostName: "Host" }).success);
  assert.ok(JoinRoomBody.safeParse({ displayName: "Guest" }).success);
});

test("unknown versions, out-of-range parts, malformed and oversized avatars are rejected", () => {
  for (const avatar of ["", "b1:12:0:0:0", "b1:0:22:0:0", "b1:0:0:24:0", "b1:0:0:0:14",
    "b1:0:01:0:0", "b1:0:0:00:0", "b1:0:0:0:01",
    "b2:0:0:0:0", "b1:00:0:0:0", "b1:-1:0:0:0", "b1:0:0:0", "b1:0:0:0:0:1",
    "mango\n", "<script>", "a".repeat(1000), null, {}, 42]) {
    assert.equal(UpdateProfileBody.safeParse({ avatar }).success, false, `Invalid avatar accepted: ${JSON.stringify(avatar)}`);
    assert.equal(CreateRoomBody.safeParse({ hostName: "Host", avatar }).success, false);
    assert.equal(JoinRoomBody.safeParse({ displayName: "Guest", avatar }).success, false);
  }
});
