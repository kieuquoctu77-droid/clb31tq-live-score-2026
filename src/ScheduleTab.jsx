import React, { useMemo, useState } from 'react';

const GROUP_CODES = ['A', 'B', 'C', 'D', 'E', 'F'];

const GROUP_STYLE = {
  A: { card: 'border-blue-300 bg-blue-50', badge: 'bg-blue-700 text-white', text: 'text-blue-800' },
  B: { card: 'border-orange-300 bg-orange-50', badge: 'bg-orange-600 text-white', text: 'text-orange-800' },
  C: { card: 'border-purple-300 bg-purple-50', badge: 'bg-purple-700 text-white', text: 'text-purple-800' },
  D: { card: 'border-rose-300 bg-rose-50', badge: 'bg-rose-700 text-white', text: 'text-rose-800' },
  E: { card: 'border-emerald-300 bg-emerald-50', badge: 'bg-emerald-700 text-white', text: 'text-emerald-800' },
  F: { card: 'border-yellow-300 bg-yellow-50', badge: 'bg-yellow-600 text-white', text: 'text-yellow-800' },
};

function normalizePlayers(rawPlayers = []) {
  return Array.isArray(rawPlayers)
    ? rawPlayers.map(name => String(name || '').trim()).filter(Boolean)
    : [];
}

function getPlayersForGroup(groupStageData = {}, fallbackGroupAssignments = {}, groupCode) {
  const groupData = groupStageData?.[`group${groupCode}`] || {};
  const firebasePlayers = normalizePlayers(groupData.players);
  if (firebasePlayers.length) return firebasePlayers;
  return normalizePlayers(fallbackGroupAssignments?.[groupCode]);
}

function createMatchForPair(groupCode, players, phase) {
  const pairMap = {
    '1vs4': { round: 1, roundLabel: 'Lượt 1', phaseLabel: '1 vs 4', p1: players[0], p2: players[3] },
    '2vs3': { round: 1, roundLabel: 'Lượt 1', phaseLabel: '2 vs 3', p1: players[1], p2: players[2] },
    '1vs3': { round: 2, roundLabel: 'Lượt 2', phaseLabel: '1 vs 3', p1: players[0], p2: players[2] },
    '2vs4': { round: 2, roundLabel: 'Lượt 2', phaseLabel: '2 vs 4', p1: players[1], p2: players[3] },
    '1vs2': { round: 3, roundLabel: 'Lượt 3', phaseLabel: '1 vs 2', p1: players[0], p2: players[1] },
    '3vs4': { round: 3, roundLabel: 'Lượt 3', phaseLabel: '3 vs 4', p1: players[2], p2: players[3] },
  };

  const match = pairMap[phase];
  if (!match?.p1 || !match?.p2) return null;

  return {
    group: groupCode,
    pairKey: phase,
    pairLabel: match.phaseLabel,
    round: match.round,
    roundLabel: match.roundLabel,
    p1: match.p1,
    p2: match.p2,
  };
}

function buildGroupMatches(groupStageData = {}, fallbackGroupAssignments = {}) {
  const phases = ['1vs4', '2vs3', '1vs3', '2vs4', '1vs2', '3vs4'];
  const matches = [];

  phases.forEach(phase => {
    GROUP_CODES.forEach(groupCode => {
      const players = getPlayersForGroup(groupStageData, fallbackGroupAssignments, groupCode);

      if (players.length === 4) {
        const match = createMatchForPair(groupCode, players, phase);
        if (match) matches.push(match);
        return;
      }

      if (phase !== '1vs4') return;

      for (let i = 0; i < players.length; i += 1) {
        for (let j = i + 1; j < players.length; j += 1) {
          matches.push({
            group: groupCode,
            pairKey: `fallback-${i + 1}-${j + 1}`,
            pairLabel: `${i + 1} vs ${j + 1}`,
            round: 1,
            roundLabel: 'Lượt 1',
            p1: players[i],
            p2: players[j],
          });
        }
      }
    });
  });

  return matches;
}

function timeToMinutes(value = '08:00') {
  const [hourText = '8', minuteText = '0'] = String(value || '08:00').split(':');
  const hour = Number(hourText) || 0;
  const minute = Number(minuteText) || 0;
  return hour * 60 + minute;
}

