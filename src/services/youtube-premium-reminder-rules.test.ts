import test from "node:test";
import assert from "node:assert/strict";
import {
  acquirePaymentDraftSubmitLock,
  acquirePaymentReviewLock,
  clearPaymentDraftSubmitLocksForTest,
  clearPaymentReviewLocksForTest,
  releasePaymentDraftSubmitLock,
  releasePaymentReviewLock,
} from "./youtube-premium-payments.js";

test("guards payment review action with one in-memory lock per submission", () => {
  clearPaymentReviewLocksForTest();

  assert.equal(acquirePaymentReviewLock("submission-1"), true);
  assert.equal(acquirePaymentReviewLock("submission-1"), false);
  assert.equal(acquirePaymentReviewLock("submission-2"), true);

  releasePaymentReviewLock("submission-1");
  assert.equal(acquirePaymentReviewLock("submission-1"), true);

  clearPaymentReviewLocksForTest();
});

test("guards payment draft submit action with one in-memory lock per draft", () => {
  clearPaymentDraftSubmitLocksForTest();

  assert.equal(acquirePaymentDraftSubmitLock("draft-1"), true);
  assert.equal(acquirePaymentDraftSubmitLock("draft-1"), false);
  assert.equal(acquirePaymentDraftSubmitLock("draft-2"), true);

  releasePaymentDraftSubmitLock("draft-1");
  assert.equal(acquirePaymentDraftSubmitLock("draft-1"), true);

  clearPaymentDraftSubmitLocksForTest();
});
