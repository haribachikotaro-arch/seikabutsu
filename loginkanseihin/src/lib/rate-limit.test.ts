import { describe, expect, it } from "vitest";
import { AttemptLimiter } from "./rate-limit";

describe("AttemptLimiter", () => {
	it("blocks after the configured number of failures", () => {
		const limiter = new AttemptLimiter(3, 1_000);
		limiter.recordFailure("user", 0);
		limiter.recordFailure("user", 100);
		expect(limiter.recordFailure("user", 200).limited).toBe(true);
	});

	it("allows attempts after the window expires", () => {
		const limiter = new AttemptLimiter(1, 1_000);
		limiter.recordFailure("user", 0);
		expect(limiter.status("user", 1_001).limited).toBe(false);
	});

	it("clears failures after success", () => {
		const limiter = new AttemptLimiter(1, 1_000);
		limiter.recordFailure("user", 0);
		limiter.clear("user");
		expect(limiter.status("user", 10).limited).toBe(false);
	});
});
