import type { Server as HttpServer, IncomingMessage } from "node:http";
import { WebSocketServer, WebSocket } from "ws";
import { and, eq } from "drizzle-orm";
import { db, questionsTable, coursesTable } from "@workspace/db";
import { logger } from "../lib/logger";

const RACE_QUESTION_COUNT = 10;
const QUESTION_TIME_LIMIT_MS = 30_000;
const COUNTDOWN_MS = 4_000;
const RACE_GRACE_MS = 15_000;
// Slack on top of the per-question limit for network latency + reveal animation
const ANSWER_DEADLINE_SLACK_MS = 4_000;

type Level = "beginner" | "intermediate" | "advanced";

interface Player {
  id: string;
  name: string;
  ws: WebSocket;
  raceId: string | null;
  challengeId: string | null;
}

interface Challenge {
  id: string;
  fromId: string;
  fromName: string;
  targetName: string | null; // null = open to anyone
  courseId: number;
  courseName: string;
  level: Level;
  createdAt: number;
}

interface RaceAnswer {
  optionIndex: number;
  correct: boolean;
  at: number; // server receipt time (epoch ms)
}

interface RaceParticipant {
  playerId: string;
  name: string;
  answers: (RaceAnswer | null)[];
  /** When this player's current question window opened (server clock). */
  questionOpenedAt: number;
  done: boolean;
}

interface Race {
  id: string;
  courseId: number;
  courseName: string;
  level: Level;
  questions: {
    id: number;
    text: string;
    options: string[];
    correctOptionIndex: number;
    explanation: string | null;
  }[];
  startAt: number;
  participants: [RaceParticipant, RaceParticipant];
  finished: boolean;
  timeout: ReturnType<typeof setTimeout> | null;
}

const players = new Map<string, Player>();
const challenges = new Map<string, Challenge>();
const races = new Map<string, Race>();

