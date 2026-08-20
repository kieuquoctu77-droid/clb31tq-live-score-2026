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
  const firebasePlayers = normalizePlayers(
    groupStageData?.[`group${groupCode}`]?.players
  );
  if (firebasePlayers.length) return firebasePlayers;
  return normalizePlayers(fallbackGroupAssignments?.[groupCode]);
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

function GroupOverview({ groupStageData, fallbackGroupAssignments }) {
  const groups = useMemo(
    () => GROUP_CODES.map((code) => ({
      code,
      players: getPlayersForGroup(groupStageData, fallbackGroupAssignments, code),
    })),
    [groupStageData, fallbackGroupAssignments]
  );

  return (
    <section className="mb-5">
      <div className="mb-3 text-center text-sm font-black uppercase leading-relaxed text-yellow-300 sm:text-base md:text-lg">
        THỨ TỰ THI ĐẤU: <span className="text-white">1vs4 → 2vs3 → 1vs3 → 2vs4 → 1vs2 → 3vs4</span>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 xl:grid-cols-6">
        {groups.map(({ code, players }) => (
          <article key={code} className="min-w-0 overflow-hidden rounded-xl bg-white shadow-lg ring-1 ring-slate-200 sm:rounded-2xl">
            <div className="bg-gradient-to-r from-amber-500 to-orange-600 px-2 py-2 text-center text-sm font-black text-white sm:text-base">
              BẢNG {code}
            </div>
            <div className="space-y-1 p-2 sm:p-3">
              {Array.from({ length: 4 }, (_, index) => {
                const player = players[index];
                return (
                  <div key={`${code}-${index}`} className="flex min-w-0 items-center gap-1.5 rounded-lg bg-slate-50 px-1.5 py-1.5 sm:gap-2 sm:px-2">
                    <span className="flex h-6 w-7 shrink-0 items-center justify-center rounded-md bg-red-100 text-[11px] font-black text-red-700 sm:h-7 sm:w-8 sm:text-xs">
                      {index + 1}
                    </span>
                    <span className="min-w-0 flex-1 break-words text-[11px] font-extrabold leading-tight text-slate-900 sm:text-xs xl:text-[11px] 2xl:text-xs" title={player || "Chưa cập nhật"}>
                      {player || "Chưa cập nhật"}
                    </span>
                  </div>
                );
              })}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
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

  return (
    <div className="schedule-page schedule-clean">
      <h2 className="schedule-clean-title">📅 LỊCH THI ĐẤU</h2>

      <GroupOverview
        groupStageData={groupStageData}
        fallbackGroupAssignments={fallbackGroupAssignments}
      />

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