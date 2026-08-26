const STORAGE_KEY = "tech-interview-prep-question-rotations";
const MAX_ROTATIONS = 5;

type RotationHistory = Record<string, number[][]>;

function rotationKey(courseId: number, level: string) {
  return `${courseId}:${level}`;
}

function readHistory(): RotationHistory {
  if (typeof window === "undefined") return {};
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return {};
    const parsed = JSON.parse(stored) as RotationHistory;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeHistory(history: RotationHistory) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  } catch {
    // Private browsing or a full storage quota should not block a quiz.
  }
}

export function getRecentQuestionIds(courseId: number, level: string): number[] {
  const rotations = readHistory()[rotationKey(courseId, level)] ?? [];
  return [...new Set(rotations.flat())];
}

export function rememberQuestionRotation(
  courseId: number,
  level: string,
  questionIds: number[],
) {
  if (questionIds.length === 0) return;
  const history = readHistory();
  const key = rotationKey(courseId, level);
  const rotations = history[key] ?? [];
  const currentRotation = [...new Set(questionIds)];
  history[key] = [...rotations, currentRotation].slice(-MAX_ROTATIONS);
  writeHistory(history);
}