let nextId = 1;
function genId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${(nextId++).toString(36)}`;
}

function send(ws: WebSocket, msg: unknown): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(msg));
  }
}

function lobbySnapshot() {
  return {
    type: "lobby",
    players: [...players.values()]
      .filter((p) => p.name)
      .map((p) => ({ id: p.id, name: p.name, inRace: p.raceId !== null })),
    challenges: [...challenges.values()].map((c) => ({
      id: c.id,
      fromId: c.fromId,
      fromName: c.fromName,
      targetName: c.targetName,
      courseId: c.courseId,
      courseName: c.courseName,
      level: c.level,
    })),
  };
}

function broadcastLobby(): void {
  const snapshot = JSON.stringify(lobbySnapshot());
  for (const p of players.values()) {
    if (p.ws.readyState === WebSocket.OPEN) p.ws.send(snapshot);
  }
}

function removeChallengesBy(playerId: string): void {
  for (const [id, c] of challenges) {
    if (c.fromId === playerId) challenges.delete(id);
  }
}

async function startRace(a: Player, b: Player, courseId: number, level: Level, courseName: string): Promise<void> {
  const rows = await db
    .select()
    .from(questionsTable)
    .where(and(eq(questionsTable.courseId, courseId), eq(questionsTable.level, level)));

  if (rows.length === 0) {
    send(a.ws, { type: "error", message: "No questions available for this course/level." });
    send(b.ws, { type: "error", message: "No questions available for this course/level." });
    return;
  }

  // Shuffle and take up to RACE_QUESTION_COUNT
  const shuffled = [...rows].sort(() => Math.random() - 0.5).slice(0, RACE_QUESTION_COUNT);
  const questions = shuffled.map((q) => ({
    id: q.id,
    text: q.text,
    options: q.options as string[],
    correctOptionIndex: q.correctOptionIndex,
    explanation: q.explanation ?? null,
  }));

  const race: Race = {
    id: genId("race"),
    courseId,
    courseName,
    level,
    questions,
    startAt: Date.now() + COUNTDOWN_MS,
    participants: [
      { playerId: a.id, name: a.name, answers: questions.map(() => null), questionOpenedAt: 0, done: false },
      { playerId: b.id, name: b.name, answers: questions.map(() => null), questionOpenedAt: 0, done: false },
    ],
    finished: false,
    timeout: null,
  };

  races.set(race.id, race);
  a.raceId = race.id;
  b.raceId = race.id;
  removeChallengesBy(a.id);
  removeChallengesBy(b.id);

  // Hard cap: total time + grace, then force-finish
  const maxMs = COUNTDOWN_MS + questions.length * QUESTION_TIME_LIMIT_MS + RACE_GRACE_MS;
  race.timeout = setTimeout(() => finishRace(race), maxMs);

  // Answer keys stay server-side: clients only get text + options
  const publicQuestions = questions.map((q) => ({
    id: q.id,
    text: q.text,
    options: q.options,
  }));

  for (const p of [a, b]) {
    const opponent = p === a ? b : a;
    send(p.ws, {
      type: "race_start",
      raceId: race.id,
      opponentName: opponent.name,
      courseId,
      courseName,
      level,
      questions: publicQuestions,
      startAt: race.startAt,
      questionTimeLimitMs: QUESTION_TIME_LIMIT_MS,
    });
  }

  broadcastLobby();
  logger.info({ raceId: race.id, players: [a.name, b.name] }, "Race started");
}

function finishRace(race: Race): void {
  if (race.finished) return;
  race.finished = true;
  if (race.timeout) clearTimeout(race.timeout);

  const [p1, p2] = race.participants;

  const perQuestion = race.questions.map((q, i) => {
    const a1 = p1.answers[i];
    const a2 = p2.answers[i];
    let firstBy: string | null = null;
    // "Answered first" = first *correct* answer
    if (a1?.correct && a2?.correct) {
      firstBy = a1.at <= a2.at ? p1.name : p2.name;
    } else if (a1?.correct) {
      firstBy = p1.name;
    } else if (a2?.correct) {
      firstBy = p2.name;
    }
    return {
      questionIndex: i,
      questionText: q.text,
      firstBy,
      results: [
        { name: p1.name, correct: a1?.correct ?? false, answered: a1 !== null },
        { name: p2.name, correct: a2?.correct ?? false, answered: a2 !== null },
      ],
    };
  });

  const correct1 = p1.answers.filter((x) => x?.correct).length;
  const correct2 = p2.answers.filter((x) => x?.correct).length;
  const firsts1 = perQuestion.filter((x) => x.firstBy === p1.name).length;
  const firsts2 = perQuestion.filter((x) => x.firstBy === p2.name).length;

  let winner: string | null = null;
  if (correct1 !== correct2) winner = correct1 > correct2 ? p1.name : p2.name;
  else if (firsts1 !== firsts2) winner = firsts1 > firsts2 ? p1.name : p2.name;
  // else tie -> winner stays null

  const summary = {
    type: "race_finished",
    raceId: race.id,
    winner,
    perQuestion,
    totals: [
      { name: p1.name, correctCount: correct1, questionsWonFirst: firsts1 },
      { name: p2.name, correctCount: correct2, questionsWonFirst: firsts2 },
    ],
  };

  for (const part of race.participants) {
    const player = players.get(part.playerId);
    if (player) {
      player.raceId = null;
      send(player.ws, summary);
    }
  }

  races.delete(race.id);
  broadcastLobby();
  logger.info({ raceId: race.id, winner }, "Race finished");
}

function forfeitRace(race: Race, leaverId: string): void {
  if (race.finished) return;
  race.finished = true;
  if (race.timeout) clearTimeout(race.timeout);

  const stayer = race.participants.find((p) => p.playerId !== leaverId);
  const leaver = race.participants.find((p) => p.playerId === leaverId);

  for (const part of race.participants) {
    const player = players.get(part.playerId);
    if (player) {
      player.raceId = null;
      send(player.ws, {
        type: "race_finished",
        raceId: race.id,
        winner: stayer?.name ?? null,
        forfeitedBy: leaver?.name ?? null,
        perQuestion: [],
        totals: [],
      });
    }
  }

  races.delete(race.id);
  broadcastLobby();
}

function handleMessage(player: Player, raw: string): void {
  let msg: any;
  try {
    msg = JSON.parse(raw);
  } catch {
    return;
  }

  switch (msg.type) {
    case "hello": {
      const name = typeof msg.name === "string" ? msg.name.trim().slice(0, 30) : "";
      if (name.length < 2) {
        send(player.ws, { type: "error", message: "Name must be at least 2 characters." });
        return;
      }
      player.name = name;
      send(player.ws, { type: "welcome", playerId: player.id, name });
      broadcastLobby();
      break;
    }

    case "create_challenge": {
      if (!player.name) return;
      if (player.raceId) return;
      const courseId = Number(msg.courseId);
      const level = msg.level as Level;
      if (!Number.isInteger(courseId) || !["beginner", "intermediate", "advanced"].includes(level)) {
        send(player.ws, { type: "error", message: "Invalid course or level." });
        return;
      }
      const targetName =
        typeof msg.targetName === "string" && msg.targetName.trim() ? msg.targetName.trim() : null;

      void (async () => {
        const courses = await db.select().from(coursesTable).where(eq(coursesTable.id, courseId)).limit(1);
        if (courses.length === 0) {
          send(player.ws, { type: "error", message: "Course not found." });
          return;
        }

        // Replace any existing challenge from this player
        removeChallengesBy(player.id);

        // If open challenge and there is a matching open challenge from someone else, auto-match
        if (!targetName) {
          const match = [...challenges.values()].find(
            (c) => c.fromId !== player.id && c.targetName === null,
          );
          if (match) {
            const opponent = players.get(match.fromId);
            if (opponent && !opponent.raceId) {
              challenges.delete(match.id);
              await startRace(opponent, player, match.courseId, match.level, match.courseName);
              return;
            }
            challenges.delete(match.id);
          }
        }

        // If targeted and the target has an open/targeted-at-me challenge, auto-match too
        if (targetName) {
          const match = [...challenges.values()].find(
            (c) =>
              c.fromName === targetName &&
              (c.targetName === null || c.targetName === player.name),
          );
          if (match) {
            const opponent = players.get(match.fromId);
            if (opponent && !opponent.raceId) {
              challenges.delete(match.id);
              await startRace(opponent, player, match.courseId, match.level, match.courseName);
              return;
            }
            challenges.delete(match.id);
          }
        }

        const challenge: Challenge = {
          id: genId("chal"),
          fromId: player.id,
          fromName: player.name,
          targetName,
          courseId,
          courseName: courses[0].name,
          level,
          createdAt: Date.now(),
        };
        challenges.set(challenge.id, challenge);
        player.challengeId = challenge.id;
        send(player.ws, { type: "challenge_created", challengeId: challenge.id });
        broadcastLobby();
      })().catch((err) => {
        logger.error({ err }, "create_challenge failed");
        send(player.ws, { type: "error", message: "Failed to create challenge." });
      });
      break;
    }

    case "cancel_challenge": {
      removeChallengesBy(player.id);
      player.challengeId = null;
      broadcastLobby();
      break;
    }

    case "accept_challenge": {
      if (!player.name || player.raceId) return;
      const challenge = challenges.get(String(msg.challengeId));
      if (!challenge) {
        send(player.ws, { type: "error", message: "Challenge no longer available." });
        return;
      }
      if (challenge.fromId === player.id) return;
      if (challenge.targetName && challenge.targetName !== player.name) {
        send(player.ws, { type: "error", message: "This challenge is for a different player." });
        return;
      }
      const challenger = players.get(challenge.fromId);
      if (!challenger || challenger.raceId) {
        challenges.delete(challenge.id);
        broadcastLobby();
        send(player.ws, { type: "error", message: "Challenger is no longer available." });
        return;
      }
      challenges.delete(challenge.id);
      removeChallengesBy(player.id);
      startRace(challenger, player, challenge.courseId, challenge.level, challenge.courseName).catch((err) => {
        logger.error({ err }, "startRace failed");
      });
      break;
    }

    case "answer": {
      const race = player.raceId ? races.get(player.raceId) : null;
      if (!race || race.finished) return;
      const now = Date.now();

      // Gate: no answers accepted until the shared countdown has elapsed
      if (now < race.startAt) {
        send(player.ws, { type: "error", message: "The race has not started yet." });
        return;
      }

      const idx = Number(msg.questionIndex);
      if (!Number.isInteger(idx) || idx < 0 || idx >= race.questions.length) return;

      const me = race.participants.find((p) => p.playerId === player.id);
      const opp = race.participants.find((p) => p.playerId !== player.id);
      if (!me || me.done) return;

      // Enforce strict sequential order; reject duplicates and skips
      const expectedIdx = me.answers.findIndex((a) => a === null);
      if (idx !== expectedIdx) {
        send(player.ws, { type: "error", message: "Answers must be submitted in order." });
        return;
      }

      // Server-side per-question deadline: window opens at race start or at
      // the moment of the player's previous answer, whichever is later.
      if (me.questionOpenedAt === 0) me.questionOpenedAt = race.startAt;
      const deadline = me.questionOpenedAt + QUESTION_TIME_LIMIT_MS + ANSWER_DEADLINE_SLACK_MS;
      const expired = now > deadline;

      const optionIndex = Number.isInteger(Number(msg.optionIndex)) ? Number(msg.optionIndex) : -1;
      // Expired submissions are recorded as timeouts (wrong), never as correct
      const correct = !expired && optionIndex === race.questions[idx].correctOptionIndex;
      me.answers[idx] = { optionIndex: expired ? -1 : optionIndex, correct, at: now };
      me.questionOpenedAt = now;

      // Per-answer feedback so the client can reveal without knowing keys upfront
      send(player.ws, {
        type: "answer_result",
        questionIndex: idx,
        correct,
        correctOptionIndex: race.questions[idx].correctOptionIndex,
        expired,
      });

      const answeredCount = me.answers.filter((x) => x !== null).length;
      const correctCount = me.answers.filter((x) => x?.correct).length;
      if (answeredCount === race.questions.length) me.done = true;

      // Notify opponent of progress
      if (opp) {
        const oppPlayer = players.get(opp.playerId);
        if (oppPlayer) {
          send(oppPlayer.ws, {
            type: "opponent_progress",
            questionIndex: idx,
            answeredCount,
            correctCount,
            done: me.done,
          });
        }
      }

      if (race.participants.every((p) => p.done)) {
        finishRace(race);
      }
      break;
    }

    default:
      break;
  }
}

export function setupRaceServer(server: HttpServer): void {
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (req: IncomingMessage, socket, head) => {
    const pathname = new URL(req.url ?? "/", "http://localhost").pathname;
    if (pathname === "/api/race/ws") {
      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit("connection", ws, req);
      });
    } else {
      socket.destroy();
    }
  });

  wss.on("connection", (ws: WebSocket) => {
    const player: Player = { id: genId("p"), name: "", ws, raceId: null, challengeId: null };
    players.set(player.id, player);
    send(ws, lobbySnapshot());

    ws.on("message", (data) => {
      try {
        handleMessage(player, data.toString());
      } catch (err) {
        logger.error({ err }, "Race message handling failed");
      }
    });

    ws.on("close", () => {
      players.delete(player.id);
      removeChallengesBy(player.id);
      const race = player.raceId ? races.get(player.raceId) : null;
      if (race) forfeitRace(race, player.id);
      broadcastLobby();
    });

    ws.on("error", () => {
      /* close handler does the cleanup */
    });
  });

  logger.info("Race WebSocket server attached at /api/race/ws");
}
