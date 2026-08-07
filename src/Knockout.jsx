import React, { useEffect, useState } from 'react';
import { RotateCcw, Trophy, Medal, CheckCircle2 } from 'lucide-react';
import { onValue, ref, set } from 'firebase/database';

const defaultKnockoutData = {
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

function classNames(...items) {
  return items.filter(Boolean).join(' ');
}

function cloneData(value) {
  return JSON.parse(JSON.stringify(value));
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

  function getLoser(match, winner) {
  if (!match) return '';

  if (match.p1 === winner) {
    return match.p2 || '';
  }

  if (match.p2 === winner) {
    return match.p1 || '';
  }

  return '';
}

const chooseWinner = (roundKey, matchId, winner) => {
  if (!adminMode) return;
  if (!winner) return;

  const next = prepareKnockoutData(cloneData(data));
  const match = next[roundKey][matchId];
  const oldWinner = match.winner;

  match.winner = winner;

  pushWinnerForward(next, matchId, winner, oldWinner);
  saveData(next);
};
