type Entry = { failures: number[] };

export class AttemptLimiter {
	private readonly entries = new Map<string, Entry>();

	constructor(
		private readonly maximumAttempts = 5,
		private readonly windowMs = 15 * 60 * 1000,
	) {}

	status(key: string, now = Date.now()) {
		const failures = (this.entries.get(key)?.failures ?? []).filter(
			(timestamp) => now - timestamp < this.windowMs,
		);
		if (failures.length === 0) this.entries.delete(key);
		else this.entries.set(key, { failures });

		const limited = failures.length >= this.maximumAttempts;
		const retryAfterSeconds = limited
			? Math.max(1, Math.ceil((failures[0] + this.windowMs - now) / 1000))
			: 0;
		return { limited, retryAfterSeconds };
	}

	recordFailure(key: string, now = Date.now()) {
		const current = this.entries.get(key)?.failures ?? [];
		this.entries.set(key, { failures: [...current, now] });
		return this.status(key, now);
	}

	clear(key: string) {
		this.entries.delete(key);
	}
}

declare global {
	var dataDreamersInviteLimiter: AttemptLimiter | undefined;
}

export const inviteLimiter =
	globalThis.dataDreamersInviteLimiter ?? new AttemptLimiter();

if (process.env.NODE_ENV !== "production") {
	globalThis.dataDreamersInviteLimiter = inviteLimiter;
}
