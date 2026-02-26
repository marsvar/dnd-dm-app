import type { Encounter, EncounterParticipant } from "../models/types";
import type { EncounterEvent } from "./encounterEvents";

const getTurnOrder = (participants: EncounterParticipant[]) => {
  return participants
    .filter((participant) =>
      participant.currentHp === null ? true : participant.currentHp > 0
    )
    .sort((a, b) => {
      const aInit = a.initiative ?? Number.NEGATIVE_INFINITY;
      const bInit = b.initiative ?? Number.NEGATIVE_INFINITY;
      if (aInit !== bInit) {
        return bInit - aInit;
      }
      return a.name.localeCompare(b.name);
    })
    .map((participant) => participant.id);
};

const clampHp = (value: number, maxHp: number | null) => {
  const floor = 0;
  if (maxHp === null || maxHp === undefined) {
    return Math.max(floor, value);
  }
  return Math.min(maxHp, Math.max(floor, value));
};

const applyHpDelta = (participant: EncounterParticipant, delta: number) => {
  const baseCurrent = participant.currentHp ?? participant.maxHp ?? null;
  if (baseCurrent === null || baseCurrent === undefined) {
    return participant;
  }
  const nextCurrent = clampHp(baseCurrent + delta, participant.maxHp);
  return { ...participant, currentHp: nextCurrent };
};

const applyDamage = (participant: EncounterParticipant, amount: number) => {
  if (amount <= 0) {
    return participant;
  }
  const baseTemp = participant.tempHp ?? 0;
  const remaining = Math.max(0, amount - baseTemp);
  const nextTemp = Math.max(0, baseTemp - amount);
  if (remaining <= 0) {
    return { ...participant, tempHp: nextTemp };
  }
  const reduced = applyHpDelta(participant, -remaining);
  return { ...reduced, tempHp: nextTemp };
};

export function applyEncounterEvent(
  encounter: Encounter,
  event: EncounterEvent
): Encounter {
  switch (event.t) {
    case "PARTICIPANT_ADDED": {
      const nextParticipant: EncounterParticipant = {
        id: `participant-${event.id}`,
        ...event.participant,
        conditions: event.participant.conditions ?? [],
        tempHp: event.participant.tempHp ?? null,
        visual: {
          fallback: "initials",
          ...(event.participant.visual ?? {}),
        },
      };
      const nextParticipants = [...encounter.participants, nextParticipant];
      const nextActiveParticipantId =
        encounter.isRunning && !encounter.activeParticipantId
          ? getTurnOrder(nextParticipants)[0] ?? null
          : encounter.activeParticipantId;
      return {
        ...encounter,
        participants: nextParticipants,
        activeParticipantId: nextActiveParticipantId,
      };
    }
    case "PARTICIPANT_REMOVED": {
      const nextParticipants = encounter.participants.filter(
        (participant) => participant.id !== event.participantId
      );
      const activeRemoved = encounter.activeParticipantId === event.participantId;
      const nextActiveParticipantId = activeRemoved
        ? getTurnOrder(nextParticipants)[0] ?? null
        : encounter.activeParticipantId;
      return {
        ...encounter,
        participants: nextParticipants,
        activeParticipantId: nextActiveParticipantId,
      };
    }
    case "COMBAT_STARTED": {
      const order = getTurnOrder(encounter.participants);
      return {
        ...encounter,
        isRunning: true,
        round: Math.max(1, encounter.round || 1),
        activeParticipantId: order[0] ?? null,
      };
    }
    case "COMBAT_STOPPED": {
      return {
        ...encounter,
        isRunning: false,
        activeParticipantId: null,
      };
    }
    case "ROUND_SET": {
      return {
        ...encounter,
        round: Math.max(1, event.value),
      };
    }
    case "TURN_ADVANCED": {
      const order = getTurnOrder(encounter.participants);
      if (!order.length) {
        return { ...encounter, activeParticipantId: null };
      }
      const currentIndex = encounter.activeParticipantId
        ? order.indexOf(encounter.activeParticipantId)
        : -1;
      const hasActive = currentIndex >= 0;
      const nextIndex = hasActive
        ? (currentIndex + event.direction + order.length) % order.length
        : 0;
      let nextRound = encounter.round;
      if (hasActive && event.direction > 0 && nextIndex === 0) {
        nextRound += 1;
      }
      if (hasActive && event.direction < 0 && currentIndex === 0) {
        nextRound = Math.max(1, nextRound - 1);
      }
      return {
        ...encounter,
        isRunning: true,
        round: nextRound,
        activeParticipantId: order[nextIndex] ?? null,
      };
    }
    case "INITIATIVE_SET": {
      return {
        ...encounter,
        participants: encounter.participants.map((participant) =>
          participant.id === event.participantId
            ? { ...participant, initiative: event.value }
            : participant
        ),
      };
    }
    case "DAMAGE_APPLIED": {
      return {
        ...encounter,
        participants: encounter.participants.map((participant) =>
          participant.id === event.participantId
            ? applyDamage(participant, event.amount)
            : participant
        ),
      };
    }
    case "HEAL_APPLIED": {
      return {
        ...encounter,
        participants: encounter.participants.map((participant) =>
          participant.id === event.participantId
            ? applyHpDelta(participant, event.amount)
            : participant
        ),
      };
    }
    case "TEMP_HP_SET": {
      const nextValue =
        event.value === null || event.value === undefined
          ? null
          : Math.max(0, event.value);
      return {
        ...encounter,
        participants: encounter.participants.map((participant) =>
          participant.id === event.participantId
            ? { ...participant, tempHp: nextValue }
            : participant
        ),
      };
    }
    case "CONDITIONS_SET": {
      return {
        ...encounter,
        participants: encounter.participants.map((participant) =>
          participant.id === event.participantId
            ? { ...participant, conditions: event.value }
            : participant
        ),
      };
    }
    case "NOTES_SET": {
      return {
        ...encounter,
        participants: encounter.participants.map((participant) =>
          participant.id === event.participantId
            ? { ...participant, notes: event.value }
            : participant
        ),
      };
    }
    case "COMBAT_MODE_SET": {
      return {
        ...encounter,
        combatMode: event.mode,
      };
    }
    case "ENCOUNTER_COMPLETED": {
      return {
        ...encounter,
        isRunning: false,
        status: "completed" as const,
        activeParticipantId: null,
      };
    }
    case "ROLL_RECORDED": {
      return encounter;
    }
    default: {
      return encounter;
    }
  }
}
