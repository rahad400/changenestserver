import assert from "node:assert/strict";
import test from "node:test";
import { normalizeEventPayload } from "../event-validation.js";

const validPayload = {
  values: {
    title: " Community Cleanup ",
    categoryId: "environment",
    description:
      "Join neighbors to clean up the park and nearby walking paths together.",
    date: "2099-06-15",
    startTime: "09:00",
    endTime: "11:00",
    city: "Dhaka",
    venue: "Central Park",
    capacity: "25",
    guidelines: true,
  },
  image: null,
};

test("normalizes a valid event payload", () => {
  const result = normalizeEventPayload(validPayload);

  assert.ok(result);
  assert.equal(result.values.title, "Community Cleanup");
  assert.equal(result.values.capacity, "25");
  assert.equal(result.image, null);
});

test("rejects invalid dates, times, and capacities", () => {
  assert.equal(
    normalizeEventPayload({
      ...validPayload,
      values: { ...validPayload.values, date: "2099-02-30" },
    }),
    null,
  );
  assert.equal(
    normalizeEventPayload({
      ...validPayload,
      values: { ...validPayload.values, endTime: "09:00" },
    }),
    null,
  );
  assert.equal(
    normalizeEventPayload({
      ...validPayload,
      values: { ...validPayload.values, capacity: "5001" },
    }),
    null,
  );
});

test("rejects unsafe and oversized images", () => {
  assert.equal(
    normalizeEventPayload({
      ...validPayload,
      image: { url: "javascript:alert(1)" },
    }),
    null,
  );
  assert.equal(
    normalizeEventPayload({
      ...validPayload,
      image: {
        dataUrl: `data:image/png;base64,${"A".repeat(4 * 1024 * 1024)}`,
        fileName: "large.png",
      },
    }),
    null,
  );
});
