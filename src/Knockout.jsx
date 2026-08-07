
export default function Knockout({
  database = null,
  adminMode = false,
  dbPath = 'clb31tq/knockout/serieA16',
}) {

import React, { useEffect, useState } from 'react';
import { RotateCcw, Trophy, Medal, CheckCircle2 } from 'lucide-react';
import { onValue, ref, set } from 'firebase/database';

const defaultKnockoutData = {
  round16: {
    t1: {
      title: 'T1',
      p1: 'N bốc thăm 1 - Nhất bảng',
      p2: 'H3 bốc thăm 1 - Hạng ba',
      winner: '',
    },
    t2: {
      title: 'T2',
      p1: 'Nhì bảng A',
      p2: 'Nhì bảng D',
      winner: '',
    },
    t3: {
      title: 'T3',
      p1: 'N bốc thăm 2 - Nhất bảng',
      p2: 'H3 bốc thăm 2 - Hạng ba',
      winner: '',
    },
    t4: {
      title: 'T4',
      p1: 'Nhì bảng B',
      p2: 'Nhì bảng C',
      winner: '',
    },
    t5: {
      title: 'T5',
      p1: 'N bốc thăm 3 - Nhất bảng',
      p2: 'H3 bốc thăm 3 - Hạng ba',
      winner: '',
    },
    t6: {
      title: 'T6',
      p1: 'N còn lại 1 - Nhất bảng',
      p2: 'Nhì bảng E',
      winner: '',
    },
    t7: {
      title: 'T7',
      p1: 'N bốc thăm 4 - Nhất bảng',
      p2: 'H3 bốc thăm 4 - Hạng ba',
      winner: '',
    },
    t8: {
      title: 'T8',
      p1: 'N còn lại 2 - Nhất bảng',
      p2: 'Nhì bảng F',
      winner: '',
    },
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

function classNames(...items) {
  return items.filter(Boolean).join(' ');
}

function prepareKnockoutData(value) {
  return {
    ...defaultKnockoutData,
    ...(value || {}),
    round16: {
      ...defaultKnockoutData.round16,
      ...(value?.round16 || {}),
    },
    quarter: {
      ...defaultKnockoutData.quarter,
      ...(value?.quarter || {}),
    },
    semi: {
      ...defaultKnockoutData.semi,
      ...(value?.semi || {}),
    },
    final: {
      ...defaultKnockoutData.final,
      ...(value?.final || {}),
    },
    thirdPlace: {
      ...defaultKnockoutData.thirdPlace,
      ...(value?.thirdPlace || {}),
    },
    champion: value?.champion || '',
  };
}

export default function Knockout({
  database = null,
  adminMode = false,
  dbPath = 'clb31tq/knockout/serieA16',
}) {
  const [data, setData] = useState(defaultKnockoutData);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!database) {
      const saved = localStorage.getItem('clb31tq-knockout');
      if (saved) {
        try {
          setData(prepareKnockoutData(JSON.parse(saved)));
        } catch {
          setData(defaultKnockoutData);
        }
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
          setData(prepareKnockoutData(value));
        } else {
          set(knockoutRef, defaultKnockoutData);
          setData(defaultKnockoutData);
        }

        setConnected(true);
      },
      () => {
        setConnected(false);
      }
    );

    return () => unsubscribe();
  }, [database, dbPath]);

  const saveData = async nextData => {
    const payload = prepareKnockoutData(nextData);

    setData(payload);

    if (database) {
      await set(ref(database, dbPath), payload);
    } else {
      localStorage.setItem('clb31tq-knockout', JSON.stringify(payload));
    }
  };

  const pushWinnerForward = (next, matchId, winner, oldWinner) => {
    if (matchId === 't1') {
      next.quarter.tk1.p1 = winner;
      if (oldWinner && next.quarter.tk1.winner === oldWinner) {
        next.quarter.tk1.winner = '';
      }
    }

    if (matchId === 't2') {
      next.quarter.tk1.p2 = winner;
      if (oldWinner && next.quarter.tk1.winner === oldWinner) {
        next.quarter.tk1.winner = '';
      }
    }

    if (matchId === 't3') {
      next.quarter.tk2.p1 = winner;
      if (oldWinner && next.quarter.tk2.winner === oldWinner) {
        next.quarter.tk2.winner = '';
      }
    }

    if (matchId === 't4') {
      next.quarter.tk2.p2 = winner;
      if (oldWinner && next.quarter.tk2.winner === oldWinner) {
        next.quarter.tk2.winner = '';
      }
    }

    if (matchId === 't5') {
      next.quarter.tk3.p1 = winner;
      if (oldWinner && next.quarter.tk3.winner === oldWinner) {
        next.quarter.tk3.winner = '';
      }
    }

    if (matchId === 't6') {
      next.quarter.tk3.p2 = winner;
      if (oldWinner && next.quarter.tk3.winner === oldWinner) {
        next.quarter.tk3.winner = '';
      }
    }

    if (matchId === 't7') {
      next.quarter.tk4.p1 = winner;
      if (oldWinner && next.quarter.tk4.winner === oldWinner) {
        next.quarter.tk4.winner = '';
      }
    }

    if (matchId === 't8') {
      next.quarter.tk4.p2 = winner;
      if (oldWinner && next.quarter.tk4.winner === oldWinner) {
        next.quarter.tk4.winner = '';
      }
    }

    if (matchId === 'tk1') {
      next.semi.bk1.p1 = winner;
      if (oldWinner && next.semi.bk1.winner === oldWinner) {
        next.semi.bk1.winner = '';
      }
    }

    if (matchId === 'tk2') {
      next.semi.bk1.p2 = winner;
      if (oldWinner && next.semi.bk1.winner === oldWinner) {
        next.semi.bk1.winner = '';
      }
    }

    if (matchId === 'tk3') {
      next.semi.bk2.p1 = winner;
      if (oldWinner && next.semi.bk2.winner === oldWinner) {
        next.semi.bk2.winner = '';
      }
    }

    if (matchId === 'tk4') {
      next.semi.bk2.p2 = winner;
      if (oldWinner && next.semi.bk2.winner === oldWinner) {
        next.semi.bk2.winner = '';
      }
    }

    if (matchId === 'bk1') {
      next.final.ck.p1 = winner;

      const loser = getLoser(next.semi.bk1, winner);
      next.thirdPlace.p1 = loser;

      if (oldWinner && next.final.ck.winner === oldWinner) {
        next.final.ck.winner = '';
        next.champion = '';
      }
    }

    if (matchId === 'bk2') {
      next.final.ck.p2 = winner;

      const loser = getLoser(next.semi.bk2, winner);
      next.thirdPlace.p2 = loser;

      if (oldWinner && next.final.ck.winner === oldWinner) {
        next.final.ck.winner = '';
        next.champion = '';
      }
    }

    if (matchId === 'ck') {
      next.champion = winner;
    }
  };

  const chooseWinner = (roundKey, matchId, winner) => {
    if (!adminMode) return;
    if (!winner) return;

    const next = prepareKnockoutData(structuredClone(data));
    const match = next[roundKey][matchId];
    const oldWinner = match.winner;

    match.winner = winner;

    pushWinnerForward(next, matchId, winner, oldWinner);

    saveData(next);
  };

  const updatePlayer = (roundKey, matchId, playerKey, value) => {
    if (!adminMode) return;

    const next = prepareKnockoutData(structuredClone(data));
    next[roundKey][matchId][playerKey] = value;
    saveData(next);
  };

  const resetKnockout = () => {
    if (!adminMode) return;

    const confirmReset = window.confirm('Reset toàn bộ sơ đồ Knock-out?');
    if (!confirmReset) return;

    saveData(defaultKnockoutData);
  };

  return (
    <div className="rounded-3xl bg-white p-4 shadow-2xl sm:p-6">
      <div className="mb-5 flex flex-col gap-3 border-b border-slate-200 pb-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="text-2xl font-black text-red-700 sm:text-3xl">
            SƠ ĐỒ VÒNG 1/8 SERIE A - 16 VĐV
          </div>
          <div className="mt-1 text-sm font-bold text-slate-500">
            Chọn người thắng, hệ thống tự chuyển lên Tứ kết, Bán kết và Chung kết.
          </div>
          <div className="mt-1 text-xs font-bold text-slate-400">
            Trạng thái: {connected ? 'Realtime Firebase' : 'Local'}
          </div>
        </div>

        {adminMode && (
          <button
            onClick={resetKnockout}
            className="flex items-center justify-center gap-2 rounded-xl border border-red-300 bg-red-50 px-4 py-3 font-black text-red-700 hover:bg-red-100"
          >
            <RotateCcw size={17} />
            Reset Knock-out
          </button>
        )}
      </div>

      <div className="overflow-x-auto">
        <div className="grid min-w-[1200px] grid-cols-[360px_220px_220px_260px] gap-8">
          <RoundColumn title="VÒNG 1/8" color="text-red-700">
            <div className="space-y-3">
              {Object.entries(data.round16).map(([id, match]) => (
                <MatchBox
                  key={id}
                  roundKey="round16"
                  matchId={id}
                  match={match}
                  adminMode={adminMode}
                  onWinner={chooseWinner}
                  onUpdatePlayer={updatePlayer}
                />
              ))}
            </div>
          </RoundColumn>

          <RoundColumn title="TỨ KẾT" color="text-blue-700">
            <div className="space-y-12 pt-8">
              {Object.entries(data.quarter).map(([id, match]) => (
                <MatchBox
                  key={id}
                  roundKey="quarter"
                  matchId={id}
                  match={match}
                  adminMode={adminMode}
                  onWinner={chooseWinner}
                  onUpdatePlayer={updatePlayer}
                />
              ))}
            </div>
          </RoundColumn>

          <RoundColumn title="BÁN KẾT" color="text-emerald-700">
            <div className="space-y-32 pt-28">
              {Object.entries(data.semi).map(([id, match]) => (
                <MatchBox
                  key={id}
                  roundKey="semi"
                  matchId={id}
                  match={match}
                  adminMode={adminMode}
                  onWinner={chooseWinner}
                  onUpdatePlayer={updatePlayer}
                />
              ))}
            </div>
          </RoundColumn>

          <RoundColumn title="CHUNG KẾT" color="text-yellow-600">
            <div className="pt-44">
              <MatchBox
                roundKey="final"
                matchId="ck"
                match={data.final.ck}
                adminMode={adminMode}
                onWinner={chooseWinner}
                onUpdatePlayer={updatePlayer}
                finalMatch
              />

              <ChampionBox champion={data.champion} />

              <ThirdPlaceBox thirdPlace={data.thirdPlace} />
            </div>
          </RoundColumn>
        </div>
      </div>

      <div className="mt-5 rounded-2xl bg-slate-100 px-4 py-3 text-sm font-bold text-slate-600">
        Ghi chú: N = VĐV nhất bảng theo thứ tự bốc thăm. H3 = VĐV hạng ba xuất sắc theo thứ tự bốc thăm.
      </div>
    </div>
  );
}

