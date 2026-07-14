import {
  fsrs,
  generatorParameters,
  createEmptyCard,
  Rating,
  type Card as FsrsCard,
  type Grade,
} from "ts-fsrs";

// Deterministic scheduling (no fuzz) so the intervals previewed on the
// rating buttons exactly match what gets persisted on submit.
const params = generatorParameters({
  enable_fuzz: false,
  enable_short_term: true,
});

const scheduler = fsrs(params);

export { Rating };
export type { Grade };

/** The FSRS scheduling state we persist per card. */
export interface Sched {
  due: number;
  stability: number;
  difficulty: number;
  elapsedDays: number;
  scheduledDays: number;
  learningSteps: number;
  reps: number;
  lapses: number;
  state: number;
  lastReview: number | null;
}

export function newCardState(now: number = Date.now()): Sched {
  return toSched(createEmptyCard(new Date(now)));
}

function toSched(c: FsrsCard): Sched {
  return {
    due: c.due.getTime(),
    stability: c.stability,
    difficulty: c.difficulty,
    elapsedDays: c.elapsed_days,
    scheduledDays: c.scheduled_days,
    learningSteps: c.learning_steps,
    reps: c.reps,
    lapses: c.lapses,
    state: c.state,
    lastReview: c.last_review ? c.last_review.getTime() : null,
  };
}

function toFsrs(s: Sched): FsrsCard {
  return {
    due: new Date(s.due),
    stability: s.stability,
    difficulty: s.difficulty,
    elapsed_days: s.elapsedDays,
    scheduled_days: s.scheduledDays,
    learning_steps: s.learningSteps,
    reps: s.reps,
    lapses: s.lapses,
    state: s.state,
    last_review: s.lastReview ? new Date(s.lastReview) : undefined,
  };
}

export interface ReviewOutcome {
  sched: Sched;
  log: {
    rating: number;
    state: number;
    stability: number;
    difficulty: number;
    scheduledDays: number;
    reviewedAt: number;
  };
}

/** Apply a rating and return the new state + a review-log entry. */
export function applyRating(
  s: Sched,
  grade: Grade,
  now: number = Date.now(),
): ReviewOutcome {
  const item = scheduler.next(toFsrs(s), new Date(now), grade);
  return {
    sched: toSched(item.card),
    log: {
      rating: item.log.rating,
      state: item.log.state,
      stability: item.log.stability,
      difficulty: item.log.difficulty,
      scheduledDays: item.log.scheduled_days,
      reviewedAt: now,
    },
  };
}

/** Preview the next due timestamp (ms) for each of the four ratings. */
export function previewIntervals(
  s: Sched,
  now: number = Date.now(),
): Record<Grade, number> {
  const preview = scheduler.repeat(toFsrs(s), new Date(now));
  return {
    [Rating.Again]: preview[Rating.Again].card.due.getTime(),
    [Rating.Hard]: preview[Rating.Hard].card.due.getTime(),
    [Rating.Good]: preview[Rating.Good].card.due.getTime(),
    [Rating.Easy]: preview[Rating.Easy].card.due.getTime(),
  } as Record<Grade, number>;
}

/** Compact human label for a future timestamp, e.g. "10m", "1d", "3mo". */
export function intervalLabel(due: number, now: number = Date.now()): string {
  const mins = Math.round((due - now) / 60000);
  if (mins < 1) return "<1m";
  if (mins < 60) return `${mins}m`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d`;
  const months = Math.round(days / 30);
  if (months < 12) return `${months}mo`;
  return `${(days / 365).toFixed(1)}y`;
}
