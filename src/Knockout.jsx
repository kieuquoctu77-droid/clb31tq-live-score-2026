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
      t1: { title: 'T1', p1: 'N1', p2: 'H3A', winner: '', score1: '', score2: '' },
      t2: { title: 'T2', p1: 'Nhì bảng A', p2: 'Nhì bảng D', winner: '', score1: '', score2: '' },
      t3: { title: 'T3', p1: 'N2', p2: 'H3B', winner: '', score1: '', score2: '' },
      t4: { title: 'T4', p1: 'Nhì bảng B', p2: 'Nhì bảng C', winner: '', score1: '', score2: '' },
      t5: { title: 'T5', p1: 'N3', p2: 'H3C', winner: '', score1: '', score2: '' },
      t6: { title: 'T6', p1: 'N4', p2: 'Nhì bảng E', winner: '', score1: '', score2: '' },
      t7: { title: 'T7', p1: 'N5', p2: 'H3D', winner: '', score1: '', score2: '' },
      t8: { title: 'T8', p1: 'N6', p2: 'Nhì bảng F', winner: '', score1: '', score2: '' },
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
  return !text || /^n[1-6]$/.test(text) || /^h3[a-d]$/.test(text) || text.includes('bảng') || text.includes('bốc thăm') || text.includes('còn lại') || text.includes('hạng');
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

function getPlayerGroup(name, groupMap) {
  const cleanName = String(name || '').trim();
  if (!cleanName) return '';
  for (const code of GROUP_CODES) {
    const group = groupMap[code];
    if ((group?.players || []).includes(cleanName)) return code;
    if ((group?.standings || []).some(item => item.name === cleanName)) return code;
  }
  return '';
}

function getQualifiedEntries(groupMap) {
  const firsts = [];
  const seconds = [];
  const thirds = [];
  const fourths = [];

  GROUP_CODES.forEach(code => {
    const standings = groupMap[code]?.standings || [];
    if (standings[0]?.name) firsts.push({ name: standings[0].name, groupCode: code, rank: 1, stats: standings[0] });
    if (standings[1]?.name) seconds.push({ name: standings[1].name, groupCode: code, rank: 2, stats: standings[1] });
    if (standings[2]?.name) thirds.push({ name: standings[2].name, groupCode: code, rank: 3, stats: standings[2] });
    if (standings[3]?.name) fourths.push({ name: standings[3].name, groupCode: code, rank: 4, stats: standings[3] });
  });

  const sortByStats = (a, b) => {
    if ((b.stats?.wins || 0) !== (a.stats?.wins || 0)) return (b.stats?.wins || 0) - (a.stats?.wins || 0);
    if ((b.stats?.setDiff || 0) !== (a.stats?.setDiff || 0)) return (b.stats?.setDiff || 0) - (a.stats?.setDiff || 0);
    if ((b.stats?.setFor || 0) !== (a.stats?.setFor || 0)) return (b.stats?.setFor || 0) - (a.stats?.setFor || 0);
    return a.name.localeCompare(b.name, 'vi');
  };

  const sortedThirds = [...thirds].sort(sortByStats);
  return {
    firsts,
    seconds,
    thirds: sortedThirds,
    topThirds: sortedThirds.slice(0, 4),
    remainingThirds: sortedThirds.slice(4),
    fourths,
  };
}