function minutesToTime(totalMinutes) {
  const hh = String(Math.floor(totalMinutes / 60)).padStart(2, '0');
  const mm = String(totalMinutes % 60).padStart(2, '0');
  return `${hh}:${mm}`;
}

function buildSchedule({
  groupStageData = {},
  fallbackGroupAssignments = {},
  tableCount = 4,
  startTime = '08:00',
  matchDuration = 20,
}) {
  const orderedMatches = buildGroupMatches(groupStageData, fallbackGroupAssignments);
  const startMinutes = timeToMinutes(startTime);

  return orderedMatches.map((match, index) => {
    const slotIndex = Math.floor(index / tableCount);
    return {
      id: index + 1,
      time: minutesToTime(startMinutes + slotIndex * matchDuration),
      table: (index % tableCount) + 1,
      ...match,
    };
  });
}

function buildMatrixRows(schedule = [], tableCount = 4) {
  const groupedMap = schedule.reduce((acc, item) => {
    if (!acc[item.time]) {
      acc[item.time] = Array.from({ length: tableCount }, (_, index) => ({
        table: index + 1,
        match: null,
      }));
    }

    acc[item.time][item.table - 1] = {
      table: item.table,
      match: item,
    };

    return acc;
  }, {});

  return Object.entries(groupedMap).map(([time, tables]) => ({ time, tables }));
}

function MatchCell({ match, table }) {
  if (!match) {
    return (
      <div className="min-h-[112px] rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 p-3 text-center text-sm font-bold text-slate-400">
        <div className="mb-2 text-xs font-black uppercase">Bàn {table}</div>
        Trống
      </div>
    );
  }

  const style = GROUP_STYLE[match.group] || GROUP_STYLE.A;

  return (
    <div className={`min-h-[112px] rounded-2xl border-2 p-3 shadow-sm ${style.card}`}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className={`rounded-full px-2.5 py-1 text-xs font-black ${style.badge}`}>
          Bảng {match.group}
        </span>
        <span className={`text-base font-black ${style.text}`}>{match.pairLabel}</span>
      </div>

      <div className="mb-2 text-xs font-black uppercase text-slate-500">
      
      </div>

      <div className="rounded-xl bg-white/90 px-3 py-2 text-sm font-black leading-snug text-slate-950">
        <div className="truncate" title={match.p1}>{match.p1}</div>
        <div className="my-0.5 text-xs font-black uppercase text-slate-400">vs</div>
        <div className="truncate" title={match.p2}>{match.p2}</div>
      </div>
    </div>
  );
}

