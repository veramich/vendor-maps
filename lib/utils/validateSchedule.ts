// Anchor-date consistency for recurring market schedules.
//
// day_of_week, recurrence_type and anchor_date are three independent controls in
// the add-business form, so nothing stops a vendor from picking "third Saturday"
// with an anchor that lands on the second Saturday. That skew makes the listing
// project onto wrong future dates forever, so both write paths validate here
// before inserting. The client is not a security boundary — this runs server-side.

const DOW_NUM: Record<string, number> = {
  sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
  thursday: 4, friday: 5, saturday: 6,
};

const NTH_LABEL: Record<string, string> = {
  monthly_first: "first",
  monthly_second: "second",
  monthly_third: "third",
  monthly_fourth: "fourth",
  monthly_last: "last",
};

interface ScheduleLike {
  dayOfWeek?: string;
  recurrenceType?: string;
  anchorDate?: string | null;
}

/** Parse YYYY-MM-DD as a local date (avoids the UTC shift of `new Date(str)`). */
function parseLocalDate(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Returns a human-readable error when the anchor date contradicts the chosen
 * weekday or monthly ordinal, or null when the schedule is consistent.
 * An absent anchor is allowed — legacy rows and weekly schedules may omit it.
 */
export function validateScheduleAnchor(
  schedule: ScheduleLike
): string | null {
  const { dayOfWeek, recurrenceType, anchorDate } = schedule;

  if (!anchorDate || !dayOfWeek || !recurrenceType) return null;

  const anchor = parseLocalDate(anchorDate);
  if (!anchor) return `"${anchorDate}" is not a valid date.`;

  const targetDow = DOW_NUM[dayOfWeek];
  if (targetDow === undefined) return null;

  // The anchor must fall on the weekday the schedule claims.
  if (anchor.getDay() !== targetDow) {
    const actual = Object.keys(DOW_NUM).find(
      k => DOW_NUM[k] === anchor.getDay()
    );
    return (
      `${anchorDate} is a ${actual}, but this schedule repeats on ` +
      `${dayOfWeek}. Pick a date that falls on a ${dayOfWeek}.`
    );
  }

  // For monthly cadences it must also sit at the claimed ordinal position.
  if (recurrenceType.startsWith("monthly")) {
    const nth = Math.floor((anchor.getDate() - 1) / 7) + 1;

    if (recurrenceType === "monthly_last") {
      // "Last" means no further same-weekday date remains in the month.
      const next = new Date(anchor);
      next.setDate(next.getDate() + 7);
      if (next.getMonth() === anchor.getMonth()) {
        return (
          `${anchorDate} is not the last ${dayOfWeek} of its month. ` +
          `Pick the final ${dayOfWeek}.`
        );
      }
    } else {
      const expected = { monthly_first: 1, monthly_second: 2,
                         monthly_third: 3, monthly_fourth: 4 }[recurrenceType];
      if (expected !== undefined && nth !== expected) {
        const ordinal = ["", "first", "second", "third", "fourth", "fifth"][nth];
        return (
          `${anchorDate} is the ${ordinal} ${dayOfWeek} of its month, but ` +
          `this schedule repeats on the ${NTH_LABEL[recurrenceType]} ` +
          `${dayOfWeek}. Pick a matching date.`
        );
      }
    }
  }

  return null;
}