function getSlotMeta(bracketSize = 16) {
  if (Number(bracketSize) === 8) {
    return [
      { roundKey: 'quarter', matchId: 'tk1', playerKey: 'p1', allowedRanks: [3], matchNo: 1, quarterNo: 1, halfNo: 1 },
      { roundKey: 'quarter', matchId: 'tk1', playerKey: 'p2', allowedRanks: [4], matchNo: 1, quarterNo: 1, halfNo: 1, fixedGroup: 'A' },
      { roundKey: 'quarter', matchId: 'tk2', playerKey: 'p1', allowedRanks: [3], matchNo: 2, quarterNo: 2, halfNo: 1 },
      { roundKey: 'quarter', matchId: 'tk2', playerKey: 'p2', allowedRanks: [4], matchNo: 2, quarterNo: 2, halfNo: 1, fixedGroup: 'B' },
      { roundKey: 'quarter', matchId: 'tk3', playerKey: 'p1', allowedRanks: [4], matchNo: 3, quarterNo: 3, halfNo: 2, fixedGroup: 'C' },
      { roundKey: 'quarter', matchId: 'tk3', playerKey: 'p2', allowedRanks: [4], matchNo: 3, quarterNo: 3, halfNo: 2, fixedGroup: 'D' },
      { roundKey: 'quarter', matchId: 'tk4', playerKey: 'p1', allowedRanks: [4], matchNo: 4, quarterNo: 4, halfNo: 2, fixedGroup: 'E' },
      { roundKey: 'quarter', matchId: 'tk4', playerKey: 'p2', allowedRanks: [4], matchNo: 4, quarterNo: 4, halfNo: 2, fixedGroup: 'F' },
    ];
  }

  return [
    { roundKey: 'round16', matchId: 't1', playerKey: 'p1', allowedRanks: [1], matchNo: 1, quarterNo: 1, halfNo: 1 },
    { roundKey: 'round16', matchId: 't1', playerKey: 'p2', allowedRanks: [3], matchNo: 1, quarterNo: 1, halfNo: 1 },
    { roundKey: 'round16', matchId: 't2', playerKey: 'p1', allowedRanks: [2], matchNo: 2, quarterNo: 1, halfNo: 1, fixedGroup: 'A' },
    { roundKey: 'round16', matchId: 't2', playerKey: 'p2', allowedRanks: [2], matchNo: 2, quarterNo: 1, halfNo: 1, fixedGroup: 'D' },
    { roundKey: 'round16', matchId: 't3', playerKey: 'p1', allowedRanks: [1], matchNo: 3, quarterNo: 2, halfNo: 1 },
    { roundKey: 'round16', matchId: 't3', playerKey: 'p2', allowedRanks: [3], matchNo: 3, quarterNo: 2, halfNo: 1 },
    { roundKey: 'round16', matchId: 't4', playerKey: 'p1', allowedRanks: [2], matchNo: 4, quarterNo: 2, halfNo: 1, fixedGroup: 'B' },
    { roundKey: 'round16', matchId: 't4', playerKey: 'p2', allowedRanks: [2], matchNo: 4, quarterNo: 2, halfNo: 1, fixedGroup: 'C' },
    { roundKey: 'round16', matchId: 't5', playerKey: 'p1', allowedRanks: [1], matchNo: 5, quarterNo: 3, halfNo: 2 },
    { roundKey: 'round16', matchId: 't5', playerKey: 'p2', allowedRanks: [3], matchNo: 5, quarterNo: 3, halfNo: 2 },
    { roundKey: 'round16', matchId: 't6', playerKey: 'p1', allowedRanks: [1], matchNo: 6, quarterNo: 3, halfNo: 2 },
    { roundKey: 'round16', matchId: 't6', playerKey: 'p2', allowedRanks: [2], matchNo: 6, quarterNo: 3, halfNo: 2, fixedGroup: 'E' },
    { roundKey: 'round16', matchId: 't7', playerKey: 'p1', allowedRanks: [1], matchNo: 7, quarterNo: 4, halfNo: 2 },
    { roundKey: 'round16', matchId: 't7', playerKey: 'p2', allowedRanks: [3], matchNo: 7, quarterNo: 4, halfNo: 2 },
    { roundKey: 'round16', matchId: 't8', playerKey: 'p1', allowedRanks: [1], matchNo: 8, quarterNo: 4, halfNo: 2 },
    { roundKey: 'round16', matchId: 't8', playerKey: 'p2', allowedRanks: [2], matchNo: 8, quarterNo: 4, halfNo: 2, fixedGroup: 'F' },
  ];
}

function getDrawSlotLabels(bracketSize = 16) {
  if (Number(bracketSize) !== 16) return [];
  return [
    { label: 'N1', roundKey: 'round16', matchId: 't1', playerKey: 'p1', type: 'Nhất bảng' },
    { label: 'N2', roundKey: 'round16', matchId: 't3', playerKey: 'p1', type: 'Nhất bảng' },
    { label: 'N3', roundKey: 'round16', matchId: 't5', playerKey: 'p1', type: 'Nhất bảng' },
    { label: 'N4', roundKey: 'round16', matchId: 't6', playerKey: 'p1', type: 'Nhất bảng' },
    { label: 'N5', roundKey: 'round16', matchId: 't7', playerKey: 'p1', type: 'Nhất bảng' },
    { label: 'N6', roundKey: 'round16', matchId: 't8', playerKey: 'p1', type: 'Nhất bảng' },
    { label: 'H3A', roundKey: 'round16', matchId: 't1', playerKey: 'p2', type: 'Hạng 3 xuất sắc' },
    { label: 'H3B', roundKey: 'round16', matchId: 't3', playerKey: 'p2', type: 'Hạng 3 xuất sắc' },
    { label: 'H3C', roundKey: 'round16', matchId: 't5', playerKey: 'p2', type: 'Hạng 3 xuất sắc' },
    { label: 'H3D', roundKey: 'round16', matchId: 't7', playerKey: 'p2', type: 'Hạng 3 xuất sắc' },
  ];
}

