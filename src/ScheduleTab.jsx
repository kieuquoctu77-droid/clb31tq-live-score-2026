import React, { useMemo, useState } from 'react';

const GROUP_CODES = ['A', 'B', 'C', 'D', 'E', 'F'];

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

      // Fallback nếu bảng chưa đủ đúng 4 VĐV: vẫn sinh round-robin cơ bản để BTC thấy dữ liệu còn thiếu.
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
  matchDuration = 15,
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

export default function ScheduleTab({
  groupStageData = {},
  fallbackGroupAssignments = {},
}) {
  const [startTime, setStartTime] = useState('08:00');
  const [tableCount, setTableCount] = useState(4);
  const [matchDuration, setMatchDuration] = useState(15);

  const schedule = useMemo(
    () => buildSchedule({ groupStageData, fallbackGroupAssignments, tableCount, startTime, matchDuration }),
    [groupStageData, fallbackGroupAssignments, tableCount, startTime, matchDuration]
  );

  const totalSlots = schedule.length ? Math.ceil(schedule.length / tableCount) : 0;
  const finishTime = schedule.length
    ? minutesToTime(timeToMinutes(startTime) + Math.max(0, totalSlots - 1) * matchDuration)
    : '--:--';

  return (
    <div className="rounded-3xl bg-white/95 p-4 shadow-2xl sm:p-6">
      <div className="mb-5 flex flex-col gap-3 border-b border-slate-200 pb-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="text-2xl font-black text-amber-700 sm:text-3xl">📅 LỊCH THI ĐẤU</div>
          <div className="mt-1 text-sm font-bold text-slate-500">
            Lịch chạy theo từng cặp trên toàn bộ bảng: tất cả 1vs4, rồi tất cả 2vs3, sau đó mới sang 1vs3, 2vs4, 1vs2 và 3vs4.
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
              onChange={event => setMatchDuration(Number(event.target.value) || 15)}
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

      <div className="overflow-auto rounded-3xl border border-slate-200 shadow-inner">
        <table className="min-w-[900px] w-full border-collapse bg-white">
          <thead className="bg-slate-950 text-white">
            <tr>
              <th className="px-3 py-3 text-left text-sm font-black">STT</th>
              <th className="px-3 py-3 text-left text-sm font-black">Giờ</th>
              <th className="px-3 py-3 text-left text-sm font-black">Bàn</th>
              <th className="px-3 py-3 text-left text-sm font-black">Lượt</th>
              <th className="px-3 py-3 text-left text-sm font-black">Bảng</th>
              <th className="px-3 py-3 text-left text-sm font-black">Cặp</th>
              <th className="px-3 py-3 text-left text-sm font-black">Trận đấu</th>
            </tr>
          </thead>
          <tbody>
            {schedule.map(item => (
              <tr key={`${item.group}-${item.pairKey}-${item.id}`} className="border-b border-slate-100 hover:bg-amber-50">
                <td className="px-3 py-3 text-sm font-black text-slate-700">{item.id}</td>
                <td className="px-3 py-3 text-sm font-black text-amber-700">{item.time}</td>
                <td className="px-3 py-3 text-sm font-black text-blue-700">Bàn {item.table}</td>
                <td className="px-3 py-3 text-sm font-black text-emerald-700">{item.roundLabel}</td>
                <td className="px-3 py-3 text-sm font-black text-slate-900">Bảng {item.group}</td>
                <td className="px-3 py-3 text-sm font-black text-purple-700">{item.pairLabel}</td>
                <td className="px-3 py-3 text-sm font-black text-slate-950">
                  {item.p1} <span className="text-slate-400">vs</span> {item.p2}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