function RoundColumn({ title, color, children }) {
  return (
    <div>
      <div className={classNames('mb-4 text-center text-xl font-black', color)}>
        {title}
      </div>
      {children}
    </div>
  );
}

function MatchBox({
  roundKey,
  matchId,
  match,
  adminMode,
  onWinner,
  onUpdatePlayer,
  finalMatch = false,
}) {
  const hasP1 = String(match.p1 || '').trim();
  const hasP2 = String(match.p2 || '').trim();

  return (
    <div
      className={classNames(
        'rounded-2xl border-2 bg-white p-3 shadow-md',
        match.winner ? 'border-emerald-400' : 'border-slate-200',
        finalMatch && 'border-yellow-400 bg-yellow-50'
      )}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <div
          className={classNames(
            'rounded-lg px-3 py-1 text-sm font-black text-white',
            matchId.startsWith('t') ? 'bg-red-700' : '',
            matchId.startsWith('tk') ? 'bg-blue-700' : '',
            matchId.startsWith('bk') ? 'bg-emerald-700' : '',
            matchId === 'ck' ? 'bg-yellow-600' : ''
          )}
        >
          {match.title}
        </div>

        {match.winner && (
          <div className="flex items-center gap-1 text-xs font-black text-emerald-700">
            <CheckCircle2 size={14} />
            Đã chọn
          </div>
        )}
      </div>

      <PlayerButton
        value={match.p1}
        selected={match.winner === match.p1}
        disabled={!hasP1 || !adminMode}
        onClick={() => onWinner(roundKey, matchId, match.p1)}
        onChange={value => onUpdatePlayer(roundKey, matchId, 'p1', value)}
        adminMode={adminMode}
        placeholder="VĐV 1"
      />

      <div className="my-2 text-center text-sm font-black text-slate-400">
        VS
      </div>

      <PlayerButton
        value={match.p2}
        selected={match.winner === match.p2}
        disabled={!hasP2 || !adminMode}
        onClick={() => onWinner(roundKey, matchId, match.p2)}
        onChange={value => onUpdatePlayer(roundKey, matchId, 'p2', value)}
        adminMode={adminMode}
        placeholder="VĐV 2"
      />
    </div>
  );
}

