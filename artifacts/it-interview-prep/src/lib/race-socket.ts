import { useEffect, useRef, useState, useCallback } from "react";

export type Level = "beginner" | "intermediate" | "advanced";

export interface RaceQuestion {
  id: number;
  text: string;
  options: string[];
}

export interface AnswerResult {
  questionIndex: number;
  correct: boolean;
  correctOptionIndex: number;
  expired: boolean;
}

export interface LobbyPlayer {
  id: string;
  name: string;
  inRace: boolean;
}

export interface LobbyChallenge {
  id: string;
  fromId: string;
  fromName: string;
  targetName: string | null;
  courseId: number;
  courseName: string;
  level: Level;
}

export interface RaceStart {
  raceId: string;
  opponentName: string;
  courseId: number;
  courseName: string;
  level: Level;
  questions: RaceQuestion[];
  startAt: number;
  questionTimeLimitMs: number;
}

export interface OpponentProgress {
  questionIndex: number;
  answeredCount: number;
  correctCount: number;
  done: boolean;
}

export interface RaceFinished {
  raceId: string;
  winner: string | null;
  forfeitedBy?: string | null;
  perQuestion: {
    questionIndex: number;
    questionText: string;
    firstBy: string | null;
    results: { name: string; correct: boolean; answered: boolean }[];
  }[];
  totals: { name: string; correctCount: number; questionsWonFirst: number }[];
}

export interface ChatMessage {
  fromName: string;
  text: string;
  at: number;
}

interface RaceSocketState {
  connected: boolean;
  registered: boolean;
  playerId: string | null;
  players: LobbyPlayer[];
  challenges: LobbyChallenge[];
  myChallengeId: string | null;
  race: RaceStart | null;
  opponentProgress: OpponentProgress | null;
  lastAnswerResult: AnswerResult | null;
  finished: RaceFinished | null;
  error: string | null;
  chatMessages: ChatMessage[];
}

const initialState: RaceSocketState = {
  connected: false,
  registered: false,
  playerId: null,
  players: [],
  challenges: [],
  myChallengeId: null,
  race: null,
  opponentProgress: null,
  lastAnswerResult: null,
  finished: null,
  error: null,
  chatMessages: [],
};

function wsUrl(): string {
  const proto = window.location.protocol === "https:" ? "wss" : "ws";
  return `${proto}://${window.location.host}/api/race/ws`;
}

export function useRaceSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const [state, setState] = useState<RaceSocketState>(initialState);

  useEffect(() => {
    let closed = false;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    const connect = () => {
      const ws = new WebSocket(wsUrl());
      wsRef.current = ws;

      ws.onopen = () => {
        setState((s) => ({ ...s, connected: true, error: null }));
      };

      ws.onmessage = (ev) => {
        let msg: any;
        try {
          msg = JSON.parse(ev.data);
        } catch {
          return;
        }
        switch (msg.type) {
          case "welcome":
            setState((s) => ({ ...s, registered: true, playerId: msg.playerId }));
            break;
          case "lobby":
            setState((s) => ({ ...s, players: msg.players, challenges: msg.challenges }));
            break;
          case "challenge_created":
            setState((s) => ({ ...s, myChallengeId: msg.challengeId }));
            break;
          case "race_start":
            setState((s) => ({
              ...s,
              race: msg as RaceStart,
              opponentProgress: null,
              lastAnswerResult: null,
              finished: null,
              myChallengeId: null,
              error: null,
            }));
            break;
          case "answer_result":
            setState((s) => ({ ...s, lastAnswerResult: msg as AnswerResult }));
            break;
          case "opponent_progress":
            setState((s) => ({ ...s, opponentProgress: msg as OpponentProgress }));
            break;
          case "race_finished":
            setState((s) => ({ ...s, finished: msg as RaceFinished }));
            break;
          case "chat_message":
            setState((s) => ({
              ...s,
              chatMessages: [
                ...s.chatMessages.slice(-99),
                { fromName: msg.fromName, text: msg.text, at: msg.at } as ChatMessage,
              ],
            }));
            break;
          case "error":
            setState((s) => ({ ...s, error: msg.message }));
            break;
        }
      };

      ws.onclose = () => {
        wsRef.current = null;
        if (closed) return;
        setState((s) => ({ ...initialState, chatMessages: s.chatMessages, error: s.race && !s.finished ? "Connection lost." : null }));
        retryTimer = setTimeout(connect, 2000);
      };
    };

    connect();

    return () => {
      closed = true;
      if (retryTimer) clearTimeout(retryTimer);
      wsRef.current?.close();
    };
  }, []);

  const sendMsg = useCallback((msg: Record<string, unknown>) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg));
    }
  }, []);

  const register = useCallback((name: string) => sendMsg({ type: "hello", name }), [sendMsg]);
  const createChallenge = useCallback(
    (courseId: number, level: Level, targetName: string | null) =>
      sendMsg({ type: "create_challenge", courseId, level, targetName }),
    [sendMsg],
  );
  const cancelChallenge = useCallback(() => {
    sendMsg({ type: "cancel_challenge" });
    setState((s) => ({ ...s, myChallengeId: null }));
  }, [sendMsg]);
  const acceptChallenge = useCallback(
    (challengeId: string) => sendMsg({ type: "accept_challenge", challengeId }),
    [sendMsg],
  );
  const sendAnswer = useCallback(
    (questionIndex: number, optionIndex: number) => sendMsg({ type: "answer", questionIndex, optionIndex }),
    [sendMsg],
  );
  const sendChat = useCallback((text: string) => sendMsg({ type: "chat", text }), [sendMsg]);
  const clearError = useCallback(() => setState((s) => ({ ...s, error: null })), []);
  const resetRace = useCallback(
    () => setState((s) => ({ ...s, race: null, opponentProgress: null, lastAnswerResult: null, finished: null })),
    [],
  );

  return {
    ...state,
    register,
    createChallenge,
    cancelChallenge,
    acceptChallenge,
    sendAnswer,
    sendChat,
    clearError,
    resetRace,
  };
}