export default function ScheduleTab({
  groupStageData = {},
  fallbackGroupAssignments = {},
}) {
  const [startTime, setStartTime] = useState('08:00');
  const [tableCount, setTableCount] = useState(4);
  const [matchDuration, setMatchDuration] = useState(20);

  const schedule = useMemo(
    () => buildSchedule({ groupStageData, fallbackGroupAssignments, tableCount, startTime, matchDuration }),
    [groupStageData, fallbackGroupAssignments, tableCount, startTime, matchDuration]
  );

  const matrixRows = useMemo(
    () => buildMatrixRows(schedule, tableCount),
    [schedule, tableCount]
  );

  const totalSlots = schedule.length ? Math.ceil(schedule.length / tableCount) : 0;
  const finishTime = schedule.length
    ? minutesToTime(timeToMinutes(startTime) + Math.max(0, totalSlots - 1) * matchDuration)
    : '--:--';

  return (
    <div className="rounded-3xl bg-white/95 p-4 shadow-2xl sm:p-6">
      <div className="mb-5 flex flex-col gap-3 border-b border-slate-200 pb-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="text-2xl font-black text-amber-700 sm:text-3xl">
            📅 LỊCH THI ĐẤU
          </div>
          <div className="mt-1 text-sm font-bold text-slate-500">
            Lịch dạng ma trận: chọn giờ trước, sau đó nhìn ngang theo Bàn 1, Bàn 2, Bàn 3, Bàn 4.
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-3">
          <label className="rounded-2xl bg-amber-50 p-3 text-sm font-bold text-slate-700">
            <div className="mb-1 text-xs font-black uppercase text-amber-700">Giờ bắt đầu</div>
            <input
              type="time"
              value={startTime}
              onChange={event => setStartTime(event.target.value || '08:00')}
              className="w-full rounded-xl border border-amber-200 bg-white px-3 py-2 font-black outline-none focus:border-amber-600"
            />
          </label>

          <label className="rounded-2xl bg-blue-50 p-3 text-sm font-bold text-slate-700">
            <div className="mb-1 text-xs font-black uppercase text-blue-700">Số bàn</div>
            <select
              value={tableCount}
              onChange={event => setTableCount(Number(event.target.value) || 4)}
              className="w-full rounded-xl border border-blue-200 bg-white px-3 py-2 font-black outline-none focus:border-blue-600"
            >
              {[2, 3, 4, 5, 6].map(value => (
                <option key={value} value={value}>{value} bàn</option>
              ))}
            </select>
          </label>

          <label className="rounded-2xl bg-emerald-50 p-3 text-sm font-bold text-slate-700">
            <div className="mb-1 text-xs font-black uppercase text-emerald-700">Thời lượng</div>
            <select
              value={matchDuration}
              onChange={event => setMatchDuration(Number(event.target.value) || 20)}
              className="w-full rounded-xl border border-emerald-200 bg-white px-3 py-2 font-black outline-none focus:border-emerald-600"
            >
              {[10, 15, 20, 25, 30].map(value => (
                <option key={value} value={value}>{value} phút/trận</option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="mb-4 grid gap-3 md:grid-cols-4">
        <div className="rounded-2xl bg-slate-100 px-4 py-3 text-center">
          <div className="text-xs font-black uppercase text-slate-500">Tổng trận</div>
          <div className="text-2xl font-black text-slate-950">{schedule.length}</div>
        </div>
        <div className="rounded-2xl bg-slate-100 px-4 py-3 text-center">
          <div className="text-xs font-black uppercase text-slate-500">Số bàn</div>
          <div className="text-2xl font-black text-blue-700">{tableCount}</div>
        </div>
        <div className="rounded-2xl bg-slate-100 px-4 py-3 text-center">
          <div className="text-xs font-black uppercase text-slate-500">Bắt đầu</div>
          <div className="text-2xl font-black text-amber-700">{startTime}</div>
        </div>
        <div className="rounded-2xl bg-slate-100 px-4 py-3 text-center">
          <div className="text-xs font-black uppercase text-slate-500">Lượt cuối</div>
          <div className="text-2xl font-black text-emerald-700">{finishTime}</div>
        </div>
      </div>

      <div className="mb-4 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-bold text-white">
        Bản mới: lịch đã chuyển sang ma trận Giờ x Bàn, không còn bảng STT dài như trước.
      </div>

      <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-slate-100 p-3 shadow-inner">
        <div
          className="grid min-w-[880px] gap-3"
          style={{ gridTemplateColumns: `110px repeat(${tableCount}, minmax(180px, 1fr))` }}
        >
          <div className="sticky left-0 z-10 flex min-h-[56px] items-center justify-center rounded-2xl bg-slate-950 text-base font-black text-amber-300">
            Giờ
          </div>

          {Array.from({ length: tableCount }, (_, index) => (
            <div key={`header-${index + 1}`} className="flex min-h-[56px] items-center justify-center rounded-2xl bg-slate-950 text-base font-black text-white">
              Bàn {index + 1}
            </div>
          ))}

          {matrixRows.map(row => (
            <React.Fragment key={row.time}>
              <div className="sticky left-0 z-10 flex min-h-[112px] items-center justify-center rounded-2xl bg-slate-950 px-2 text-xl font-black text-amber-400">
                {row.time}
              </div>

              {row.tables.map(item => (
                <MatchCell
                  key={`${row.time}-table-${item.table}`}
                  table={item.table}
                  match={item.match}
                />
              ))}
            </React.Fragment>
          ))}
        </div>
      </div>

      {!schedule.length && (
        <div className="mt-4 rounded-2xl bg-yellow-50 px-4 py-3 text-sm font-bold text-yellow-800">
          Chưa có dữ liệu VĐV vòng bảng. Anh vào tab Vòng bảng để thiết lập VĐV cho các bảng A-F trước.
        </div>
      )}

      <div className="mt-4 rounded-2xl bg-blue-50 px-4 py-3 text-sm font-bold text-blue-800">
        Ghi chú: lịch sẽ chạy xong toàn bộ cặp 1vs4 của các bảng A-F trước, sau đó mới tới 2vs3, rồi lần lượt 1vs3, 2vs4, 1vs2 và 3vs4.
      </div>
    </div>
  );
}