function getDrawSlotLabelMap(bracketSize = 16) {
  return getDrawSlotLabels(bracketSize).reduce((acc, slot) => {
    acc[`${slot.roundKey}.${slot.matchId}.${slot.playerKey}`] = slot.label;
    return acc;
  }, {});
}

function getPlayerEntryFromGroupMap(name, groupMap) {
  const cleanName = String(name || '').trim();
  if (!cleanName) return null;
  for (const code of GROUP_CODES) {
    const standings = groupMap[code]?.standings || [];
    const index = standings.findIndex(item => item.name === cleanName);
    if (index >= 0) {
      return {
        name: cleanName,
        groupCode: code,
        rank: index + 1,
        rankText: index === 0 ? 'Nhất bảng' : index === 1 ? 'Nhì bảng' : index === 2 ? 'Hạng 3 bảng' : 'Hạng 4 bảng',
      };
    }
  }
  return null;
}

function getDrawNoteItems(data, groupMap, bracketSize = 16) {
  return getDrawSlotLabels(bracketSize).map(slot => {
    const value = data?.[slot.roundKey]?.[slot.matchId]?.[slot.playerKey] || '';
    const entry = getPlayerEntryFromGroupMap(value, groupMap);
    return {
      ...slot,
      value,
      entry,
      displayValue: entry ? `${entry.name} (${entry.rankText} ${entry.groupCode})` : value && !isPlaceholder(value) ? value : 'Chưa cập nhật',
    };
  });
}

function getEntryPool(entries, bracketSize) {
  if (Number(bracketSize) === 8) {
    return [...entries.remainingThirds, ...entries.fourths];
  }
  return [...entries.firsts, ...entries.seconds, ...entries.topThirds];
}

function getCandidateEntries(slot, pool, usedNames) {
  return pool.filter(entry => {
    if (!entry?.name || usedNames.has(entry.name)) return false;
    if (!slot.allowedRanks.includes(entry.rank)) return false;
    if (slot.fixedGroup && entry.groupCode !== slot.fixedGroup) return false;
    return true;
  });
}

function scoreCandidate(slot, candidate, placed) {
  let score = 0;
  placed.forEach(item => {
    if (item.entry.groupCode !== candidate.groupCode) return;
    if (item.slot.matchNo === slot.matchNo) score -= 100000;
    if (item.slot.quarterNo === slot.quarterNo) score -= 5000;
    if (item.slot.halfNo === slot.halfNo) score -= 700;
  });

  // Ưu tiên rải các VĐV cùng bảng sang 2 nhánh khác nhau để nếu gặp lại thì càng sâu càng tốt.
  const sameGroupPlaced = placed.filter(item => item.entry.groupCode === candidate.groupCode);
  if (sameGroupPlaced.length && sameGroupPlaced.every(item => item.slot.halfNo !== slot.halfNo)) score += 200;
  if (slot.fixedGroup && slot.fixedGroup === candidate.groupCode) score += 100;
  return score;
}

