import React, { useEffect, useMemo, useState } from 'react';
import { onValue, ref, set } from 'firebase/database';
import { Save, X, RotateCcw } from 'lucide-react';

const DEFAULT_GROUP_ID = 'groupA';
const SETS_TO_WIN = 3;
const MAX_GROUP_PLAYERS = 4;

const sampleGroup = {
  groupName: 'Bảng A',
  players: ['ĐÌNH - NHÂN', 'THANH - KỲ', 'TRUNG (H) - NHƠ', 'LINH - HÂN'],
  results: {},
};

function normalizeGroupPlayers(players) {
  const list = Array.isArray(players) ? players : [];
  return list.slice(0, MAX_GROUP_PLAYERS);
}

function parseScore(value) {
  if (value && typeof value === 'object') {
    const rawA = value.scoreA ?? value.setA ?? value.a;
    const rawB = value.scoreB ?? value.setB ?? value.b;
    const a = Number(rawA);
    const b = Number(rawB);

    if (Number.isFinite(a) && Number.isFinite(b)) {
      return { a, b };
    }
  }

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

function formatScore(value) {
  const parsed = parseScore(value);
  if (!parsed) return '';
  return `${parsed.a}-${parsed.b}`;
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
  if (direct) return formatScore(direct);

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
    h2hWins: 0,
    h2hSetDiff: 0,
    needsDraw: false,
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

  const withDiff = standings.map(item => ({
    ...item,
    setDiff: item.setFor - item.setAgainst,
  }));

  const groupsByWinsAndDiff = withDiff.reduce((acc, item) => {
    const key = `${item.wins}|${item.setDiff}`;
    acc[key] = acc[key] || [];
    acc[key].push(item);
    return acc;
  }, {});

  return Object.values(groupsByWinsAndDiff)
    .sort((a, b) => {
      if ((b[0]?.wins || 0) !== (a[0]?.wins || 0)) return (b[0]?.wins || 0) - (a[0]?.wins || 0);
      return (b[0]?.setDiff || 0) - (a[0]?.setDiff || 0);
    })
    .flatMap(group => {
      if (group.length === 1) return group;

      const indexSet = new Set(group.map(item => item.index));
      const mini = group.reduce((acc, item) => {
        acc[item.index] = { h2hWins: 0, h2hSetFor: 0, h2hSetAgainst: 0 };
        return acc;
      }, {});

      Object.entries(results || {}).forEach(([key, value]) => {
        const parsed = parseScore(value);
        if (!parsed) return;
        const [i, j] = key.split('-').map(Number);
        if (!indexSet.has(i) || !indexSet.has(j)) return;

        mini[i].h2hSetFor += parsed.a;
        mini[i].h2hSetAgainst += parsed.b;
        mini[j].h2hSetFor += parsed.b;
        mini[j].h2hSetAgainst += parsed.a;
        if (parsed.a > parsed.b) mini[i].h2hWins += 1;
        if (parsed.b > parsed.a) mini[j].h2hWins += 1;
      });

      const enriched = group.map(item => {
        const h2h = mini[item.index] || {};
        return {
          ...item,
          h2hWins: h2h.h2hWins || 0,
          h2hSetDiff: (h2h.h2hSetFor || 0) - (h2h.h2hSetAgainst || 0),
        };
      });

      return enriched
        .map(item => ({
          ...item,
          needsDraw: enriched.some(other =>
            other.index !== item.index &&
            other.h2hWins === item.h2hWins &&
            other.h2hSetDiff === item.h2hSetDiff
          ),
        }))
        .sort((a, b) => {
          if (b.h2hWins !== a.h2hWins) return b.h2hWins - a.h2hWins;
          if (b.h2hSetDiff !== a.h2hSetDiff) return b.h2hSetDiff - a.h2hSetDiff;
          return a.name.localeCompare(b.name, 'vi');
        });
    });
}

function applyManualSecondPlace(standings = [], manualSecondPlace = '') {
  const selected = String(manualSecondPlace || '').trim();
  if (!selected) return standings;
  const selectedIndex = standings.findIndex(item => item.name === selected);
  if (selectedIndex < 0 || selectedIndex === 1) return standings;
  const next = [...standings];
  const [selectedItem] = next.splice(selectedIndex, 1);
  next.splice(1, 0, { ...selectedItem, manualSecondSelected: true });
  return next;
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
    players: initialPlayers.length
      ? initialPlayers.slice(0, MAX_GROUP_PLAYERS)
      : normalizeGroupPlayers(sampleGroup.players),
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
        });
      } else {
        set(groupRef, {
          ...sampleGroup,
          groupName: groupName || `Bảng ${groupCode}`,
          players: initialPlayers.length
            ? initialPlayers.slice(0, MAX_GROUP_PLAYERS)
            : normalizeGroupPlayers(sampleGroup.players),
        });
      }
    });

    return () => unsub();
  }, [database, dbPath, initialPlayers, groupCode, groupName]);

  const standings = useMemo(
    () => applyManualSecondPlace(computeStandings(group.players || [], group.results || {}), group.manualSecondPlace || ''),
    [group.players, group.results, group.manualSecondPlace]
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
      players: normalizeGroupPlayers(nextPlayers),
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
    <div className="overflow-hidden rounded-3xl bg-white shadow-2xl">
      <div className="bg-blue-900 px-4 py-3 text-center text-white">
        <div className="text-center text-2xl font-black text-white">
          {group.groupName || DEFAULT_GROUP_ID}
        </div>
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
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="w-[48px] border border-slate-900 bg-blue-900 px-1 py-2 text-white">
                STT
              </th>
              <th className="w-[160px] border border-slate-900 bg-blue-900 px-2 py-2 text-white">
                VĐV
              </th>
              {(group.players || []).map((player, index) => (
                <th
                  key={index}
                  className="w-[80px] border border-slate-900 bg-blue-900 px-1 py-2 text-white"
                >
                  <div className="text-[11px] font-black uppercase leading-4">
                    {player}
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {(group.players || []).map((player, row) => (
              <tr key={row}>
                <td className="border border-slate-900 bg-slate-200 px-1 py-2 text-center font-black">
                  {row + 1}
                </td>
                <td className="border border-slate-900 bg-slate-300 px-2 py-2 font-black">
                  {adminMode ? (
                    <input
                      value={player}
                      onChange={event => updatePlayer(row, event.target.value)}
                      className="w-full rounded border border-slate-300 px-2 py-1 text-sm font-black"
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
                <th className="border bg-slate-800 px-3 py-2 text-left text-white">VĐV</th>
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
                  <td className="border px-3 py-2 font-bold">
                    <div className="flex flex-col gap-1">
                      <span>{item.name}</span>
                      {item.manualSecondSelected && (
                        <span className="w-fit rounded-lg bg-amber-100 px-2 py-0.5 text-[11px] font-black text-amber-800">
                          Hạng nhì do BTC bốc thăm
                        </span>
                      )}
                      {item.needsDraw && !item.manualSecondSelected && (
                        <span className="w-fit rounded-lg bg-yellow-100 px-2 py-0.5 text-[11px] font-black text-yellow-800">
                          Cần bốc thăm nếu tranh hạng
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="border px-3 py-2 text-center">{item.played}</td>
                  <td className="border px-3 py-2 text-center font-black text-emerald-700">{item.wins}</td>
                  <td className="border px-3 py-2 text-center text-red-700">{item.losses}</td>
                  <td className="border px-3 py-2 text-center">{item.setFor}</td>
                  <td className="border px-3 py-2 text-center">{item.setAgainst}</td>
                  <td className="border px-3 py-2 text-center font-black">
                    {item.setDiff > 0 ? `+${item.setDiff}` : item.setDiff}
                  </td>
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
