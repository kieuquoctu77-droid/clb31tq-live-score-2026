import React, { useEffect, useMemo, useState } from 'react';
import { onValue, ref, set } from 'firebase/database';
import { Save, X, Edit3, RotateCcw, Trophy } from 'lucide-react';

const DEFAULT_GROUP_ID = 'groupA';
const SETS_TO_WIN = 3;
const MAX_GROUP_PLAYERS = 4;

const sampleGroup = {
  title: 'ĐẤU TRƯỜNG 13 PROMAX - CLB TQ 2026',
  groupName: 'Bảng A',
  players: [
    'ĐÌNH - NHÂN',
    'THANH - KỲ',
    'TRUNG (H) - NHƠ',
    'LINH - HÂN',
    'TRUNG (MS) - SANG',
    'BẢO - TÀI',
    'TRUNG (MS) - T LONG',
    'TRUNG (MS) - THU',
    'TỰ - VI',
    'HIỆP - CHÂU',
    'HIỆP - HUY',
    'TRUNG (H) - KIỆT',
  ],
  results: {
    '0-2': '2-3',
    '0-9': '3-2',
    '1-4': '2-3',
    '1-5': '3-0',
    '2-0': '3-2',
    '2-4': '3-2',
    '3-4': '1-3',
    '3-7': '1-3',
    '3-8': '1-3',
    '3-9': '3-2',
    '4-1': '3-2',
    '4-2': '2-3',
    '4-3': '3-1',
    '5-1': '0-3',
    '5-11': '3-0',
    '7-3': '3-1',
    '7-8': '3-1',
    '8-3': '3-1',
    '8-7': '1-3',
    '8-9': '3-1',
    '9-0': '2-3',
    '9-3': '2-3',
    '9-8': '1-3',
  },
  notes: {
    0: '70',
    1: '60',
    3: '120',
    4: '50',
    5: '60',
    8: '40',
    9: '180',
    11: '50',
  },
};


function normalizeGroupPlayers(players) {
  const list = Array.isArray(players) ? players : [];
  return list.slice(0, MAX_GROUP_PLAYERS);
}

function parseScore(value) {
  const text = String(value || '').trim();
  const match = text.match(/^(\d+)\s*-\s*(\d+)$/);

  if (!match) {
    return null;
  }

  return {
    a: Number(match[1]),
    b: Number(match[2]),
  };
}

function reverseScore(value) {
  const parsed = parseScore(value);
  if (!parsed) return '';
  return `${parsed.b}-${parsed.a}`;
}

function getCanonicalKey(i, j) {
  return i < j ? `${i}-${j}` : `${j}-${i}`;
}

function getDisplayScore(results, i, j) {
  if (i === j) return '';

  const direct = results?.[`${i}-${j}`];
  if (direct) return direct;

  const reverse = results?.[`${j}-${i}`];
  if (reverse) return reverseScore(reverse);

  return '';
}

function computeStandings(players, results) {
  const standings = players.map((name, index) => ({
    index,
    name,
    played: 0,
    wins: 0,
    losses: 0,
    setFor: 0,
    setAgainst: 0,
    setDiff: 0,
  }));

  Object.entries(results || {}).forEach(([key, value]) => {
    const parsed = parseScore(value);
    if (!parsed) return;

    const [i, j] = key.split('-').map(Number);
    if (!standings[i] || !standings[j]) return;

    standings[i].played += 1;
    standings[j].played += 1;
    standings[i].setFor += parsed.a;
    standings[i].setAgainst += parsed.b;
    standings[j].setFor += parsed.b;
    standings[j].setAgainst += parsed.a;

    if (parsed.a > parsed.b) {
      standings[i].wins += 1;
      standings[j].losses += 1;
    } else if (parsed.b > parsed.a) {
      standings[j].wins += 1;
      standings[i].losses += 1;
    }
  });

  return standings
    .map(item => ({
      ...item,
      setDiff: item.setFor - item.setAgainst,
    }))
    .sort((a, b) => {
      if (b.wins !== a.wins) return b.wins - a.wins;
      if (b.setDiff !== a.setDiff) return b.setDiff - a.setDiff;
      if (b.setFor !== a.setFor) return b.setFor - a.setFor;
      return a.name.localeCompare(b.name, 'vi');
    });
}

function cellClass(score, isDiagonal) {
  if (isDiagonal) return 'bg-slate-500 text-white';

  const parsed = parseScore(score);
  if (!parsed) return 'bg-yellow-50 text-slate-500';

  if (parsed.a > parsed.b) return 'bg-lime-400 text-slate-950 font-black';
  if (parsed.b > parsed.a) return 'bg-pink-300 text-slate-950 font-black';

  return 'bg-yellow-50 text-slate-700';
}