function buildAutoSeedMap(groupMap, bracketSize) {
  const entries = getQualifiedEntries(groupMap);
  const pool = getEntryPool(entries, bracketSize);
  const slots = getSlotMeta(bracketSize);

  const qualifiersByGroup = pool.reduce((acc, entry) => {
    if (!entry?.groupCode) return acc;
    acc[entry.groupCode] = acc[entry.groupCode] || [];
    acc[entry.groupCode].push(entry);
    return acc;
  }, {});

  const availableSlots = slots.filter(slot => getCandidateEntries(slot, pool, new Set()).length > 0);
  const order = [...availableSlots].sort((a, b) => {
    const aFixed = a.fixedGroup ? 0 : 1;
    const bFixed = b.fixedGroup ? 0 : 1;
    if (aFixed !== bFixed) return aFixed - bFixed;
    return a.allowedRanks.length - b.allowedRanks.length || a.matchNo - b.matchNo;
  });

  const canPlaceStrict = (slot, entry, placed) => {
    return placed.every(item => {
      if (item.entry.groupCode !== entry.groupCode) return true;

      // Luật cứng 1: tuyệt đối không tái đấu ngay vòng đầu.
      if (item.slot.matchNo === slot.matchNo) return false;

      // Luật cứng 2: tránh cùng tứ kết để không thể gặp lại ở tứ kết.
      if (item.slot.quarterNo === slot.quarterNo) return false;

      // Luật cứng 3: nếu bảng đó chỉ có 2 VĐV trong Serie hiện tại,
      // bắt buộc tách 2 nửa nhánh để chỉ có thể gặp ở chung kết.
      const sameGroupCount = qualifiersByGroup[entry.groupCode]?.length || 0;
      if (sameGroupCount <= 2 && item.slot.halfNo === slot.halfNo) return false;

      // Nếu có 3 VĐV cùng bảng lọt Serie A thì không thể đảm bảo cả 3 chỉ gặp ở CK,
      // vì sơ đồ chỉ có 2 nửa nhánh. Khi đó vẫn cho phép 2 người cùng nửa nhánh,
      // nhưng đã bị chặn không cùng trận và không cùng tứ kết.
      return true;
    });
  };

  const canPlaceRelaxed = (slot, entry, placed) => {
    return placed.every(item => {
      if (item.entry.groupCode !== entry.groupCode) return true;
      if (item.slot.matchNo === slot.matchNo) return false;
      return true;
    });
  };

  const evaluateFinalLayout = placed => {
    let score = 0;
    for (let i = 0; i < placed.length; i += 1) {
      for (let j = i + 1; j < placed.length; j += 1) {
        const a = placed[i];
        const b = placed[j];
        if (a.entry.groupCode !== b.entry.groupCode) continue;
        if (a.slot.matchNo === b.slot.matchNo) score -= 1000000;
        else if (a.slot.quarterNo === b.slot.quarterNo) score -= 100000;
        else if (a.slot.halfNo === b.slot.halfNo) score -= 1000;
        else score += 3000;
      }
    }
    return score;
  };

  const runSearch = strictMode => {
    let best = { placed: [], score: -Infinity };

    const search = (index, usedNames, placed) => {
      if (index >= order.length) {
        const score = evaluateFinalLayout(placed);
        if (placed.length > best.placed.length || (placed.length === best.placed.length && score > best.score)) {
          best = { placed: [...placed], score };
        }
        return;
      }

      const slot = order[index];
      const candidates = getCandidateEntries(slot, pool, usedNames)
        .filter(entry => (strictMode ? canPlaceStrict(slot, entry, placed) : canPlaceRelaxed(slot, entry, placed)))
        .map(entry => ({ entry, score: scoreCandidate(slot, entry, placed) }))
        .sort((a, b) => b.score - a.score || a.entry.name.localeCompare(b.entry.name, 'vi'));

      candidates.forEach(({ entry }) => {
        usedNames.add(entry.name);
        placed.push({ slot, entry });
        search(index + 1, usedNames, placed);
        placed.pop();
        usedNames.delete(entry.name);
      });
    };

    search(0, new Set(), []);
    return best;
  };

  // Chạy lần 1 bằng luật nghiêm ngặt. Nếu thiếu người do ràng buộc quá chặt,
  // chạy lần 2 với luật nới lỏng để app vẫn có sơ đồ sử dụng được.
  const strictResult = runSearch(true);
  const finalResult = strictResult.placed.length === availableSlots.length ? strictResult : runSearch(false);

  return finalResult.placed.reduce((acc, item) => {
    const key = `${item.slot.roundKey}.${item.slot.matchId}.${item.slot.playerKey}`;
    acc[key] = item.entry.name;
    return acc;
  }, {});
}

function canUpdateSeedSlot(match, playerKey, nextValue) {
  if (!nextValue) return false;
  if (!match) return false;
  if (match.winner) return false;
  const current = match[playerKey] || '';
  return isPlaceholder(current) || current === nextValue || getPlayerGroup(current, {}) === '';
}

