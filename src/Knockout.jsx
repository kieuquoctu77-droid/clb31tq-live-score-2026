import React, { useEffect, useMemo, useState } from 'react';
import { RotateCcw, Trophy, Medal, CheckCircle2, RefreshCcw } from 'lucide-react';
import { onValue, ref, set } from 'firebase/database';

const GROUP_CODES = ['A', 'B', 'C', 'D', 'E', 'F'];
const SETS_TO_WIN = 3;

function createDefaultKnockoutData(bracketSize = 16) {
  if (Number(bracketSize) === 8) {
    return {
      round16: {},
      quarter: {
        tk1: { title: 'T1', p1: 'H3 còn lại 1', p2: 'Tư bảng A', winner: '', score1: '', score2: '' },
        tk2: { title: 'T2', p1: 'H3 còn lại 2', p2: 'Tư bảng B', winner: '', score1: '', score2: '' },
        tk3: { title: 'T3', p1: 'Tư bảng C', p2: 'Tư bảng D', winner: '', score1: '', score2: '' },
        tk4: { title: 'T4', p1: 'Tư bảng E', p2: 'Tư bảng F', winner: '', score1: '', score2: '' },
      },
      semi: {
        bk1: { title: 'BK1', p1: '', p2: '', winner: '', score1: '', score2: '' },
        bk2: { title: 'BK2', p1: '', p2: '', winner: '', score1: '', score2: '' },
      },
      final: {
        ck: { title: 'CHUNG KẾT', p1: '', p2: '', winner: '', score1: '', score2: '' },
      },
      thirdPlace: {
        p1: '',
        p2: '',
      },
      champion: '',
    };
  }

  return {
    round16: {
      t1: { title: 'T1', p1: 'N bốc thăm 1 - Nhất bảng', p2: 'H3 bốc thăm 1 - Hạng ba', winner: '', score1: '', score2: '' },
      t2: { title: 'T2', p1: 'Nhì bảng A', p2: 'Nhì bảng D', winner: '', score1: '', score2: '' },
      t3: { title: 'T3', p1: 'N bốc thăm 2 - Nhất bảng', p2: 'H3 bốc thăm 2 - Hạng ba', winner: '', score1: '', score2: '' },
      t4: { title: 'T4', p1: 'Nhì bảng B', p2: 'Nhì bảng C', winner: '', score1: '', score2: '' },
      t5: { title: 'T5', p1: 'N bốc thăm 3 - Nhất bảng', p2: 'H3 bốc thăm 3 - Hạng ba', winner: '', score1: '', score2: '' },
      t6: { title: 'T6', p1: 'N còn lại 1 - Nhất bảng', p2: 'Nhì bảng E', winner: '', score1: '', score2: '' },
      t7: { title: 'T7', p1: 'N bốc thăm 4 - Nhất bảng', p2: 'H3 bốc thăm 4 - Hạng ba', winner: '', score1: '', score2: '' },
      t8: { title: 'T8', p1: 'N còn lại 2 - Nhất bảng', p2: 'Nhì bảng F', winner: '', score1: '', score2: '' },
    },
    quarter: {
      tk1: { title: 'TK1', p1: '', p2: '', winner: '', score1: '', score2: '' },
      tk2: { title: 'TK2', p1: '', p2: '', winner: '', score1: '', score2: '' },
      tk3: { title: 'TK3', p1: '', p2: '', winner: '', score1: '', score2: '' },
      tk4: { title: 'TK4', p1: '', p2: '', winner: '', score1: '', score2: '' },
    },
    semi: {
      bk1: { title: 'BK1', p1: '', p2: '', winner: '', score1: '', score2: '' },
      bk2: { title: 'BK2', p1: '', p2: '', winner: '', score1: '', score2: '' },
    },
    final: {
      ck: { title: 'CHUNG KẾT', p1: '', p2: '', winner: '', score1: '', score2: '' },
    },
    thirdPlace: {
      p1: '',
      p2: '',
    },
    champion: '',
  };
}

function classNames(...items) {
  return items.filter(Boolean).join(' ');
}

function cloneData(value) {
  return JSON.parse(JSON.stringify(value));
}

function normalizeMatch(match = {}) {
  return {
    ...match,
    score1: match.score1 ?? '',
    score2: match.score2 ?? '',
    winner: match.winner ?? '',
    p1: match.p1 ?? '',
    p2: match.p2 ?? '',
  };
}

