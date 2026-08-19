import React, { useMemo } from "react";

const GROUP_CODES = ["A", "B", "C", "D", "E", "F"];

const PHASES = ["1vs4", "2vs3", "1vs3", "2vs4", "1vs2", "3vs4"];

const PAIR_MAP = {
  "1vs4": { pair: "1 vs 4", p1: 0, p2: 3 },
  "2vs3": { pair: "2 vs 3", p1: 1, p2: 2 },
  "1vs3": { pair: "1 vs 3", p1: 0, p2: 2 },
  "2vs4": { pair: "2 vs 4", p1: 1, p2: 3 },
  "1vs2": { pair: "1 vs 2", p1: 0, p2: 1 },
  "3vs4": { pair: "3 vs 4", p1: 2, p2: 3 },
};

function normalizePlayers(rawPlayers = []) {
  return Array.isArray(rawPlayers)
    ? rawPlayers.map((name) => String(name || "").trim()).filter(Boolean)
    : [];
}

function getPlayersForGroup(
  groupStageData = {},
  fallbackGroupAssignments = {},
  groupCode
) {
  const fallbackPlayers = normalizePlayers(fallbackGroupAssignments?.[groupCode]);

  if (fallbackPlayers.length) {
    return fallbackPlayers;
  }

  const firebasePlayers = normalizePlayers(
    groupStageData?.[`group${groupCode}`]?.players
  );

  return firebasePlayers;
}

function timeToMinutes(value = "08:00") {
  const [hh = "8", mm = "0"] = String(value || "08:00").split(":");
  return (Number(hh) || 0) * 60 + (Number(mm) || 0);
}

function minutesToTime(totalMinutes) {
  const hh = String(Math.floor(totalMinutes / 60)).padStart(2, "0");
  const mm = String(totalMinutes % 60).padStart(2, "0");
  return `${hh}:${mm}`;
}

function buildFlatMatches(groupStageData = {}, fallbackGroupAssignments = {}) {
  const matches = [];

  PHASES.forEach((phase) => {
    GROUP_CODES.forEach((groupCode) => {
      const players = getPlayersForGroup(
        groupStageData,
        fallbackGroupAssignments,
        groupCode
      );

      const pairInfo = PAIR_MAP[phase];

      const p1 = players[pairInfo.p1];
      const p2 = players[pairInfo.p2];

      if (!p1 || !p2) {
        matches.push({
          group: groupCode,
          pair: pairInfo.pair,
          players: `VĐV ${pairInfo.p1 + 1} VS VĐV ${pairInfo.p2 + 1}`,
        });
        return;
      }

      matches.push({
        group: groupCode,
        pair: pairInfo.pair,
        players: `${p1} VS ${p2}`,
      });
    });
  });

  return matches;
}

function buildScheduleData({
  groupStageData = {},
  fallbackGroupAssignments = {},
  startTime = "08:00",
  matchDuration = 20,
  tableCount = 4,
}) {
  const flatMatches = buildFlatMatches(groupStageData, fallbackGroupAssignments);
  const startMinutes = timeToMinutes(startTime);

  return flatMatches.reduce((slots, match, index) => {
    const slotIndex = Math.floor(index / tableCount);
    const tableNumber = (index % tableCount) + 1;
    const time = minutesToTime(startMinutes + slotIndex * matchDuration);

    if (!slots[slotIndex]) {
      slots[slotIndex] = {
        time,
        matches: [],
      };
    }

    slots[slotIndex].matches.push({
      ...match,
      table: `Bàn ${tableNumber}`,
    });

    return slots;
  }, []);
}

export default function ScheduleTab({
  groupStageData = {},
  fallbackGroupAssignments = {},
}) {
  const scheduleData = useMemo(
    () =>
      buildScheduleData({
        groupStageData,
        fallbackGroupAssignments,
        startTime: "08:00",
        matchDuration: 20,
        tableCount: 4,
      }),
    [groupStageData, fallbackGroupAssignments]
  );

  const totalMatches = scheduleData.reduce(
    (total, slot) => total + slot.matches.length,
    0
  );

  const lastSlot = scheduleData[scheduleData.length - 1];

  return (
    <div className="schedule-page schedule-clean">
      <h2 className="schedule-clean-title">📅 LỊCH THI ĐẤU</h2>

      <div className="schedule-summary-row">
        <div className="schedule-summary-box">
          <span>Tổng trận</span>
          <strong>{totalMatches}</strong>
        </div>

        <div className="schedule-summary-box">
          <span>Số bàn</span>
          <strong>4</strong>
        </div>

        <div className="schedule-summary-box">
          <span>Bắt đầu</span>
          <strong>08:00</strong>
        </div>

        <div className="schedule-summary-box">
          <span>Lượt cuối</span>
          <strong>{lastSlot?.time || "--:--"}</strong>
        </div>
      </div>

      {scheduleData.map((slot) => (
        <section className="schedule-time-block" key={slot.time}>
          <div className="schedule-time-title">{slot.time}</div>

          <div className="schedule-match-list">
            {slot.matches.map((match) => (
              <div
                className={`schedule-match-item group-${match.group}`}
                key={`${slot.time}-${match.group}-${match.table}-${match.pair}`}
              >
                <div className="schedule-match-meta">
                  <span>Bảng {match.group}</span>
                  <span>|</span>
                  <span>{match.table}</span>
                  <span>|</span>
                  <strong>{match.pair}</strong>
                </div>

                <div className="schedule-players">{match.players}</div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}