export default function GroupStage({
  database,
  adminMode = false,
  dbPath = 'clb31tq/group-stage/groupA',
  initialPlayers = [],
  groupCode = 'A',
  groupName = '',
}) {
  const [group, setGroup] = useState(() => ({
    ...sampleGroup,
    groupName: groupName || `Bảng ${groupCode}`,
    players: initialPlayers.length ? initialPlayers.slice(0, MAX_GROUP_PLAYERS) : normalizeGroupPlayers(sampleGroup.players),
  }));
  const [editingCell, setEditingCell] = useState(null);
  const [scoreA, setScoreA] = useState(SETS_TO_WIN);
  const [scoreB, setScoreB] = useState(0);

  useEffect(() => {
    if (!database) return;

    const groupRef = ref(database, dbPath);
    const unsub = onValue(groupRef, snapshot => {
      const value = snapshot.val();

      if (value) {
        setGroup({
          ...sampleGroup,
          ...value,
          groupName: value.groupName || groupName || `Bảng ${groupCode}`,
          players: normalizeGroupPlayers(value.players || sampleGroup.players),
          results: value.results || {},
          notes: value.notes || {},
        });
      } else {
        set(groupRef, {
          ...sampleGroup,
          groupName: groupName || `Bảng ${groupCode}`,
          players: initialPlayers.length ? initialPlayers.slice(0, MAX_GROUP_PLAYERS) : normalizeGroupPlayers(sampleGroup.players),
        });
      }
    });

    return () => unsub();
  }, [database, dbPath, initialPlayers, groupCode, groupName]);

  const standings = useMemo(
    () => computeStandings(group.players || [], group.results || {}),
    [group.players, group.results]
  );

  const saveGroup = async nextGroup => {
    setGroup(nextGroup);
    if (database) {
      await set(ref(database, dbPath), nextGroup);
    }
  };

  const openResultPopup = (i, j) => {
    if (!adminMode || i === j) return;

    const score = getDisplayScore(group.results, i, j);
    const parsed = parseScore(score);

    setEditingCell({ i, j });
    setScoreA(parsed?.a ?? SETS_TO_WIN);
    setScoreB(parsed?.b ?? 0);
  };

  const saveResult = async () => {
    if (!editingCell) return;

    const { i, j } = editingCell;
    const canonicalKey = getCanonicalKey(i, j);
    const nextResults = { ...(group.results || {}) };

    if (i < j) {
      nextResults[canonicalKey] = `${Number(scoreA)}-${Number(scoreB)}`;
    } else {
      nextResults[canonicalKey] = `${Number(scoreB)}-${Number(scoreA)}`;
    }

    await saveGroup({
      ...group,
      results: nextResults,
    });

    setEditingCell(null);
  };

  const clearResult = async () => {
    if (!editingCell) return;

    const { i, j } = editingCell;
    const canonicalKey = getCanonicalKey(i, j);
    const nextResults = { ...(group.results || {}) };
    delete nextResults[canonicalKey];

    await saveGroup({
      ...group,
      results: nextResults,
    });

    setEditingCell(null);
  };

  const updatePlayer = async (index, value) => {
    if (!adminMode) return;

    const nextPlayers = [...(group.players || [])];
    nextPlayers[index] = value;

    await saveGroup({
      ...group,
      players: nextPlayers,
    });
  };

  const resetGroup = async () => {
    const ok = window.confirm('Xóa toàn bộ kết quả vòng bảng này?');
    if (!ok) return;

    await saveGroup({
      ...group,
      results: {},
    });
  };

  return (
    <div className="rounded-3xl bg-white shadow-2xl overflow-hidden">
      <div className="bg-blue-900 px-4 py-3 text-center text-white">
        <div className="flex items-center justify-center gap-2 text-xl font-black uppercase">
          <Trophy size={20} />
          {group.title || 'Vòng bảng'}
        </div>
        <div className="mt-1 text-sm font-bold text-blue-100">{group.groupName || DEFAULT_GROUP_ID}</div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-slate-50 p-3">
        <div className="text-sm font-bold text-slate-600">
          Ma trận vòng bảng: xanh = thắng, hồng = thua, xám = không thi đấu.
        </div>

        {adminMode && (
          <button
            onClick={resetGroup}
            className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100"
          >
            <RotateCcw size={15} />
            Xóa kết quả
          </button>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-[1100px] w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="border border-slate-900 bg-blue-900 px-2 py-3 text-white">STT</th>
              <th className="border border-slate-900 bg-blue-900 px-3 py-3 text-white min-w-[180px]">TÊN ĐỘI</th>
              {(group.players || []).map((player, index) => (
                <th key={index} className="border border-slate-900 bg-blue-900 px-2 py-3 text-white min-w-[96px]">
                  <div className="line-clamp-2 text-xs font-black uppercase">{player}</div>
                </th>
              ))}
              <th className="border border-slate-900 bg-blue-900 px-3 py-3 text-white min-w-[90px]">TIỀN CÔNG ÍCH</th>
            </tr>
          </thead>

          <tbody>
            {(group.players || []).map((player, row) => (
              <tr key={row}>
                <td className="border border-slate-900 bg-slate-200 px-2 py-2 text-center font-black">{row + 1}</td>
                <td className="border border-slate-900 bg-slate-300 px-3 py-2 font-black">
                  {adminMode ? (
                    <input
                      value={player}
                      onChange={event => updatePlayer(row, event.target.value)}
                      className="w-full rounded border border-slate-300 px-2 py-1 font-black"
                    />
                  ) : (
                    player
                  )}
                </td>

                {(group.players || []).map((_, col) => {
                  const score = getDisplayScore(group.results, row, col);
                  const isDiagonal = row === col;

                  return (
                    <td
                      key={`${row}-${col}`}
                      onClick={() => openResultPopup(row, col)}
                      className={`border border-slate-900 px-2 py-2 text-center transition ${cellClass(score, isDiagonal)} ${
                        adminMode && !isDiagonal ? 'cursor-pointer hover:ring-2 hover:ring-blue-500' : ''
                      }`}
                    >
                      {isDiagonal ? '' : score || ''}
                    </td>
                  );
                })}

                <td className="border border-slate-900 bg-orange-50 px-3 py-2 text-right font-black">
                  {group.notes?.[row] || '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="border-t bg-white p-4">
        <div className="mb-3 text-lg font-black text-slate-800">Bảng xếp hạng tạm tính</div>
        <div className="overflow-x-auto">
          <table className="min-w-[680px] w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="border bg-slate-800 px-3 py-2 text-white">Hạng</th>
                <th className="border bg-slate-800 px-3 py-2 text-left text-white">Đội / VĐV</th>
                <th className="border bg-slate-800 px-3 py-2 text-white">Trận</th>
                <th className="border bg-slate-800 px-3 py-2 text-white">Thắng</th>
                <th className="border bg-slate-800 px-3 py-2 text-white">Thua</th>
                <th className="border bg-slate-800 px-3 py-2 text-white">Set +</th>
                <th className="border bg-slate-800 px-3 py-2 text-white">Set -</th>
                <th className="border bg-slate-800 px-3 py-2 text-white">HS</th>
              </tr>
            </thead>
            <tbody>
              {standings.map((item, index) => (
                <tr key={item.index} className={index < 2 ? 'bg-emerald-50' : 'bg-white'}>
                  <td className="border px-3 py-2 text-center font-black">{index + 1}</td>
                  <td className="border px-3 py-2 font-bold">{item.name}</td>
                  <td className="border px-3 py-2 text-center">{item.played}</td>
                  <td className="border px-3 py-2 text-center font-black text-emerald-700">{item.wins}</td>
                  <td className="border px-3 py-2 text-center text-red-700">{item.losses}</td>
                  <td className="border px-3 py-2 text-center">{item.setFor}</td>
                  <td className="border px-3 py-2 text-center">{item.setAgainst}</td>
                  <td className="border px-3 py-2 text-center font-black">{item.setDiff > 0 ? `+${item.setDiff}` : item.setDiff}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {editingCell && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <div className="text-xl font-black text-slate-900">Nhập kết quả đối đầu</div>
                <div className="mt-1 text-sm font-bold text-slate-500">
                  {group.players?.[editingCell.i]} vs {group.players?.[editingCell.j]}
                </div>
              </div>
              <button onClick={() => setEditingCell(null)} className="rounded-xl border border-slate-300 p-2">
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-[1fr_80px] items-center gap-3">
              <div className="font-black text-slate-800">{group.players?.[editingCell.i]}</div>
              <input
                type="number"
                min="0"
                value={scoreA}
                onChange={event => setScoreA(event.target.value)}
                className="rounded-xl border border-slate-300 px-3 py-3 text-center text-xl font-black"
              />

              <div className="font-black text-slate-800">{group.players?.[editingCell.j]}</div>
              <input
                type="number"
                min="0"
                value={scoreB}
                onChange={event => setScoreB(event.target.value)}
                className="rounded-xl border border-slate-300 px-3 py-3 text-center text-xl font-black"
              />
            </div>

            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button onClick={clearResult} className="rounded-xl border border-red-200 px-4 py-3 font-bold text-red-600 hover:bg-red-50">
                Xóa kết quả
              </button>
              <button onClick={() => setEditingCell(null)} className="rounded-xl border border-slate-300 px-4 py-3 font-bold text-slate-700">
                Hủy
              </button>
              <button onClick={saveResult} className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 font-bold text-white hover:bg-emerald-700">
                <Save size={16} />
                Lưu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
