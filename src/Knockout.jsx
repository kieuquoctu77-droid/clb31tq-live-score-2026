import React, { useEffect, useMemo, useState } from 'react';
import { RotateCcw, Trophy, Medal, CheckCircle2 } from 'lucide-react';
import { onValue, ref, set } from 'firebase/database';

function createDefaultKnockoutData(bracketSize = 16) {
  if (Number(bracketSize) === 8) {
    return {
      round16: {},
      quarter: {
        tk1: { title: 'T1', p1: 'H3 còn lại 1', p2: 'Tư bảng A', winner: '' },
        tk2: { title: 'T2', p1: 'H3 còn lại 2', p2: 'Tư bảng B', winner: '' },
        tk3: { title: 'T3', p1: 'Tư bảng C', p2: 'Tư bảng D', winner: '' },
        tk4: { title: 'T4', p1: 'Tư bảng E', p2: 'Tư bảng F', winner: '' },
      },
      semi: {
        bk1: { title: 'BK1', p1: '', p2: '', winner: '' },
        bk2: { title: 'BK2', p1: '', p2: '', winner: '' },
      },
      final: {
        ck: { title: 'CHUNG KẾT', p1: '', p2: '', winner: '' },
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
      t1: { title: 'T1', p1: 'N bốc thăm 1 - Nhất bảng', p2: 'H3 bốc thăm 1 - Hạng ba', winner: '' },
      t2: { title: 'T2', p1: 'Nhì bảng A', p2: 'Nhì bảng D', winner: '' },
      t3: { title: 'T3', p1: 'N bốc thăm 2 - Nhất bảng', p2: 'H3 bốc thăm 2 - Hạng ba', winner: '' },
      t4: { title: 'T4', p1: 'Nhì bảng B', p2: 'Nhì bảng C', winner: '' },
      t5: { title: 'T5', p1: 'N bốc thăm 3 - Nhất bảng', p2: 'H3 bốc thăm 3 - Hạng ba', winner: '' },
      t6: { title: 'T6', p1: 'N còn lại 1 - Nhất bảng', p2: 'Nhì bảng E', winner: '' },
      t7: { title: 'T7', p1: 'N bốc thăm 4 - Nhất bảng', p2: 'H3 bốc thăm 4 - Hạng ba', winner: '' },
      t8: { title: 'T8', p1: 'N còn lại 2 - Nhất bảng', p2: 'Nhì bảng F', winner: '' },
    },
    quarter: {
      tk1: { title: 'TK1', p1: '', p2: '', winner: '' },
      tk2: { title: 'TK2', p1: '', p2: '', winner: '' },
      tk3: { title: 'TK3', p1: '', p2: '', winner: '' },
      tk4: { title: 'TK4', p1: '', p2: '', winner: '' },
    },
    semi: {
      bk1: { title: 'BK1', p1: '', p2: '', winner: '' },
      bk2: { title: 'BK2', p1: '', p2: '', winner: '' },
    },
    final: {
      ck: { title: 'CHUNG KẾT', p1: '', p2: '', winner: '' },
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

function getLoser(match, winner) {
  if (!match) return '';
  if (match.p1 === winner) return match.p2 || '';
  if (match.p2 === winner) return match.p1 || '';
  return '';
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
  const ROW_HEIGHT_16 = 172;
  const ROW_HEIGHT_8 = 172;

  useEffect(() => {
    setData(defaultData);
  }, [defaultData]);

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

  const saveData = async nextData => {
    const payload = prepareKnockoutData(nextData, normalizedBracketSize);
    setData(payload);
    if (database) {
      await set(ref(database, dbPath), payload);
    } else {
      localStorage.setItem(storageKey, JSON.stringify(payload));
    }
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
    const cleanedValue = String(value || '').replace(/\D/g, '').slice(0, 2);
    match[scoreKey] = cleanedValue;
    await saveData(next);
  };

  const resetKnockout = async () => {
    if (!adminMode) return;
    const confirmReset = window.confirm(`Reset toàn bộ sơ đồ Knock-out ${title}?`);
    if (!confirmReset) return;
    await saveData(defaultData);
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
            Bấm “Thắng” để tự động đẩy VĐV lên nhánh tiếp theo.
          </div>
          <div className="mt-1 text-xs font-bold text-slate-400">
            Trạng thái: {connected ? 'Realtime Firebase' : 'Local'}
          </div>
        </div>

        {adminMode && (
          <button
            type="button"
            onClick={resetKnockout}
            className="flex items-center justify-center gap-2 rounded-xl border border-red-300 bg-red-50 px-4 py-3 font-black text-red-700 hover:bg-red-100"
          >
            <RotateCcw size={17} />
            Reset Knock-out
          </button>
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
        />
      )}

      <div className="mt-5 rounded-2xl bg-slate-100 px-4 py-3 text-sm font-bold text-slate-600">
        {normalizedBracketSize === 8
          ? 'Ghi chú Serie B: gồm 2 VĐV hạng 3 còn lại và 6 VĐV hạng tư bảng A đến F. Thua BK1 và thua BK2 đồng hạng 3.'
          : 'Ghi chú Serie A: N = VĐV nhất bảng theo thứ tự bốc thăm. H3 = VĐV hạng ba xuất sắc theo thứ tự bốc thăm.'}
      </div>
    </div>
  );
}

function SerieABracket({ data, round16Entries, quarterEntries, semiEntries, rowHeight, adminMode, chooseWinner, updatePlayer, updateScore }) {
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
            <div
              key={id}
              className="relative flex items-center"
              style={{ gridColumn: 1, gridRow: index + 1 }}
            >
              <VerticalMatchCard
                roundKey="round16"
                matchId={id}
                match={match}
                adminMode={adminMode}
                onWinner={chooseWinner}
                onUpdatePlayer={updatePlayer}
                onUpdateScore={updateScore}
                size="small"
              />
              <RightConnector />
            </div>
          ))}

          {quarterEntries.map(([id, match], index) => (
            <div
              key={id}
              className="relative flex items-center"
              style={{ gridColumn: 2, gridRow: `${index * 2 + 1} / span 2` }}
            >
              <LeftMergeConnector />
              <VerticalMatchCard
                roundKey="quarter"
                matchId={id}
                match={match}
                adminMode={adminMode}
                onWinner={chooseWinner}
                onUpdatePlayer={updatePlayer}
                onUpdateScore={updateScore}
                color="blue"
              />
              <RightConnector />
            </div>
          ))}

          {semiEntries.map(([id, match], index) => (
            <div
              key={id}
              className="relative flex items-center"
              style={{ gridColumn: 3, gridRow: `${index * 4 + 1} / span 4` }}
            >
              <LeftMergeConnector />
              <VerticalMatchCard
                roundKey="semi"
                matchId={id}
                match={match}
                adminMode={adminMode}
                onWinner={chooseWinner}
                onUpdatePlayer={updatePlayer}
                onUpdateScore={updateScore}
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

function SerieBBracket({ data, quarterEntries, semiEntries, rowHeight, adminMode, chooseWinner, updatePlayer, updateScore }) {
  return (
    <div className="overflow-x-auto rounded-3xl bg-[#fffdf7] p-4 ring-1 ring-emerald-100">
      <div className="min-w-[820px]">
        <div className="mb-4 grid grid-cols-[260px_230px_250px] gap-x-8">
          <RoundTitle color="text-emerald-800">TỨ KẾT</RoundTitle>
          <RoundTitle color="text-emerald-800">BÁN KẾT</RoundTitle>
          <RoundTitle color="text-yellow-700">CHUNG KẾT</RoundTitle>
        </div>

        <div
          className="grid grid-cols-[260px_230px_250px] gap-x-8"
          style={{ gridTemplateRows: `repeat(4, ${rowHeight}px)` }}
        >
          {quarterEntries.map(([id, match], index) => (
            <div
              key={id}
              className="relative flex items-center"
              style={{ gridColumn: 1, gridRow: index + 1 }}
            >
              <VerticalMatchCard
                roundKey="quarter"
                matchId={id}
                match={match}
                adminMode={adminMode}
                onWinner={chooseWinner}
                onUpdatePlayer={updatePlayer}
                onUpdateScore={updateScore}
                color="green"
              />
              <RightConnector />
            </div>
          ))}

          {semiEntries.map(([id, match], index) => (
            <div
              key={id}
              className="relative flex items-center"
              style={{ gridColumn: 2, gridRow: `${index * 2 + 1} / span 2` }}
            >
              <LeftMergeConnector />
              <VerticalMatchCard
                roundKey="semi"
                matchId={id}
                match={match}
                adminMode={adminMode}
                onWinner={chooseWinner}
                onUpdatePlayer={updatePlayer}
                onUpdateScore={updateScore}
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
  return (
    <div className={classNames('text-center text-xl font-black uppercase tracking-wide', color)}>
      {children}
    </div>
  );
}

function RightConnector() {
  return <div className="absolute right-[-32px] top-1/2 h-[2px] w-8 bg-slate-400" />;
}

function LeftMergeConnector() {
  return (
    <>
      <div className="absolute left-[-32px] top-[25%] h-[2px] w-8 bg-slate-300" />
      <div className="absolute left-[-32px] top-[75%] h-[2px] w-8 bg-slate-300" />
      <div className="absolute left-[-32px] top-[25%] h-1/2 w-[2px] bg-slate-300" />
      <div className="absolute left-[-32px] top-1/2 h-[2px] w-8 bg-slate-400" />
    </>
  );
}

function getMatchColor(matchId, color) {
  if (color === 'blue') return 'bg-blue-700';
  if (color === 'emerald') return 'bg-emerald-700';
  if (color === 'green') return 'bg-green-700';
  if (color === 'yellow') return 'bg-yellow-600';
  if (matchId === 't2' || matchId === 't4' || matchId === 't6' || matchId === 't8') {
    return 'bg-blue-800';
  }
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
  color = 'red',
  finalMatch = false,
  size = 'normal',
}) {
  const titleColor = getMatchColor(matchId, color);

  return (
    <div
      className={classNames(
        'relative z-10 w-full rounded-2xl border-2 bg-white shadow-md transition-all',
        size === 'small' ? 'p-2' : 'p-3',
        match.winner ? 'border-emerald-400' : 'border-slate-200',
        finalMatch && 'border-yellow-400 bg-yellow-50 ring-2 ring-yellow-200'
      )}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className={classNames('rounded-xl px-3 py-1 text-sm font-black text-white shadow-sm', titleColor)}>
          {match.title}
        </div>
        {match.winner && (
          <div className="flex items-center gap-1 text-[11px] font-black text-emerald-700">
            <CheckCircle2 size={13} />
            Đã chọn
          </div>
        )}
      </div>

      <div className="space-y-1.5">
        <PlayerRow
          value={match.p1}
          selected={match.winner === match.p1}
          disabled={!String(match.p1 || '').trim() || !adminMode}
          onClick={() => onWinner(roundKey, matchId, match.p1)}
          onChange={value => onUpdatePlayer(roundKey, matchId, 'p1', value)}
          score={match.score1}
          onScoreChange={value => onUpdateScore(roundKey, matchId, 'score1', value)}
          adminMode={adminMode}
          placeholder="VĐV 1"
          compact={size === 'small'}
        />
        <PlayerRow
          value={match.p2}
          selected={match.winner === match.p2}
          disabled={!String(match.p2 || '').trim() || !adminMode}
          onClick={() => onWinner(roundKey, matchId, match.p2)}
          onChange={value => onUpdatePlayer(roundKey, matchId, 'p2', value)}
          score={match.score2}
          onScoreChange={value => onUpdateScore(roundKey, matchId, 'score2', value)}
          adminMode={adminMode}
          placeholder="VĐV 2"
          compact={size === 'small'}
        />
      </div>
    </div>
  );
}

function PlayerRow({
  value,
  selected,
  disabled,
  onClick,
  onChange,
  score,
  onScoreChange,
  adminMode,
  placeholder,
  compact = false,
}) {
  const hasScore = String(score ?? '').trim() !== '';

  return (
    <div
      className={classNames(
        'rounded-xl border transition-all',
        compact ? 'px-2 py-1' : 'px-2.5 py-1.5',
        selected ? 'border-emerald-700 bg-emerald-600 text-white shadow-md' : 'border-slate-200 bg-white text-slate-900'
      )}
    >
      {adminMode ? (
        <div className="flex items-center gap-2">
          <input
            value={value || ''}
            onChange={e => onChange(e.target.value)}
            placeholder={placeholder}
            className={classNames(
              'min-w-0 flex-1 bg-transparent font-black outline-none',
              compact ? 'text-xs' : 'text-sm',
              selected ? 'text-white placeholder:text-emerald-100' : 'text-slate-900 placeholder:text-slate-400'
            )}
          />
          <input
            type="text"
            inputMode="numeric"
            maxLength={2}
            value={score ?? ''}
            onChange={e => onScoreChange(e.target.value)}
            placeholder="0"
            title="Nhập số set thắng, ví dụ 3"
            className={classNames(
              'h-8 w-10 shrink-0 rounded-lg border text-center text-sm font-black outline-none',
              selected
                ? 'border-emerald-300 bg-gradient-to-r from-emerald-500 to-emerald-700 text-white shadow placeholder:text-emerald-100'
                : 'border-slate-300 bg-slate-50 text-slate-900 placeholder:text-slate-400'
            )}
          />
          <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className={classNames(
              'shrink-0 rounded-lg px-2 py-0.5 text-[11px] font-black',
              selected
                ? 'bg-white text-emerald-700'
                : disabled
                ? 'bg-slate-200 text-slate-400'
                : 'bg-emerald-600 text-white hover:bg-emerald-700'
            )}
          >
            Thắng
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-2">
          <div className={classNames('min-w-0 flex-1 truncate font-black', compact ? 'text-xs' : 'text-sm')}>
            {value || '-'}
          </div>
          <div
            className={classNames(
              'shrink-0 rounded-lg px-2 py-0.5 text-center text-xs font-black',
              selected
                ? 'bg-gradient-to-r from-emerald-500 to-emerald-700 text-white shadow'
                : hasScore
                ? 'bg-slate-100 text-slate-700'
                : 'bg-slate-50 text-slate-400'
            )}
          >
            {hasScore ? score : '-'}
          </div>
        </div>
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