function applyFixedSeeds(data, groupMap, bracketSize) {
  const next = prepareKnockoutData(cloneData(data), bracketSize);
  const seedMap = buildAutoSeedMap(groupMap, bracketSize);
  const drawSlotKeys = new Set(getDrawSlotLabels(bracketSize).map(slot => `${slot.roundKey}.${slot.matchId}.${slot.playerKey}`));

  Object.entries(seedMap).forEach(([key, value]) => {
    // Các ô N1-N6 và H3A-H3D là vị trí bốc thăm thủ công.
    // App chỉ hiển thị nhãn ngay trên sơ đồ và để BTC chọn VĐV từ dropdown.
    if (drawSlotKeys.has(key)) return;

    const [roundKey, matchId, playerKey] = key.split('.');
    const match = next[roundKey]?.[matchId];
    if (!match || match.winner) return;
    const current = match[playerKey] || '';
    const currentLooksSeeded = isPlaceholder(current) || getPlayerGroup(current, groupMap) || current === value;
    if (currentLooksSeeded) {
      match[playerKey] = value;
    }
  });

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
  const drawNoteItems = useMemo(() => getDrawNoteItems(data, groupMap, normalizedBracketSize), [data, groupMap, normalizedBracketSize]);
  const drawSlotLabelMap = useMemo(() => getDrawSlotLabelMap(normalizedBracketSize), [normalizedBracketSize]);
  const playerOptionsBySlot = useMemo(() => {
    if (normalizedBracketSize !== 16) return {};
    const firstOptions = qualifiedLists.firsts || [];
    const h3Options = uniq([...(qualifiedLists.thirds || []), ...(qualifiedLists.fourths || [])]);
    return getDrawSlotLabels(normalizedBracketSize).reduce((acc, slot) => {
      const key = `${slot.roundKey}.${slot.matchId}.${slot.playerKey}`;
      acc[key] = slot.label.startsWith('N') ? firstOptions : h3Options;
      return acc;
    }, {});
  }, [normalizedBracketSize, qualifiedLists]);

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
          slotLabelMap={drawSlotLabelMap}
          playerOptionsBySlot={playerOptionsBySlot}
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
          slotLabelMap={drawSlotLabelMap}
          playerOptionsBySlot={playerOptionsBySlot}
        />
      )}

      <div className="mt-5 rounded-2xl bg-slate-100 px-4 py-3 text-sm font-bold text-slate-600">
        {normalizedBracketSize === 8
          ? 'Ghi chú Serie B: hạng tư bảng A-F tự cập nhật từ vòng bảng. Hai vị trí H3 còn lại chọn bằng dropdown.'
          : 'Ghi chú Serie A: N1-N6 là thứ tự bốc thăm của 6 Nhất bảng. H3A-H3D là thứ tự bốc thăm của 4 VĐV hạng 3 xuất sắc nhất. Nhì bảng A-F được gắn cố định theo sơ đồ seed. Backtracking sẽ tự xếp để hạn chế tối đa VĐV cùng bảng gặp lại sớm.'}
      </div>
    </div>
  );
}

