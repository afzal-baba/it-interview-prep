/**
 * Integration test for the race WebSocket protocol.
 * Run with the API server up (through the dev proxy):
 *   node scripts/race-integration-test.mjs [ws://localhost:80/api/race/ws]
 *
 * Verifies, with two real WebSocket clients:
 *  1. race_start questions carry no answer keys
 *  2. answers during the countdown are rejected
 *  3. out-of-order answers are rejected
 *  4. sequential answers get server verdicts (answer_result) and progress is relayed
 *  5. winner and first-answer attribution are computed server-side
 */
import WebSocket from "ws";

const URL = process.argv[2] ?? "ws://localhost:80/api/race/ws";
let failures = 0;
function check(cond, label) {
  console.log(`${cond ? "PASS" : "FAIL"}: ${label}`);
  if (!cond) failures++;
}

function connect(name) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(URL);
    const c = { ws, name, msgs: [], waiters: [] };
    ws.on("message", (d) => {
      const m = JSON.parse(d.toString());
      c.msgs.push(m);
      c.waiters = c.waiters.filter((w) => {
        if (w.pred(m)) { w.resolve(m); return false; }
        return true;
      });
    });
    ws.on("open", () => { ws.send(JSON.stringify({ type: "hello", name })); resolve(c); });
    ws.on("error", reject);
  });
}

function waitFor(c, pred, label, timeoutMs = 10_000) {
  const hit = c.msgs.find(pred);
  if (hit) return Promise.resolve(hit);
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`timeout waiting for ${label} (${c.name})`)), timeoutMs);
    c.waiters.push({ pred, resolve: (m) => { clearTimeout(t); resolve(m); } });
  });
}

const send = (c, m) => c.ws.send(JSON.stringify(m));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const alice = await connect("TestAlice");
const bob = await connect("TestBob");
await waitFor(alice, (m) => m.type === "welcome", "welcome");
await waitFor(bob, (m) => m.type === "welcome", "welcome");

// Match via open challenges
send(alice, { type: "create_challenge", courseId: 1, level: "beginner", targetName: null });
await waitFor(alice, (m) => m.type === "challenge_created", "challenge_created");
send(bob, { type: "create_challenge", courseId: 1, level: "beginner", targetName: null });

const startA = await waitFor(alice, (m) => m.type === "race_start", "race_start");
const startB = await waitFor(bob, (m) => m.type === "race_start", "race_start");
check(startA.opponentName === "TestBob" && startB.opponentName === "TestAlice", "both players matched");

// 1. No answer keys leaked
const leaky = startA.questions.some((q) => "correctOptionIndex" in q || "explanation" in q);
check(!leaky, "race_start questions contain no correctOptionIndex/explanation");

// 2. Countdown gate: answer before startAt must be rejected, not recorded
check(startA.startAt > Date.now() + 1000, "countdown is in the future");
send(alice, { type: "answer", questionIndex: 0, optionIndex: 0 });
const earlyErr = await waitFor(alice, (m) => m.type === "error", "early-answer rejection");
check(/not started/i.test(earlyErr.message), "answer during countdown rejected");

// Wait for race start
await sleep(startA.startAt - Date.now() + 100);

// 3. Out-of-order answer rejected
send(alice, { type: "answer", questionIndex: 3, optionIndex: 0 });
const orderErr = await waitFor(alice, (m) => m.type === "error" && /order/i.test(m.message), "order rejection");
check(!!orderErr, "out-of-order answer rejected");

// 4. Sequential answers produce server verdicts + opponent progress.
// Brute-force the correct option for Q1 knowledge: answer 0 always; verdict tells correctness.
const total = startA.questions.length;
async function playAll(c, pickOption) {
  const results = [];
  for (let i = 0; i < total; i++) {
    send(c, { type: "answer", questionIndex: i, optionIndex: pickOption(i, results) });
    const r = await waitFor(c, (m) => m.type === "answer_result" && m.questionIndex === i, `verdict q${i}`);
    results.push(r);
  }
  return results;
}

// Alice answers first (option from verdict-less guess 0..3 not possible without keys;
// use correctOptionIndex from verdicts only after the fact — here we just answer option 0)
const aliceResults = await playAll(alice, () => 0);
check(aliceResults.length === total && aliceResults.every((r) => typeof r.correct === "boolean"),
  "server returns a verdict for every sequential answer");
check(aliceResults.every((r) => Number.isInteger(r.correctOptionIndex)),
  "verdict includes correct option for UI reveal");

// Duplicate answer for an already-answered question is rejected
send(alice, { type: "answer", questionIndex: 0, optionIndex: 1 });
const dupErr = await waitFor(alice, (m) => m.type === "error" && /order/i.test(m.message), "duplicate rejection");
check(!!dupErr, "duplicate answer rejected");

const progressAtBob = await waitFor(bob, (m) => m.type === "opponent_progress" && m.done, "opponent done");
check(progressAtBob.answeredCount === total, "opponent progress relayed to the other player");

// Bob answers second, using the correct option (learned from Alice's verdicts) so Bob
// gets everything right — but later than Alice, testing first-answer attribution.
const keyByIndex = aliceResults.map((r) => r.correctOptionIndex);
const bobResults = await playAll(bob, (i) => keyByIndex[i]);
check(bobResults.every((r) => r.correct), "all-correct run scores correct verdicts");

// 5. Winner + firsts computed server-side
const finA = await waitFor(alice, (m) => m.type === "race_finished", "race_finished");
const finB = await waitFor(bob, (m) => m.type === "race_finished", "race_finished");
check(finA.winner === finB.winner, "both clients agree on winner");

const aliceCorrect = aliceResults.filter((r) => r.correct).length;
const expectedWinner = aliceCorrect === total
  ? "TestAlice" // tie on correct → Alice answered first on every question
  : "TestBob";  // Bob has more correct answers
check(finA.winner === expectedWinner, `winner is ${expectedWinner} (correctness first, then first-answer tiebreak)`);

// Every question Alice got right should be attributed first to Alice (she answered earlier)
const misattributed = finA.perQuestion.filter(
  (pq, i) => aliceResults[i].correct && pq.firstBy !== "TestAlice",
);
check(misattributed.length === 0, "first-correct-answer attribution respects server receipt order");
check(finA.perQuestion.length === total, "per-question results reported for all questions");

alice.ws.close();
bob.ws.close();
console.log(failures === 0 ? "\nALL TESTS PASSED" : `\n${failures} TEST(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