function normalizeRound(round = {}) {
  return Object.fromEntries(Object.entries(round).map(([key, match]) => [key, normalizeMatch(match)]));
}

function prepareKnockoutData(value, bracketSize = 16) {
  const defaultData = createDefaultKnockoutData(bracketSize);
  return {
    ...defaultData,
    ...(value || {}),
    round16: normalizeRound({
      ...defaultData.round16,
      ...(value?.round16 || {}),
    }),
    quarter: normalizeRound({
      ...defaultData.quarter,
      ...(value?.quarter || {}),
    }),
    semi: normalizeRound({
      ...defaultData.semi,
      ...(value?.semi || {}),
    }),
    final: normalizeRound({
      ...defaultData.final,
      ...(value?.final || {}),
    }),
    thirdPlace: {
      ...defaultData.thirdPlace,
      ...(value?.thirdPlace || {}),
    },
    champion: value?.champion || '',
  };
}

function parseScore(value) {
  const text = String(value || '').trim();
  const match = text.match(/^(\d+)\s*-\s*(\d+)$/);
  if (!match) return null;
  return { a: Number(match[1]), b: Number(match[2]) };
}

function computeGroupStandings(players = [], results = {}) {
  const standings = players.map((name, index) => ({
    index,
    name,
    groupCode: '',
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

function getLoser(match, winner) {
  if (!match) return '';
  if (match.p1 === winner) return match.p2 || '';
  if (match.p2 === winner) return match.p1 || '';
  return '';
}

function uniq(list) {
  return Array.from(new Set((list || []).filter(Boolean)));
}

function isPlaceholder(value) {
  const text = String(value || '').toLowerCase();
  return !text || text.includes('bảng') || text.includes('bốc thăm') || text.includes('còn lại') || text.includes('hạng');
}

function getGroupDataMap(groupStageData = {}) {
  const map = {};
  GROUP_CODES.forEach(code => {
    const groupData = groupStageData[`group${code}`] || {};
    const players = Array.isArray(groupData.players) ? groupData.players.filter(Boolean) : [];
    const results = groupData.results || {};
    const standings = computeGroupStandings(players, results).map(item => ({ ...item, groupCode: code }));

    map[code] = {
      players,
      results,
      standings,
      first: standings[0]?.name || '',
      second: standings[1]?.name || '',
      third: standings[2]?.name || '',
      fourth: standings[3]?.name || '',
    };
  });
  return map;
}

function getQualifiedLists(groupMap) {
  const firsts = GROUP_CODES.map(code => groupMap[code]?.first).filter(Boolean);
  const seconds = GROUP_CODES.map(code => groupMap[code]?.second).filter(Boolean);
  const thirds = GROUP_CODES
    .map(code => ({ ...(groupMap[code]?.standings?.[2] || {}), groupCode: code }))
    .filter(item => item.name)
    .sort((a, b) => {
      if (b.wins !== a.wins) return b.wins - a.wins;
      if (b.setDiff !== a.setDiff) return b.setDiff - a.setDiff;
      if (b.setFor !== a.setFor) return b.setFor - a.setFor;
      return a.name.localeCompare(b.name, 'vi');
    });
  const topThirds = thirds.slice(0, 4).map(item => item.name);
  const remainingThirds = thirds.slice(4).map(item => item.name);
  const fourths = GROUP_CODES.map(code => groupMap[code]?.fourth).filter(Boolean);

  return {
    firsts,
    seconds,
    thirds: thirds.map(item => item.name),
    topThirds,
    remainingThirds,
    fourths,
    all: uniq([...firsts, ...seconds, ...thirds.map(item => item.name), ...fourths]),
  };
}

function applyFixedSeeds(data, groupMap, bracketSize) {
  const next = prepareKnockoutData(cloneData(data), bracketSize);

  const setIfSafe = (roundKey, matchId, playerKey, value) => {
    if (!value) return;
    const match = next[roundKey]?.[matchId];
    if (!match) return;
    if (match.winner) return;
    if (isPlaceholder(match[playerKey]) || match[playerKey] === value) {
      match[playerKey] = value;
    }
  };

  if (Number(bracketSize) === 8) {
    setIfSafe('quarter', 'tk1', 'p2', groupMap.A?.fourth);
    setIfSafe('quarter', 'tk2', 'p2', groupMap.B?.fourth);
    setIfSafe('quarter', 'tk3', 'p1', groupMap.C?.fourth);
    setIfSafe('quarter', 'tk3', 'p2', groupMap.D?.fourth);
    setIfSafe('quarter', 'tk4', 'p1', groupMap.E?.fourth);
    setIfSafe('quarter', 'tk4', 'p2', groupMap.F?.fourth);
    return next;
  }

  setIfSafe('round16', 't2', 'p1', groupMap.A?.second);
  setIfSafe('round16', 't2', 'p2', groupMap.D?.second);
  setIfSafe('round16', 't4', 'p1', groupMap.B?.second);
  setIfSafe('round16', 't4', 'p2', groupMap.C?.second);
  setIfSafe('round16', 't6', 'p2', groupMap.E?.second);
  setIfSafe('round16', 't8', 'p2', groupMap.F?.second);

  return next;
}

export default function Knockout({
  database = null,
  adminMode = false,
  dbPath = 'clb31tq/knockout/serieA16',
  title = 'SERIE A',
  bracketSize = 16,
}) {
  const normalizedBracketSize = Number(bracketSize) === 8 ? 8 : 16;
  const defaultData = useMemo(() => createDefaultKnockoutData(normalizedBracketSize), [normalizedBracketSize]);
  const storageKey = useMemo(() => `clb31tq-knockout-${dbPath}`, [dbPath]);
  const [data, setData] = useState(defaultData);
  const [connected, setConnected] = useState(false);
  const [groupStageData, setGroupStageData] = useState({});

  const ROW_HEIGHT_16 = 172;
  const ROW_HEIGHT_8 = 300;

  const groupMap = useMemo(() => getGroupDataMap(groupStageData), [groupStageData]);
  const qualifiedLists = useMemo(() => getQualifiedLists(groupMap), [groupMap]);

  useEffect(() => {
    setData(defaultData);
  }, [defaultData]);

  useEffect(() => {
    if (!database) return;
    const groupRef = ref(database, 'clb31tq/group-stage');
    const unsubscribe = onValue(groupRef, snapshot => {
      setGroupStageData(snapshot.val() || {});
    });
    return () => unsubscribe();
  }, [database]);

  useEffect(() => {
    if (!database) {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        try {
          setData(prepareKnockoutData(JSON.parse(saved), normalizedBracketSize));
        } catch {
          setData(defaultData);
        }
      } else {
        setData(defaultData);
      }
      setConnected(false);
      return;
    }

    const knockoutRef = ref(database, dbPath);
    const unsubscribe = onValue(
      knockoutRef,
      snapshot => {
        const value = snapshot.val();
        if (value) {
          setData(prepareKnockoutData(value, normalizedBracketSize));
        } else {
          set(knockoutRef, defaultData);
          setData(defaultData);
        }
        setConnected(true);
      },
      () => {
        setConnected(false);
      }
    );

    return () => unsubscribe();
  }, [database, dbPath, storageKey, normalizedBracketSize, defaultData]);

  useEffect(() => {
    if (!database) return;
    const seeded = applyFixedSeeds(data, groupMap, normalizedBracketSize);
    if (JSON.stringify(seeded) !== JSON.stringify(data)) {
      saveData(seeded);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [database, groupStageData, normalizedBracketSize]);

  const saveData = async nextData => {
    const payload = prepareKnockoutData(nextData, normalizedBracketSize);
    setData(payload);
    if (database) {
      await set(ref(database, dbPath), payload);
    } else {
      localStorage.setItem(storageKey, JSON.stringify(payload));
    }
  };

  const syncFixedSeedsNow = async () => {
    const next = applyFixedSeeds(data, groupMap, normalizedBracketSize);
    await saveData(next);
  };

  const clearDownstreamIfNeeded = (next, oldWinner) => {
    if (!oldWinner) return;
    Object.keys(next.quarter).forEach(key => {
      const match = next.quarter[key];
      if (match.p1 === oldWinner) match.p1 = '';
      if (match.p2 === oldWinner) match.p2 = '';
      if (match.winner === oldWinner) match.winner = '';
    });
    Object.keys(next.semi).forEach(key => {
      const match = next.semi[key];
      if (match.p1 === oldWinner) match.p1 = '';
      if (match.p2 === oldWinner) match.p2 = '';
      if (match.winner === oldWinner) match.winner = '';
    });
    if (next.final.ck.p1 === oldWinner) next.final.ck.p1 = '';
    if (next.final.ck.p2 === oldWinner) next.final.ck.p2 = '';
    if (next.final.ck.winner === oldWinner) next.final.ck.winner = '';
    if (next.thirdPlace.p1 === oldWinner) next.thirdPlace.p1 = '';
    if (next.thirdPlace.p2 === oldWinner) next.thirdPlace.p2 = '';
    if (next.champion === oldWinner) next.champion = '';
  };

  const pushWinnerForward = (next, matchId, winner, oldWinner) => {
    clearDownstreamIfNeeded(next, oldWinner);
    if (matchId === 't1') next.quarter.tk1.p1 = winner;
    if (matchId === 't2') next.quarter.tk1.p2 = winner;
    if (matchId === 't3') next.quarter.tk2.p1 = winner;
    if (matchId === 't4') next.quarter.tk2.p2 = winner;
    if (matchId === 't5') next.quarter.tk3.p1 = winner;
    if (matchId === 't6') next.quarter.tk3.p2 = winner;
    if (matchId === 't7') next.quarter.tk4.p1 = winner;
    if (matchId === 't8') next.quarter.tk4.p2 = winner;
    if (matchId === 'tk1') next.semi.bk1.p1 = winner;
    if (matchId === 'tk2') next.semi.bk1.p2 = winner;
    if (matchId === 'tk3') next.semi.bk2.p1 = winner;
    if (matchId === 'tk4') next.semi.bk2.p2 = winner;
    if (matchId === 'bk1') {
      next.final.ck.p1 = winner;
      next.thirdPlace.p1 = getLoser(next.semi.bk1, winner);
    }
    if (matchId === 'bk2') {
      next.final.ck.p2 = winner;
      next.thirdPlace.p2 = getLoser(next.semi.bk2, winner);
    }
    if (matchId === 'ck') {
      next.champion = winner;
    }
  };

  const chooseWinner = async (roundKey, matchId, winner) => {
    if (!adminMode) return;
    if (!winner) return;
    const next = prepareKnockoutData(cloneData(data), normalizedBracketSize);
    const match = next[roundKey][matchId];
    const oldWinner = match.winner;
    match.winner = winner;
    pushWinnerForward(next, matchId, winner, oldWinner);
    await saveData(next);
  };

  const updatePlayer = async (roundKey, matchId, playerKey, value) => {
    if (!adminMode) return;
    const next = prepareKnockoutData(cloneData(data), normalizedBracketSize);
    const match = next[roundKey][matchId];
    const oldWinner = match.winner;
    match[playerKey] = value;
    if (match.winner && match.winner !== match.p1 && match.winner !== match.p2) {
      match.winner = '';
      clearDownstreamIfNeeded(next, oldWinner);
    }
    await saveData(next);
  };

  const updateScore = async (roundKey, matchId, scoreKey, value) => {
    if (!adminMode) return;
    const next = prepareKnockoutData(cloneData(data), normalizedBracketSize);
    const match = next[roundKey][matchId];
    const oldWinner = match.winner;
    const cleanedValue = String(value || '').replace(/\D/g, '').slice(0, 2);
    match[scoreKey] = cleanedValue;
    const score1Text = String(match.score1 ?? '').trim();
    const score2Text = String(match.score2 ?? '').trim();
    const hasBothScores = score1Text !== '' && score2Text !== '';
    const score1 = Number(score1Text);
    const score2 = Number(score2Text);
    const canAutoPickWinner = hasBothScores && score1 !== score2 && match.p1 && match.p2;
    if (canAutoPickWinner) {
      const nextWinner = score1 > score2 ? match.p1 : match.p2;
      match.winner = nextWinner;
      pushWinnerForward(next, matchId, nextWinner, oldWinner);
    } else if (oldWinner) {
      match.winner = '';
      clearDownstreamIfNeeded(next, oldWinner);
    }
    await saveData(next);
  };

  const resetKnockout = async () => {
    if (!adminMode) return;
    const confirmReset = window.confirm(`Reset toàn bộ sơ đồ Knock-out ${title}?`);
    if (!confirmReset) return;
    const seeded = applyFixedSeeds(defaultData, groupMap, normalizedBracketSize);
    await saveData(seeded);
  };

  const round16Entries = Object.entries(data.round16);
  const quarterEntries = Object.entries(data.quarter);
  const semiEntries = Object.entries(data.semi);

  return (
    <div className="rounded-3xl bg-white p-4 shadow-2xl sm:p-6">
      <div className="mb-5 flex flex-col gap-3 border-b border-slate-200 pb-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="text-2xl font-black text-red-700 sm:text-3xl">
            🏓 SƠ ĐỒ KNOCK OUT {title} - {normalizedBracketSize} VĐV
          </div>
          <div className="mt-1 text-sm font-bold text-slate-500">
            VĐV có hạng cố định sẽ tự cập nhật từ vòng bảng. Các vị trí bốc thăm chọn bằng dropdown để tránh sai sót.
          </div>
          <div className="mt-1 text-xs font-bold text-slate-400">
            Trạng thái: {connected ? 'Realtime Firebase' : 'Local'}
          </div>
        </div>
        {adminMode && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={syncFixedSeedsNow}
              className="flex items-center justify-center gap-2 rounded-xl border border-blue-300 bg-blue-50 px-4 py-3 font-black text-blue-700 hover:bg-blue-100"
            >
              <RefreshCcw size={17} />
              Cập nhật VĐV từ vòng bảng
            </button>
            <button
              type="button"
              onClick={resetKnockout}
              className="flex items-center justify-center gap-2 rounded-xl border border-red-300 bg-red-50 px-4 py-3 font-black text-red-700 hover:bg-red-100"
            >
              <RotateCcw size={17} />
              Reset Knock-out
            </button>
          </div>
        )}
      </div>

      {normalizedBracketSize === 8 ? (
        <SerieBBracket
          data={data}
          quarterEntries={quarterEntries}
          semiEntries={semiEntries}
          rowHeight={ROW_HEIGHT_8}
          adminMode={adminMode}
          chooseWinner={chooseWinner}
          updatePlayer={updatePlayer}
          updateScore={updateScore}
          playerOptions={qualifiedLists.all}
        />
      ) : (
        <SerieABracket
          data={data}
          round16Entries={round16Entries}
          quarterEntries={quarterEntries}
          semiEntries={semiEntries}
          rowHeight={ROW_HEIGHT_16}
          adminMode={adminMode}
          chooseWinner={chooseWinner}
          updatePlayer={updatePlayer}
          updateScore={updateScore}
          playerOptions={qualifiedLists.all}
        />
      )}

      <div className="mt-5 rounded-2xl bg-slate-100 px-4 py-3 text-sm font-bold text-slate-600">
        {normalizedBracketSize === 8
          ? 'Ghi chú Serie B: hạng tư bảng A-F tự cập nhật từ vòng bảng. Hai vị trí H3 còn lại chọn bằng dropdown.'
          : 'Ghi chú Serie A: các vị trí nhì bảng tự cập nhật. Các vị trí Nhất bảng/Hạng ba cần bốc thăm sẽ chọn bằng dropdown.'}
      </div>
    </div>
  );
}

function SerieABracket({ data, round16Entries, quarterEntries, semiEntries, rowHeight, adminMode, chooseWinner, updatePlayer, updateScore, playerOptions }) {
  return (
    <div className="overflow-x-auto rounded-3xl bg-[#fffdf7] p-4 ring-1 ring-red-100">
      <div className="min-w-[1080px]">
        <div className="mb-4 grid grid-cols-[260px_230px_230px_250px] gap-x-8">
          <RoundTitle color="text-red-800">VÒNG 1/8</RoundTitle>
          <RoundTitle color="text-blue-800">TỨ KẾT</RoundTitle>
          <RoundTitle color="text-emerald-800">BÁN KẾT</RoundTitle>
          <RoundTitle color="text-yellow-700">CHUNG KẾT</RoundTitle>
        </div>
        <div
          className="grid grid-cols-[260px_230px_230px_250px] gap-x-8"
          style={{ gridTemplateRows: `repeat(8, ${rowHeight}px)` }}
        >
          {round16Entries.map(([id, match], index) => (
            <div key={id} className="relative flex items-center" style={{ gridColumn: 1, gridRow: index + 1 }}>
              <VerticalMatchCard
                roundKey="round16"
                matchId={id}
                match={match}
                adminMode={adminMode}
                onWinner={chooseWinner}
                onUpdatePlayer={updatePlayer}
                onUpdateScore={updateScore}
                playerOptions={playerOptions}
                size="small"
              />
              <RightConnector />
            </div>
          ))}
          {quarterEntries.map(([id, match], index) => (
            <div key={id} className="relative flex items-center" style={{ gridColumn: 2, gridRow: `${index * 2 + 1} / span 2` }}>
              <LeftMergeConnector />
              <VerticalMatchCard
                roundKey="quarter"
                matchId={id}
                match={match}
                adminMode={adminMode}
                onWinner={chooseWinner}
                onUpdatePlayer={updatePlayer}
                onUpdateScore={updateScore}
                playerOptions={playerOptions}
                color="blue"
              />
              <RightConnector />
            </div>
          ))}
          {semiEntries.map(([id, match], index) => (
            <div key={id} className="relative flex items-center" style={{ gridColumn: 3, gridRow: `${index * 4 + 1} / span 4` }}>
              <LeftMergeConnector />
              <VerticalMatchCard
                roundKey="semi"
                matchId={id}
                match={match}
                adminMode={adminMode}
                onWinner={chooseWinner}
                onUpdatePlayer={updatePlayer}
                onUpdateScore={updateScore}
                playerOptions={playerOptions}
                color="emerald"
              />
              <RightConnector />
            </div>
          ))}
          <div className="relative flex items-center" style={{ gridColumn: 4, gridRow: '1 / span 8' }}>
            <LeftMergeConnector />
            <div className="w-full">
              <VerticalMatchCard
                roundKey="final"
                matchId="ck"
                match={data.final.ck}
                adminMode={adminMode}
                onWinner={chooseWinner}
                onUpdatePlayer={updatePlayer}
                onUpdateScore={updateScore}
                playerOptions={playerOptions}
                color="yellow"
                finalMatch
              />
              <ChampionBox champion={data.champion} />
              <ThirdPlaceBox thirdPlace={data.thirdPlace} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SerieBBracket({ data, quarterEntries, semiEntries, rowHeight, adminMode, chooseWinner, updatePlayer, updateScore, playerOptions }) {
  return (
    <div className="overflow-x-auto rounded-3xl bg-[#fffdf7] p-4 ring-1 ring-emerald-100">
      <div className="min-w-[980px]">
        <div className="mb-4 grid grid-cols-[280px_260px_280px] gap-x-12">
          <RoundTitle color="text-emerald-800">TỨ KẾT</RoundTitle>
          <RoundTitle color="text-emerald-800">BÁN KẾT</RoundTitle>
          <RoundTitle color="text-yellow-700">CHUNG KẾT</RoundTitle>
        </div>
        <div className="grid grid-cols-[280px_260px_280px] gap-x-12" style={{ gridTemplateRows: `repeat(4, ${rowHeight}px)` }}>
          {quarterEntries.map(([id, match], index) => (
            <div key={id} className="relative flex items-center" style={{ gridColumn: 1, gridRow: index + 1 }}>
              <VerticalMatchCard
                roundKey="quarter"
                matchId={id}
                match={match}
                adminMode={adminMode}
                onWinner={chooseWinner}
                onUpdatePlayer={updatePlayer}
                onUpdateScore={updateScore}
                playerOptions={playerOptions}
                color="green"
              />
              <RightConnector />
            </div>
          ))}
          {semiEntries.map(([id, match], index) => (
            <div key={id} className="relative flex items-center" style={{ gridColumn: 2, gridRow: `${index * 2 + 1} / span 2` }}>
              <LeftMergeConnector />
              <VerticalMatchCard
                roundKey="semi"
                matchId={id}
                match={match}
                adminMode={adminMode}
                onWinner={chooseWinner}
                onUpdatePlayer={updatePlayer}
                onUpdateScore={updateScore}
                playerOptions={playerOptions}
                color="emerald"
              />
              <RightConnector />
            </div>
          ))}
          <div className="relative flex items-center" style={{ gridColumn: 3, gridRow: '1 / span 4' }}>
            <LeftMergeConnector />
            <div className="w-full">
              <VerticalMatchCard
                roundKey="final"
                matchId="ck"
                match={data.final.ck}
                adminMode={adminMode}
                onWinner={chooseWinner}
                onUpdatePlayer={updatePlayer}
                onUpdateScore={updateScore}
                playerOptions={playerOptions}
                color="yellow"
                finalMatch
              />
              <ChampionBox champion={data.champion} />
              <ThirdPlaceBox thirdPlace={data.thirdPlace} compact />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function RoundTitle({ children, color }) {
  return <div className={classNames('text-center text-xl font-black uppercase tracking-wide', color)}>{children}</div>;
}

function RightConnector() {
  return <div className="absolute right-[-48px] top-1/2 h-[2px] w-12 bg-slate-400" />;
}

function LeftMergeConnector() {
  return (
    <>
      <div className="absolute left-[-48px] top-[25%] h-[2px] w-12 bg-slate-300" />
      <div className="absolute left-[-48px] top-[75%] h-[2px] w-12 bg-slate-300" />
      <div className="absolute left-[-48px] top-[25%] h-1/2 w-[2px] bg-slate-300" />
      <div className="absolute left-[-48px] top-1/2 h-[2px] w-12 bg-slate-400" />
    </>
  );
}

function getMatchColor(matchId, color) {
  if (color === 'blue') return 'bg-blue-700';
  if (color === 'emerald') return 'bg-emerald-700';
  if (color === 'green') return 'bg-green-700';
  if (color === 'yellow') return 'bg-yellow-600';
  if (matchId === 't2' || matchId === 't4' || matchId === 't6' || matchId === 't8') return 'bg-blue-800';
  return 'bg-red-700';
}

function VerticalMatchCard({
  roundKey,
  matchId,
  match,
  adminMode,
  onWinner,
  onUpdatePlayer,
  onUpdateScore,
  playerOptions = [],
  color = 'red',
  finalMatch = false,
  size = 'normal',
}) {
  const titleColor = getMatchColor(matchId, color);
  const selectOptions = uniq([match.p1, match.p2, ...playerOptions]);

  return (
    <div
      className={classNames(
        'relative z-10 w-full rounded-2xl border-2 bg-white shadow-md transition-all',
        size === 'small' ? 'min-h-[150px] p-2' : 'min-h-[220px] p-3',
        match.winner ? 'border-emerald-400' : 'border-slate-200',
        finalMatch && 'border-yellow-400 bg-yellow-50 ring-2 ring-yellow-200'
      )}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className={classNames('rounded-xl px-3 py-1 text-sm font-black text-white shadow-sm', titleColor)}>{match.title}</div>
        {match.winner && (
          <div className="flex items-center gap-1 text-[11px] font-black text-emerald-700">
            <CheckCircle2 size={13} />
            Thắng
          </div>
        )}
      </div>
      <div className="space-y-1.5">
        <PlayerRow
          value={match.p1}
          selected={match.winner === match.p1}
          onChange={value => onUpdatePlayer(roundKey, matchId, 'p1', value)}
          adminMode={adminMode}
          placeholder="VĐV 1"
          compact={size === 'small'}
          options={selectOptions}
        />
        <ScoreInputRow
          score1={match.score1}
          score2={match.score2}
          winner={match.winner}
          p1={match.p1}
          p2={match.p2}
          adminMode={adminMode}
          compact={size === 'small'}
          onScore1Change={value => onUpdateScore(roundKey, matchId, 'score1', value)}
          onScore2Change={value => onUpdateScore(roundKey, matchId, 'score2', value)}
        />
        <PlayerRow
          value={match.p2}
          selected={match.winner === match.p2}
          onChange={value => onUpdatePlayer(roundKey, matchId, 'p2', value)}
          adminMode={adminMode}
          placeholder="VĐV 2"
          compact={size === 'small'}
          options={selectOptions}
        />
      </div>
    </div>
  );
}

function PlayerRow({ value, selected, onChange, adminMode, placeholder, compact = false, options = [] }) {
  return (
    <div
      className={classNames(
        'rounded-xl border transition-all',
        compact ? 'px-2 py-1.5' : 'px-2.5 py-2',
        selected ? 'border-emerald-700 bg-emerald-600 text-white shadow-md' : 'border-slate-200 bg-white text-slate-900'
      )}
    >
      {adminMode ? (
        <select
          value={value || ''}
          onChange={e => onChange(e.target.value)}
          className={classNames(
            'w-full rounded-lg bg-transparent font-black outline-none',
            compact ? 'text-xs' : 'text-sm',
            selected ? 'text-white' : 'text-slate-900'
          )}
        >
          <option value="">{placeholder}</option>
          {options.map(option => (
            <option key={option} value={option} className="text-slate-900">
              {option}
            </option>
          ))}
        </select>
      ) : (
        <div className={classNames('truncate font-black', compact ? 'text-xs' : 'text-sm')}>{value || '-'}</div>
      )}
    </div>
  );
}

function ScoreInputRow({ score1, score2, winner, p1, p2, adminMode, compact = false, onScore1Change, onScore2Change }) {
  const hasScore1 = String(score1 ?? '').trim() !== '';
  const hasScore2 = String(score2 ?? '').trim() !== '';
  const p1Won = winner && winner === p1;
  const p2Won = winner && winner === p2;
  const scoreBoxClass = isWinner =>
    classNames(
      'rounded-xl border text-center font-black outline-none transition-all',
      compact ? 'h-8 w-11 text-sm' : 'h-9 w-12 text-base',
      isWinner
        ? 'border-emerald-300 bg-gradient-to-r from-emerald-500 to-emerald-700 text-white shadow placeholder:text-emerald-100'
        : 'border-slate-300 bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:bg-white'
    );
  const scoreBadgeClass = isWinner =>
    classNames(
      'min-w-[42px] rounded-xl px-3 py-1 text-center font-black',
      compact ? 'text-sm' : 'text-base',
      isWinner ? 'bg-gradient-to-r from-emerald-500 to-emerald-700 text-white shadow' : 'bg-slate-100 text-slate-700'
    );

  return (
    <div className="flex items-center justify-center gap-2 rounded-xl bg-slate-100 px-2 py-2">
      {adminMode ? (
        <>
          <input
            type="text"
            inputMode="numeric"
            maxLength={2}
            value={score1 ?? ''}
            onChange={e => onScore1Change(e.target.value)}
            placeholder="0"
            title="Điểm VĐV 1"
            className={scoreBoxClass(p1Won)}
          />
          <div className="text-base font-black text-slate-500">-</div>
          <input
            type="text"
            inputMode="numeric"
            maxLength={2}
            value={score2 ?? ''}
            onChange={e => onScore2Change(e.target.value)}
            placeholder="0"
            title="Điểm VĐV 2"
            className={scoreBoxClass(p2Won)}
          />
        </>
      ) : (
        <>
          <div className={scoreBadgeClass(p1Won)}>{hasScore1 ? score1 : '-'}</div>
          <div className="text-base font-black text-slate-500">-</div>
          <div className={scoreBadgeClass(p2Won)}>{hasScore2 ? score2 : '-'}</div>
        </>
      )}
    </div>
  );
}

function ChampionBox({ champion }) {
  if (!champion) {
    return (
      <div className="mt-4 rounded-2xl border-2 border-dashed border-yellow-300 bg-yellow-50 p-4 text-center">
        <Trophy className="mx-auto mb-2 text-yellow-500" size={36} />
        <div className="text-base font-black text-yellow-700">Chưa có nhà vô địch</div>
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-2xl bg-gradient-to-r from-yellow-300 via-yellow-400 to-yellow-500 p-4 text-center shadow-xl ring-4 ring-yellow-300">
      <Trophy className="mx-auto mb-2 text-yellow-900" size={40} />
      <div className="text-xs font-black uppercase text-yellow-900">Nhà vô địch</div>
      <div className="mt-1 text-xl font-black text-slate-950">{champion}</div>
    </div>
  );
}

function ThirdPlaceBox({ thirdPlace, compact = false }) {
  return (
    <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 p-3">
      <div className="mb-2 flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-3 py-2 text-center text-sm font-black text-white">
        <Medal size={16} />
        ĐỒNG HẠNG 3
      </div>
      <div className={classNames('space-y-1.5 text-center font-black text-slate-800', compact ? 'text-xs' : 'text-xs')}>
        <div>Thua BK1: {thirdPlace.p1 || '-'}</div>
        <div>Thua BK2: {thirdPlace.p2 || '-'}</div>
      </div>
    </div>
  );
}