function SerieABracket({ data, round16Entries, quarterEntries, semiEntries, rowHeight, adminMode, chooseWinner, updatePlayer, updateScore, playerOptions, slotLabelMap = {}, playerOptionsBySlot = {} }) {
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
                slotLabelMap={slotLabelMap}
                playerOptionsBySlot={playerOptionsBySlot}
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
                slotLabelMap={slotLabelMap}
                playerOptionsBySlot={playerOptionsBySlot}
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
                slotLabelMap={slotLabelMap}
                playerOptionsBySlot={playerOptionsBySlot}
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
                slotLabelMap={slotLabelMap}
                playerOptionsBySlot={playerOptionsBySlot}
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

function SerieBBracket({ data, quarterEntries, semiEntries, rowHeight, adminMode, chooseWinner, updatePlayer, updateScore, playerOptions, slotLabelMap = {}, playerOptionsBySlot = {} }) {
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
                slotLabelMap={slotLabelMap}
                playerOptionsBySlot={playerOptionsBySlot}
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
                slotLabelMap={slotLabelMap}
                playerOptionsBySlot={playerOptionsBySlot}
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
                slotLabelMap={slotLabelMap}
                playerOptionsBySlot={playerOptionsBySlot}
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

function DrawNotes({ items = [] }) {
  const firstItems = items.filter(item => item.label.startsWith('N'));
  const thirdItems = items.filter(item => item.label.startsWith('H3'));
  if (!items.length) return null;
  const renderItem = item => (
    <div key={item.label} className="rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
      <div className="flex items-center gap-2">
        <span className="rounded-lg bg-slate-900 px-2 py-1 text-xs font-black text-white">{item.label}</span>
        <span className="text-xs font-black text-slate-500">{item.type}</span>
      </div>
      <div className="mt-1 truncate text-sm font-black text-slate-900" title={item.displayValue}>
        {item.displayValue}
      </div>
    </div>
  );
  return (
    <div className="mt-5 rounded-3xl border border-yellow-200 bg-yellow-50 p-4 shadow-inner">
      <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-lg font-black text-yellow-800">Ghi chú bốc thăm Serie A</div>
          <div className="text-sm font-bold text-slate-600">
            N1-N6 là thứ tự bốc thăm 6 Nhất bảng. H3A-H3D là thứ tự bốc thăm 4 Hạng 3 xuất sắc nhất.
          </div>
        </div>
        <div className="rounded-xl bg-white px-3 py-2 text-xs font-black text-slate-600 shadow-sm">
          Tự cập nhật theo Firebase vòng bảng
        </div>
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        <div>
          <div className="mb-2 text-sm font-black uppercase tracking-wide text-red-700">Nhất bảng</div>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{firstItems.map(renderItem)}</div>
        </div>
        <div>
          <div className="mb-2 text-sm font-black uppercase tracking-wide text-blue-700">Hạng 3 xuất sắc</div>
          <div className="grid gap-2 sm:grid-cols-2">{thirdItems.map(renderItem)}</div>
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
  slotLabelMap = {},
  playerOptionsBySlot = {},
  color = 'red',
  finalMatch = false,
  size = 'normal',
}) {
  const titleColor = getMatchColor(matchId, color);
  const getSlotLabel = playerKey => slotLabelMap[`${roundKey}.${matchId}.${playerKey}`] || '';
  const getSlotOptions = playerKey => {
    const slotKey = `${roundKey}.${matchId}.${playerKey}`;
    return uniq([match[playerKey], ...(playerOptionsBySlot[slotKey] || playerOptions)]);
  };

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
          options={getSlotOptions('p1')}
          slotLabel={getSlotLabel('p1')}
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
          options={getSlotOptions('p2')}
          slotLabel={getSlotLabel('p2')}
        />
      </div>
    </div>
  );
}

function PlayerRow({ value, selected, onChange, adminMode, placeholder, compact = false, options = [], slotLabel = '' }) {
  const displayValue = slotLabel && isPlaceholder(value) ? '' : value || '';
  const visibleValue = slotLabel && isPlaceholder(value) ? '-' : value || '-';
  return (
    <div
      className={classNames(
        'rounded-xl border transition-all',
        compact ? 'px-2 py-1.5' : 'px-2.5 py-2',
        selected ? 'border-emerald-700 bg-emerald-600 text-white shadow-md' : 'border-slate-200 bg-white text-slate-900'
      )}
    >
      <div className="flex items-center gap-2">
        {slotLabel && (
          <div className={classNames('shrink-0 rounded-lg px-2 py-1 text-[11px] font-black', selected ? 'bg-white text-emerald-700' : 'bg-slate-900 text-white')}>
            {slotLabel}
          </div>
        )}
        <div className="min-w-0 flex-1">
          {adminMode ? (
            <select
              value={displayValue}
              onChange={e => onChange(e.target.value || slotLabel || '')}
              className={classNames(
                'w-full rounded-lg bg-transparent font-black outline-none',
                compact ? 'text-xs' : 'text-sm',
                selected ? 'text-white' : 'text-slate-900'
              )}
            >
              <option value="">{slotLabel ? `Chọn VĐV cho ${slotLabel}` : placeholder}</option>
              {options.filter(option => !slotLabel || !isPlaceholder(option)).map(option => (
                <option key={option} value={option} className="text-slate-900">
                  {option}
                </option>
              ))}
            </select>
          ) : (
            <div className={classNames('truncate font-black', compact ? 'text-xs' : 'text-sm')}>{visibleValue}</div>
          )}
        </div>
      </div>
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