function PlayerButton({
  value,
  selected,
  disabled,
  onClick,
  onChange,
  adminMode,
  placeholder,
}) {
  return (
    <div
      className={classNames(
        'rounded-xl border px-3 py-2',
        selected ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-200 bg-slate-50 text-slate-900'
      )}
    >
      {adminMode ? (
        <div className="flex items-center gap-2">
          <input
            value={value || ''}
            onChange={e => onChange(e.target.value)}
            placeholder={placeholder}
            className={classNames(
              'min-w-0 flex-1 bg-transparent text-sm font-black outline-none',
              selected ? 'text-white placeholder:text-emerald-100' : 'text-slate-900 placeholder:text-slate-400'
            )}
          />

          <button
            onClick={onClick}
            disabled={disabled}
            className={classNames(
              'shrink-0 rounded-lg px-2 py-1 text-xs font-black',
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
        <div className="text-sm font-black">
          {value || '-'}
        </div>
      )}
    </div>
  );
}

function ChampionBox({ champion }) {
  if (!champion) {
    return (
      <div className="mt-5 rounded-2xl border-2 border-dashed border-yellow-300 bg-yellow-50 p-5 text-center">
        <Trophy className="mx-auto mb-2 text-yellow-500" size={42} />
        <div className="text-lg font-black text-yellow-700">
          Chưa có nhà vô địch
        </div>
      </div>
    );
  }

  return (
    <div className="mt-5 rounded-2xl bg-yellow-400 p-5 text-center shadow-lg">
      <Trophy className="mx-auto mb-2 text-yellow-900" size={48} />
      <div className="text-sm font-black uppercase text-yellow-900">
        Nhà vô địch
      </div>
      <div className="mt-1 text-2xl font-black text-slate-950">
        {champion}
      </div>
    </div>
  );
}

function ThirdPlaceBox({ thirdPlace }) {
  return (
    <div className="mt-5 rounded-2xl border border-blue-200 bg-blue-50 p-4">
      <div className="mb-3 flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-3 py-2 text-center font-black text-white">
        <Medal size={18} />
        ĐỒNG HẠNG 3
      </div>

      <div className="space-y-2 text-center text-sm font-black text-slate-800">
        <div>
          Thua BK1: {thirdPlace.p1 || '-'}
        </div>
        <div>
          Thua BK2: {thirdPlace.p2 || '-'}
        </div>
      </div>
    </div>
  );
}

function getLoser(match, winner) {
  if (!match) return '';
  if (match.p1 === winner) return match.p2 || '';
  if (match.p2 === winner) return match.p1 || '';
  return '';
}