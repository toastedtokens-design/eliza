/**
 * An offsetless clock time is the user's wall time. `Date.parse` reads that
 * spelling in the host zone, so a cloud host would fire the reminder at the
 * wrong instant. The pin must accept the same time written with `t` or a
 * space, and a once trigger must use the trigger's time zone.
 */
import { describe, expect, it } from "vitest";
import {
	resolveScheduledAtIsoInTimeZone,
	resolveTriggerTiming,
} from "../src/services/trigger-scheduling.ts";
import type { TriggerConfig } from "../src/types/trigger.ts";

const KOLKATA_NINE_AM = "2099-01-15T03:30:00.000Z";

function onceTrigger(scheduledAtIso: string, timezone?: string): TriggerConfig {
	return {
		version: 1,
		kind: "prompt",
		triggerId: "00000000-0000-4000-8000-000000000001",
		displayName: "Call mom",
		instructions: "Remind the user to call mom.",
		triggerType: "once",
		enabled: true,
		wakeMode: "inject_now",
		createdBy: "owner",
		runCount: 0,
		scheduledAtIso,
		timezone,
	};
}

describe("offsetless scheduled times", () => {
	it("reads T, t, and a space in the user's zone", () => {
		expect(
			resolveScheduledAtIsoInTimeZone("2099-01-15T09:00:00", "Asia/Kolkata"),
		).toBe(KOLKATA_NINE_AM);
		expect(
			resolveScheduledAtIsoInTimeZone("2099-01-15t09:00:00", "Asia/Kolkata"),
		).toBe(KOLKATA_NINE_AM);
		expect(
			resolveScheduledAtIsoInTimeZone("2099-01-15 09:00:00", "Asia/Kolkata"),
		).toBe(KOLKATA_NINE_AM);
		expect(
			resolveScheduledAtIsoInTimeZone(
				"2099-01-15t09:00:00.250",
				"Asia/Kolkata",
			),
		).toBe("2099-01-15T03:30:00.250Z");
	});

	it("leaves an offset, a Zulu mark, and a date-only value unchanged", () => {
		expect(
			resolveScheduledAtIsoInTimeZone(
				"2099-01-17T09:00:00-08:00",
				"Asia/Kolkata",
			),
		).toBe("2099-01-17T09:00:00-08:00");
		expect(
			resolveScheduledAtIsoInTimeZone("2099-01-15t09:00:00z", "Asia/Kolkata"),
		).toBe("2099-01-15t09:00:00z");
		expect(resolveScheduledAtIsoInTimeZone("2099-01-15", "Asia/Kolkata")).toBe(
			"2099-01-15",
		);
	});

	it("rejects a time zone Intl does not know", () => {
		expect(() =>
			resolveScheduledAtIsoInTimeZone("2099-01-15t09:00:00", "Not/A_Zone"),
		).toThrow(RangeError);
	});

	it("schedules a once trigger in its time zone, not the host zone", () => {
		const timing = resolveTriggerTiming(
			onceTrigger("2099-01-15t09:00:00", "Asia/Kolkata"),
			Date.parse("2099-01-01T00:00:00.000Z"),
		);
		expect(timing?.nextRunAtMs).toBe(Date.parse(KOLKATA_NINE_AM));
		expect(
			resolveTriggerTiming(
				onceTrigger("2099-01-15T09:00:00Z", "Asia/Kolkata"),
				Date.parse("2099-01-01T00:00:00.000Z"),
			)?.nextRunAtMs,
		).toBe(Date.parse("2099-01-15T09:00:00.000Z"));
	});
});
