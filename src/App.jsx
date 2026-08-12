import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { initializeApp } from 'firebase/app';
import { getDatabase, onValue, ref, set, remove } from 'firebase/database';
import GroupStage from './GroupStage';
import Knockout from './Knockout';
import ScheduleTab from './ScheduleTab';
import {
  Plus,
  Minus,
  RotateCcw,
  Table2,
  Clock,
  Edit3,
  Wifi,
  WifiOff,
  Eye,
  ShieldCheck,
  CheckCircle2,
  Upload,
  Trash2,
  Save,
  UserPlus,
  X,
  Pencil,
} from 'lucide-react';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const hasFirebaseConfig = Boolean(
  firebaseConfig.apiKey &&
    firebaseConfig.authDomain &&
    firebaseConfig.databaseURL &&
    firebaseConfig.projectId &&
    firebaseConfig.appId
);

let database = null;
if (hasFirebaseConfig) {
  const app = initializeApp(firebaseConfig);
  database = getDatabase(app);
}

const DB_PATH = 'clb31tq/live-score/current';
const PLAYERS_PATH = 'clb31tq/players';
const GROUP_ASSIGNMENTS_PATH = 'clb31tq/group-stage/assignments';
const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || '31TQ2026';
const SETS_TO_WIN = 3;
const MAX_TABLES = 4;
const GROUP_TABS = ['A', 'B', 'C', 'D', 'E', 'F'];
const PLAYERS_PER_GROUP = 4;

const defaultPlayers = ['Anthony', 'Leo', 'Hico', 'Banlan', 'Minh', 'Hung'];
const ranks = ['A**', 'A1', 'A2', 'B1', 'B2', 'C1'];

const matchTypes = [
  'Vòng Bảng',
  '1/8 Serie A',
  'Tứ Kết Serie A',
  'Bán Kết Serie A',
  'Chung Kết Serie A',
  'Tứ Kết Serie B',
  'Bán Kết Serie B',
  'Chung Kết Serie B',
  'Khác',
];

const createEmptyMatch = id => ({
  id,
  table: `Bàn ${id}`,
  content: '',
  customContent: '',
  playerA: '',
  playerB: '',
  scoreA: 0,
  scoreB: 0,
  setA: 0,
  setB: 0,
  setHistory: [],
  winner: '',
  status: id === 1 ? 'Đang thi đấu' : 'Chuẩn bị',
});

const initialMatches = [1, 2, 3, 4].map(createEmptyMatch);

const defaultData = {
  clubTitle: 'CLB BB 31 TÂN QUÝ',
  eventTitle: 'BẢNG TỶ SỐ LIVE',
  note: 'Cập nhật trực tiếp cho ACE CLB theo dõi',
  matches: initialMatches,
  updatedAt: Date.now(),
};

function getInitialAdminMode() {
  if (typeof window === 'undefined') return false;
  return sessionStorage.getItem('clb31tq-admin-auth') === '1';
}

function classNames(...items) {
  return items.filter(Boolean).join(' ');
}

function splitPlayerLabel(label) {
  const raw = String(label || '').trim();
  const parts = raw.split(' - ');
  const rankCandidate = parts.length > 1 ? parts[parts.length - 1].trim() : '';
  const name = parts.length > 1 ? parts.slice(0, -1).join(' - ').trim() : raw;

  return {
    name,
    rank: rankCandidate || 'B1',
  };
}

function formatPlayerLabel(name, rank) {
  const cleanName = String(name || '').trim();
  const cleanRank = String(rank || '').trim();
  return cleanRank ? `${cleanName} - ${cleanRank}` : cleanName;
}

function parseGroupScore(value) {
  const text = String(value || '').trim();
  const match = text.match(/^(\d+)\s*-\s*(\d+)$/);
  if (!match) return null;
  return { a: Number(match[1]), b: Number(match[2]) };
}

function computeGroupStandingsForManual(players = [], results = {}) {
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
    h2hWins: 0,
    h2hSetDiff: 0,
    needsDraw: false,
  }));

  Object.entries(results || {}).forEach(([key, value]) => {
    const parsed = parseGroupScore(value);
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

  const withDiff = standings.map(item => ({ ...item, setDiff: item.setFor - item.setAgainst }));
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
        const parsed = parseGroupScore(value);
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

function isSameSecondRankStats(a, b) {
  if (!a || !b) return false;
  return a.wins === b.wins && a.setDiff === b.setDiff && a.h2hWins === b.h2hWins && a.h2hSetDiff === b.h2hSetDiff;
}


function getRankTieKey(items = []) {
  return items.map(item => item.name).filter(Boolean).sort((a, b) => a.localeCompare(b, 'vi')).join('|');
}

function isSameRankStats(a, b) {
  if (!a || !b) return false;
  // BTC cần xử lý bốc thăm/thủ công ngay khi VĐV bằng số trận thắng và hiệu số set toàn bảng.
  // Đối đầu chỉ dùng làm thứ tự mặc định ban đầu; Admin vẫn có thể đổi thứ tự bằng panel Xử lý đồng hạng.
  return a.wins === b.wins && a.setDiff === b.setDiff;
}

function getRankingTieGroups(standings = []) {
  const groups = [];
  let index = 0;
  while (index < standings.length) {
    const current = [standings[index]];
    let nextIndex = index + 1;
    while (nextIndex < standings.length && isSameRankStats(standings[index], standings[nextIndex])) {
      current.push(standings[nextIndex]);
      nextIndex += 1;
    }
    if (current.length > 1) {
      groups.push({
        key: getRankTieKey(current),
        startRank: index + 1,
        endRank: index + current.length,
        items: current,
      });
    }
    index = nextIndex;
  }
  return groups;
}

function applyManualRanking(standings = [], manualRanking = {}) {
  const tieGroups = getRankingTieGroups(standings);
  if (!tieGroups.length || !manualRanking) return standings;
  const result = [];
  let index = 0;
  tieGroups.forEach(group => {
    while (index < group.startRank - 1) {
      result.push(standings[index]);
      index += 1;
    }
    const manualOrder = Array.isArray(manualRanking[group.key]) ? manualRanking[group.key] : [];
    const orderedNames = [...manualOrder, ...group.items.map(item => item.name)].filter((name, idx, arr) => name && arr.indexOf(name) === idx);
    const orderedItems = orderedNames
      .map(name => group.items.find(item => item.name === name))
      .filter(Boolean)
      .map(item => ({ ...item, manualRanked: manualOrder.includes(item.name) }));
    result.push(...orderedItems);
    index = group.endRank;
  });
  while (index < standings.length) {
    result.push(standings[index]);
    index += 1;
  }
  return result;
}

export default function App() {
  const [data, setData] = useState(defaultData);
  const [players, setPlayers] = useState(defaultPlayers);
  const [activePage, setActivePage] = useState('live');
  const [activeGroup, setActiveGroup] = useState('A');
  const [adminMode, setAdminMode] = useState(getInitialAdminMode);
  const [connected, setConnected] = useState(false);
  const [showPlayerManager, setShowPlayerManager] = useState(false);
  const [editingPlayers, setEditingPlayers] = useState([]);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [editingPlayerIndex, setEditingPlayerIndex] = useState(null);
  const [editName, setEditName] = useState('');
  const [editRank, setEditRank] = useState('B1');
  const [showGroupSetup, setShowGroupSetup] = useState(false);
  const [groupAssignments, setGroupAssignments] = useState({});
  const [activeGroupData, setActiveGroupData] = useState({});
  const [allGroupStageData, setAllGroupStageData] = useState({});
  const [editingGroupAssignments, setEditingGroupAssignments] = useState({});
  const hydrated = useRef(false);
  const fileInputRef = useRef(null);

  const statusOptions = ['Chuẩn bị', 'Đang thi đấu', 'Kết thúc'];
  const groupTabs = GROUP_TABS;

  const createEmptyGroupAssignments = () =>
    groupTabs.reduce((acc, group) => {
      acc[group] = Array(PLAYERS_PER_GROUP).fill('');
      return acc;
    }, {});

  const normalizeGroupAssignments = value => {
    const base = createEmptyGroupAssignments();
    if (!value) return base;

    groupTabs.forEach(group => {
      const rawList = Array.isArray(value[group]) ? value[group] : Object.values(value[group] || {});
      base[group] = Array.from({ length: PLAYERS_PER_GROUP }, (_, index) => String(rawList[index] || '').trim());
    });

    return base;
  };

  const normalizeMatches = matches => {
    const list = (matches || []).slice(0, MAX_TABLES);
    const filled = [...list];

    while (filled.length < MAX_TABLES) {
      filled.push(createEmptyMatch(filled.length + 1));
    }

    return filled.map((m, index) => ({
      ...createEmptyMatch(index + 1),
      ...m,
      id: index + 1,
      table: m.table || `Bàn ${index + 1}`,
      setHistory: m.setHistory || [],
      winner: m.winner || '',
      status: m.status || 'Chuẩn bị',
      content: m.content || '',
      customContent: m.customContent || '',
      scoreA: Number(m.scoreA || 0),
      scoreB: Number(m.scoreB || 0),
      setA: Number(m.setA || 0),
      setB: Number(m.setB || 0),
    }));
  };

  const normalizePlayers = value => {
    if (!value) return defaultPlayers;

    let list = [];
    if (Array.isArray(value)) {
      list = value.map(p => (typeof p === 'string' ? p : p?.name));
    } else {
      list = Object.values(value).map(p => (typeof p === 'string' ? p : p?.name));
    }

    const cleaned = list
      .map(p => String(p || '').trim())
      .filter(Boolean)
      .filter((p, index, arr) => arr.indexOf(p) === index)
      .sort((a, b) => a.localeCompare(b, 'vi'));

    return cleaned.length ? cleaned : defaultPlayers;
  };

  useEffect(() => {
    if (!database) {
      const saved = localStorage.getItem('clb31tq-live-score');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setData({ ...parsed, matches: normalizeMatches(parsed.matches) });
        } catch {
          setData(defaultData);
        }
      }
      setConnected(false);
      hydrated.current = true;
      return;
    }

    const scoreRef = ref(database, DB_PATH);
    const unsubscribe = onValue(
      scoreRef,
      snapshot => {
        const value = snapshot.val();
        if (value) {
          setData({ ...value, matches: normalizeMatches(value.matches) });
        } else {
          set(scoreRef, defaultData);
          setData(defaultData);
        }
        setConnected(true);
        hydrated.current = true;
      },
      () => {
        setConnected(false);
        hydrated.current = true;
      }
    );

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!database) {
      setPlayers(defaultPlayers);
      return;
    }

    const playersRef = ref(database, PLAYERS_PATH);
    const unsubscribe = onValue(
      playersRef,
      snapshot => {
        setPlayers(normalizePlayers(snapshot.val()));
      },
      () => {
        setPlayers(defaultPlayers);
      }
    );

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!database) {
      const savedAssignments = localStorage.getItem('clb31tq-group-assignments');
      if (savedAssignments) {
        try {
          setGroupAssignments(normalizeGroupAssignments(JSON.parse(savedAssignments)));
        } catch {
          setGroupAssignments(createEmptyGroupAssignments());
        }
      } else {
        setGroupAssignments(createEmptyGroupAssignments());
      }
      return;
    }

    const assignmentsRef = ref(database, GROUP_ASSIGNMENTS_PATH);
    const unsubscribe = onValue(
      assignmentsRef,
      snapshot => {
        setGroupAssignments(normalizeGroupAssignments(snapshot.val()));
      },
      () => {
        setGroupAssignments(createEmptyGroupAssignments());
      }
    );

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!database) {
      setActiveGroupData({
        players: groupAssignments[activeGroup] || [],
        results: {},
        manualSecondPlace: '',
      });
      return;
    }
    const groupRef = ref(database, `clb31tq/group-stage/group${activeGroup}`);
    const unsubscribe = onValue(
      groupRef,
      snapshot => {
        setActiveGroupData(snapshot.val() || {});
      },
      () => {
        setActiveGroupData({});
      }
    );
    return () => unsubscribe();
  }, [activeGroup, groupAssignments]);

  useEffect(() => {
    if (!database) {
      setAllGroupStageData({});
      return;
    }
    const allGroupsRef = ref(database, 'clb31tq/group-stage');
    const unsubscribe = onValue(
      allGroupsRef,
      snapshot => {
        setAllGroupStageData(snapshot.val() || {});
      },
      () => {
        setAllGroupStageData({});
      }
    );
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (showGroupSetup) {
      setEditingGroupAssignments(normalizeGroupAssignments(groupAssignments));
    }
  }, [showGroupSetup, groupAssignments]);

  useEffect(() => {
    if (showPlayerManager) {
      setEditingPlayers(players);
    }
  }, [showPlayerManager, players]);

  useEffect(() => {
    if (!adminMode && activePage === 'schedule') {
      setActivePage('live');
    }
  }, [adminMode, activePage]);

  const saveData = async nextData => {
    const payload = {
      ...nextData,
      matches: normalizeMatches(nextData.matches),
      updatedAt: Date.now(),
    };

    setData(payload);

    if (database) {
      await set(ref(database, DB_PATH), payload);
    } else {
      localStorage.setItem('clb31tq-live-score', JSON.stringify(payload));
    }
  };

  const visibleMatches = useMemo(() => normalizeMatches(data.matches), [data.matches]);

  const updateField = (field, value) => {
    if (!adminMode) return;
    saveData({ ...data, [field]: value });
  };

  const updateMatch = (id, field, value) => {
    if (!adminMode) return;
    const matches = normalizeMatches(data.matches).map(m => (m.id === id ? { ...m, [field]: value } : m));
    saveData({ ...data, matches });
  };

  const savePlayersToFirebase = async nextPlayers => {
    const cleanedPlayers = nextPlayers
      .map(name => String(name || '').trim())
      .filter(Boolean)
      .filter((name, index, arr) => arr.indexOf(name) === index);

    const playersPayload = cleanedPlayers.reduce((acc, name, index) => {
      const key = `p${String(index + 1).padStart(3, '0')}`;
      acc[key] = { name };
      return acc;
    }, {});

    if (database) {
      await set(ref(database, PLAYERS_PATH), playersPayload);
    }

    setPlayers(cleanedPlayers);
    return cleanedPlayers;
  };

  const saveGroupAssignments = async nextAssignments => {
    const payload = normalizeGroupAssignments(nextAssignments);
    setGroupAssignments(payload);

    if (database) {
      await set(ref(database, GROUP_ASSIGNMENTS_PATH), payload);
    } else {
      localStorage.setItem('clb31tq-group-assignments', JSON.stringify(payload));
    }

    return payload;
  };

  const updateEditingGroupPlayer = (group, slotIndex, value) => {
    setEditingGroupAssignments(prev => {
      const next = normalizeGroupAssignments(prev);
      next[group] = [...next[group]];
      next[group][slotIndex] = value;
      return next;
    });
  };

  const saveGroupSetup = async () => {
    const payload = normalizeGroupAssignments(editingGroupAssignments);
    const selectedPlayers = Object.values(payload).flat().filter(Boolean);
    const duplicatePlayer = selectedPlayers.find((name, index, arr) => arr.indexOf(name) !== index);

    if (duplicatePlayer) {
      window.alert(`VĐV "${duplicatePlayer}" đang bị chọn trùng giữa các bảng. Anh kiểm tra lại giúp em.`);
      return;
    }

    await saveGroupAssignments(payload);

    if (database) {
      await Promise.all(
        groupTabs.map(async group => {
          const groupPath = `clb31tq/group-stage/group${group}`;

          await set(ref(database, `${groupPath}/players`), payload[group] || []);
          await set(ref(database, `${groupPath}/groupName`), `Bảng ${group}`);
        })
      );
    }

    setGroupAssignments(payload);
    setShowGroupSetup(false);
    window.alert('Đã lưu thành công danh sách VĐV cho tất cả các bảng A-F.');
  };

  const createRandomGroupResults = playersList => {
    const list = Array.isArray(playersList) ? playersList.filter(Boolean) : [];
    const results = {};
    for (let i = 0; i < list.length; i += 1) {
      for (let j = i + 1; j < list.length; j += 1) {
        const winnerIsFirst = Math.random() >= 0.5;
        const loserSets = Math.floor(Math.random() * SETS_TO_WIN); // 0, 1 hoặc 2
        results[`${i}-${j}`] = winnerIsFirst ? `${SETS_TO_WIN}-${loserSets}` : `${loserSets}-${SETS_TO_WIN}`;
      }
    }
    return results;
  };

  const generateRandomResultsForGroup = async group => {
    if (!adminMode) return;
    const normalizedAssignments = normalizeGroupAssignments(groupAssignments);
    const playersList = (normalizedAssignments[group] || []).filter(Boolean);
    if (playersList.length < 2) {
      window.alert(`Bảng ${group} chưa có đủ VĐV để sinh kết quả test.`);
      return;
    }
    const results = createRandomGroupResults(playersList);
    const payload = {
      groupName: `Bảng ${group}`,
      players: normalizedAssignments[group] || [],
      results,
      manualSecondPlace: '',
      testGeneratedAt: Date.now(),
    };
    if (database) {
      await set(ref(database, `clb31tq/group-stage/group${group}`), payload);
    }
    if (group === activeGroup) {
      setActiveGroupData(payload);
    }
  };

  const generateRandomResultsForActiveGroup = async () => {
    const ok = window.confirm(`Sinh ngẫu nhiên kết quả test cho Bảng ${activeGroup}? Kết quả cũ của bảng này sẽ bị ghi đè.`);
    if (!ok) return;
    await generateRandomResultsForGroup(activeGroup);
    window.alert(`Đã sinh kết quả test cho Bảng ${activeGroup}.`);
  };

  const generateRandomResultsForAllGroups = async () => {
    const ok = window.confirm('Sinh ngẫu nhiên kết quả test cho tất cả Bảng A-F? Toàn bộ kết quả vòng bảng hiện tại sẽ bị ghi đè.');
    if (!ok) return;
    await Promise.all(groupTabs.map(group => generateRandomResultsForGroup(group)));
    window.alert('Đã sinh kết quả test cho tất cả Bảng A-F.');
  };

  const getPlayerNameFromRow = row => {
    const preferredKeys = ['Vận Động Viên', 'Vận động viên', 'VĐV', 'VDV', 'Họ tên', 'Tên', 'Name', 'name'];

    for (const key of preferredKeys) {
      if (row[key]) return String(row[key]).trim();
    }

    const values = Object.values(row)
      .map(value => String(value || '').trim())
      .filter(Boolean);

    return values.find(value => !/^\d+(\.0)?$/.test(value)) || '';
  };

  const importPlayersFromExcel = async event => {
    if (!adminMode) return;

    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

      const importedPlayers = rows
        .map(getPlayerNameFromRow)
        .map(name => name.trim())
        .filter(Boolean)
        .filter((name, index, arr) => arr.indexOf(name) === index);

      if (!importedPlayers.length) {
        window.alert('Không tìm thấy tên VĐV trong file Excel. Cột nên có tên: Vận Động Viên, VĐV, Họ tên hoặc Tên.');
        return;
      }

      await savePlayersToFirebase(importedPlayers);
      window.alert(`Đã import ${importedPlayers.length} VĐV từ Excel.`);
    } catch (error) {
      console.error(error);
      window.alert('Import Excel không thành công. Anh kiểm tra lại file .xlsx, .xls hoặc .csv.');
    } finally {
      event.target.value = '';
    }
  };

  const addPlayerToManager = () => {
    const name = newPlayerName.trim();
    if (!name) return;

    if (editingPlayers.includes(name)) {
      window.alert('Tên VĐV này đã có trong danh sách.');
      return;
    }

    setEditingPlayers([...editingPlayers, name]);
    setNewPlayerName('');
  };

  const openEditPlayer = index => {
    const parsed = splitPlayerLabel(editingPlayers[index]);
    setEditingPlayerIndex(index);
    setEditName(parsed.name);
    setEditRank(parsed.rank);
  };

  const closeEditPlayer = () => {
    setEditingPlayerIndex(null);
    setEditName('');
    setEditRank('B1');
  };

  const saveEditPlayer = () => {
    if (editingPlayerIndex === null) return;
    if (!editName.trim()) {
      window.alert('Tên VĐV không được để trống.');
      return;
    }

    const nextPlayers = [...editingPlayers];
    nextPlayers[editingPlayerIndex] = formatPlayerLabel(editName, editRank);
    setEditingPlayers(nextPlayers);
    closeEditPlayer();
  };

  const deletePlayerFromManager = index => {
    const name = editingPlayers[index];
    const confirmDelete = window.confirm(`Xóa VĐV "${name}" khỏi danh sách?`);
    if (!confirmDelete) return;
    setEditingPlayers(editingPlayers.filter((_, i) => i !== index));
  };

  const savePlayerManager = async () => {
    const oldPlayers = players;
    const newPlayers = editingPlayers
      .map(name => String(name || '').trim())
      .filter(Boolean)
      .filter((name, index, arr) => arr.indexOf(name) === index);

    const renameMap = {};
    oldPlayers.forEach((oldName, index) => {
      const newName = newPlayers[index];
      if (oldName && newName && oldName !== newName) {
        renameMap[oldName] = newName;
      }
    });

    const updatedMatches = normalizeMatches(data.matches).map(match => ({
      ...match,
      playerA: renameMap[match.playerA] || match.playerA,
      playerB: renameMap[match.playerB] || match.playerB,
    }));

    await savePlayersToFirebase(newPlayers);
    await saveData({ ...data, matches: updatedMatches });

    setShowPlayerManager(false);
    window.alert('Đã lưu danh sách VĐV.');
  };

  const changePoint = (id, side, delta) => {
    if (!adminMode) return;
    const matches = normalizeMatches(data.matches).map(m => {
      if (m.id !== id) return m;
      if (m.status === 'Kết thúc') return m;
      const field = side === 'A' ? 'scoreA' : 'scoreB';
      return { ...m, [field]: Math.max(0, Number(m[field] || 0) + delta) };
    });
    saveData({ ...data, matches });
  };

  const getSetWins = setHistory => {
    return (setHistory || []).reduce(
      (acc, setItem) => {
        const scoreA = Number(setItem.scoreA || 0);
        const scoreB = Number(setItem.scoreB || 0);

        if (scoreA > scoreB) acc.setA += 1;
        if (scoreB > scoreA) acc.setB += 1;

        return acc;
      },
      { setA: 0, setB: 0 }
    );
  };


  const cleanPlayerName = name => splitPlayerLabel(name).name.toLowerCase().trim();

  const isGroupStageLiveMatch = match => {
    const contentText = `${match.content || ''} ${match.customContent || ''}`.toLowerCase();
    return contentText.includes('vòng bảng') || contentText.includes('vong bang');
  };

  const getGroupSyncInfo = match => {
    if (!match?.playerA || !match?.playerB || !isGroupStageLiveMatch(match)) return null;

    const normalizedAssignments = normalizeGroupAssignments(groupAssignments);
    const playerAName = cleanPlayerName(match.playerA);
    const playerBName = cleanPlayerName(match.playerB);

    for (const group of groupTabs) {
      const groupPlayers = normalizedAssignments[group] || [];
      const normalizedPlayers = groupPlayers.map(cleanPlayerName);
      const playerAIndex = normalizedPlayers.indexOf(playerAName);
      const playerBIndex = normalizedPlayers.indexOf(playerBName);

      if (playerAIndex >= 0 && playerBIndex >= 0 && playerAIndex !== playerBIndex) {
        return { group, groupPlayers, playerAIndex, playerBIndex };
      }
    }

    return null;
  };

  const syncGroupStageResultFromLiveMatch = async match => {
    if (!database) return;

    const syncInfo = getGroupSyncInfo(match);
    if (!syncInfo) return;

    const { group, groupPlayers, playerAIndex, playerBIndex } = syncInfo;
    const setWins = getSetWins(match.setHistory || []);
    const firstIndex = Math.min(playerAIndex, playerBIndex);
    const secondIndex = Math.max(playerAIndex, playerBIndex);
    const firstPlayer = groupPlayers[firstIndex];
    const secondPlayer = groupPlayers[secondIndex];
    const firstScore = playerAIndex === firstIndex ? setWins.setA : setWins.setB;
    const secondScore = playerAIndex === firstIndex ? setWins.setB : setWins.setA;
    const isFinished = firstScore >= SETS_TO_WIN || secondScore >= SETS_TO_WIN;
    const winner = isFinished ? (firstScore > secondScore ? firstPlayer : secondPlayer) : '';
    const matchKey = `${firstIndex}-${secondIndex}`;
    const groupPath = `clb31tq/group-stage/group${group}`;

    if (firstScore === 0 && secondScore === 0) {
      await Promise.all([
        remove(ref(database, `${groupPath}/results/${matchKey}`)),
        remove(ref(database, `${groupPath}/matches/${matchKey}`)),
        remove(ref(database, `${groupPath}/liveScoreSync/${matchKey}`)),
      ]);
      return;
    }

    const resultText = `${firstScore}-${secondScore}`;
    const payload = {
      key: matchKey,
      source: 'live-score',
      group,
      playerA: firstPlayer,
      playerB: secondPlayer,
      scoreA: firstScore,
      scoreB: secondScore,
      setA: firstScore,
      setB: secondScore,
      livePlayerA: match.playerA,
      livePlayerB: match.playerB,
      liveScoreA: setWins.setA,
      liveScoreB: setWins.setB,
      setHistory: match.setHistory || [],
      winner,
      status: isFinished ? 'Kết thúc' : match.status || 'Đang thi đấu',
      updatedAt: Date.now(),
    };

    await Promise.all([
      set(ref(database, `${groupPath}/results/${matchKey}`), resultText),
      set(ref(database, `${groupPath}/matches/${matchKey}`), payload),
      set(ref(database, `${groupPath}/liveScoreSync/${matchKey}`), payload),
    ]);
  };

  const finishSet = async id => {
    if (!adminMode) return;

    let shouldSyncGroupStage = false;

    const matches = normalizeMatches(data.matches).map(m => {
      if (m.id !== id) return m;
      if (m.status === 'Kết thúc') {
        window.alert('Trận này đã kết thúc. Bấm Reset nếu muốn bắt đầu lại.');
        return m;
      }

      const scoreA = Number(m.scoreA || 0);
      const scoreB = Number(m.scoreB || 0);

      if (scoreA === 0 && scoreB === 0) {
        window.alert('Set hiện tại đang 0-0 nên chưa lưu được.');
        return m;
      }

      if (scoreA === scoreB) {
        window.alert('Tỷ số đang hòa, chưa thể kết thúc set.');
        return m;
      }

      const nextSetHistory = [...(m.setHistory || []), { scoreA, scoreB }];
      const calculatedWins = getSetWins(nextSetHistory);
      const nextSetA = calculatedWins.setA;
      const nextSetB = calculatedWins.setB;
      const isFinished = nextSetA >= SETS_TO_WIN || nextSetB >= SETS_TO_WIN;
      const winner = isFinished ? (nextSetA > nextSetB ? m.playerA : m.playerB) : '';

      shouldSyncGroupStage = isGroupStageLiveMatch(m);

      return {
        ...m,
        scoreA: 0,
        scoreB: 0,
        setA: nextSetA,
        setB: nextSetB,
        setHistory: nextSetHistory,
        winner,
        status: isFinished ? 'Kết thúc' : 'Đang thi đấu',
      };
    });

    await saveData({ ...data, matches });

    if (shouldSyncGroupStage) {
      const syncedMatch = matches.find(m => m.id === id);
      await syncGroupStageResultFromLiveMatch(syncedMatch);
    }
  };

  const resetScore = async id => {
    if (!adminMode) return;

    const matches = normalizeMatches(data.matches).map(m => {
      if (m.id !== id) return m;

      return {
        ...m,
        playerA: '',
        playerB: '',
        content: '',
        customContent: '',
        scoreA: 0,
        scoreB: 0,
        setA: 0,
        setB: 0,
        setHistory: [],
        winner: '',
        status: 'Đang thi đấu',
      };
    });

    await saveData({ ...data, matches });
  };

  const undoLastSet = async id => {
    if (!adminMode) return;

    let shouldSyncGroupStage = false;
    let hasSetToUndo = false;

    const matches = normalizeMatches(data.matches).map(m => {
      if (m.id !== id) return m;

      const currentHistory = m.setHistory || [];
      if (!currentHistory.length) {
        window.alert('Chưa có set nào để hoàn tác.');
        return m;
      }

      hasSetToUndo = true;
      shouldSyncGroupStage = isGroupStageLiveMatch(m);
      const nextSetHistory = currentHistory.slice(0, -1);
      const calculatedWins = getSetWins(nextSetHistory);

      return {
        ...m,
        scoreA: 0,
        scoreB: 0,
        setA: calculatedWins.setA,
        setB: calculatedWins.setB,
        setHistory: nextSetHistory,
        winner: '',
        status: 'Đang thi đấu',
      };
    });

    if (!hasSetToUndo) return;

    await saveData({ ...data, matches });

    if (shouldSyncGroupStage) {
      const syncedMatch = matches.find(m => m.id === id);
      await syncGroupStageResultFromLiveMatch(syncedMatch);
    }
  };

  const handleAdminToggle = () => {
    if (adminMode) {
      sessionStorage.removeItem('clb31tq-admin-auth');
      setAdminMode(false);
      return;
    }

    const pwd = window.prompt('Nhập mật khẩu Admin để nhập điểm');
    if (pwd === ADMIN_PASSWORD) {
      sessionStorage.setItem('clb31tq-admin-auth', '1');
      setAdminMode(true);
    } else if (pwd !== null) {
      window.alert('Sai mật khẩu Admin');
    }
  };

  const statusClass = status => {
    if (status === 'Đang thi đấu') return 'bg-red-600 text-white';
    if (status === 'Kết thúc') return 'bg-emerald-600 text-white';
    return 'bg-amber-400 text-slate-950';
  };

  const lastUpdated = data.updatedAt
    ? new Date(data.updatedAt).toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    : '--:--:--';

  const activeGroupBaseStandings = useMemo(() => {
    const playersForGroup = Array.isArray(activeGroupData.players) && activeGroupData.players.length
      ? activeGroupData.players.filter(Boolean)
      : groupAssignments[activeGroup] || [];
    return computeGroupStandingsForManual(playersForGroup, activeGroupData.results || {});
  }, [activeGroupData, groupAssignments, activeGroup]);

  const activeGroupStandings = useMemo(
    () => applyManualRanking(activeGroupBaseStandings, activeGroupData.manualRanking || {}),
    [activeGroupBaseStandings, activeGroupData.manualRanking]
  );

  const rankingTieGroups = useMemo(() => getRankingTieGroups(activeGroupBaseStandings), [activeGroupBaseStandings]);

  const saveManualRankingOrder = async (tieKey, order) => {
    if (!adminMode || !database) return;
    const nextManualRanking = {
      ...(activeGroupData.manualRanking || {}),
      [tieKey]: order,
    };
    await set(ref(database, `clb31tq/group-stage/group${activeGroup}/manualRanking`), nextManualRanking);
  };

  const clearManualRankingOrder = async tieKey => {
    if (!adminMode || !database) return;
    const nextManualRanking = { ...(activeGroupData.manualRanking || {}) };
    delete nextManualRanking[tieKey];
    await set(ref(database, `clb31tq/group-stage/group${activeGroup}/manualRanking`), nextManualRanking);
  };

  const moveManualRankingItem = async (tieGroup, itemIndex, direction) => {
    const currentOrder = Array.isArray(activeGroupData.manualRanking?.[tieGroup.key])
      ? [...activeGroupData.manualRanking[tieGroup.key]]
      : tieGroup.items.map(item => item.name);
    const nextIndex = itemIndex + direction;
    if (nextIndex < 0 || nextIndex >= currentOrder.length) return;
    const nextOrder = [...currentOrder];
    [nextOrder[itemIndex], nextOrder[nextIndex]] = [nextOrder[nextIndex], nextOrder[itemIndex]];
    await saveManualRankingOrder(tieGroup.key, nextOrder);
  };

  const ManualRankingPanel = () => {
    if (!adminMode || rankingTieGroups.length < 1) return null;
    return (
      <div className="rounded-3xl border border-amber-300 bg-amber-50 p-4 shadow-inner">
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-xl font-black text-amber-800">Xử lý đồng hạng Bảng {activeGroup}</div>
            <div className="text-sm font-semibold text-slate-600">
              Nếu các VĐV vẫn bằng nhau sau số trận thắng, hiệu số set và đối đầu, BTC bốc thăm rồi sắp lại thứ tự tại đây. Thứ tự này sẽ được dùng cho hạng 1, 2, 3 hoặc 4 tùy nhóm đang tranh.
            </div>
          </div>
          <div className="rounded-xl bg-white px-3 py-2 text-sm font-black text-amber-800 shadow-sm">
            {rankingTieGroups.length} nhóm đồng hạng
          </div>
        </div>
        <div className="space-y-3">
          {rankingTieGroups.map(tieGroup => {
            const currentOrder = Array.isArray(activeGroupData.manualRanking?.[tieGroup.key])
              ? activeGroupData.manualRanking[tieGroup.key]
              : tieGroup.items.map(item => item.name);
            const itemMap = tieGroup.items.reduce((acc, item) => ({ ...acc, [item.name]: item }), {});
            return (
              <div key={tieGroup.key} className="rounded-2xl bg-white p-3 shadow-sm">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <div className="font-black text-slate-900">
                    Tranh hạng {tieGroup.startRank}{tieGroup.endRank !== tieGroup.startRank ? `-${tieGroup.endRank}` : ''}
                  </div>
                  <button
                    type="button"
                    onClick={() => clearManualRankingOrder(tieGroup.key)}
                    className="rounded-xl border border-amber-300 bg-white px-3 py-2 text-sm font-bold text-amber-800 hover:bg-amber-100"
                  >
                    Bỏ sắp tay
                  </button>
                </div>
                <div className="space-y-2">
                  {currentOrder.map((name, index) => {
                    const item = itemMap[name];
                    if (!item) return null;
                    return (
                      <div key={name} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2">
                        <div className="w-20 rounded-lg bg-amber-500 px-2 py-1 text-center text-sm font-black text-slate-950">
                          Hạng {tieGroup.startRank + index}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-black text-slate-900">{name}</div>
                          <div className="text-xs font-bold text-slate-500">
                            Thắng {item.wins} • HS {item.setDiff > 0 ? `+${item.setDiff}` : item.setDiff} • Đối đầu {item.h2hWins} thắng, HS {item.h2hSetDiff > 0 ? `+${item.h2hSetDiff}` : item.h2hSetDiff}
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <button
                            type="button"
                            disabled={index === 0}
                            onClick={() => moveManualRankingItem(tieGroup, index, -1)}
                            className="rounded-lg border border-slate-300 bg-white px-3 py-2 font-black disabled:opacity-40"
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            disabled={index === currentOrder.length - 1}
                            onClick={() => moveManualRankingItem(tieGroup, index, 1)}
                            className="rounded-lg border border-slate-300 bg-white px-3 py-2 font-black disabled:opacity-40"
                          >
                            ↓
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const thirdPlaceCandidates = useMemo(() => {
    return groupTabs
      .map(group => {
        const groupData = allGroupStageData[`group${group}`] || {};
        const playersForGroup = Array.isArray(groupData.players) && groupData.players.length
          ? groupData.players.filter(Boolean)
          : groupAssignments[group] || [];
        const standingsForGroup = applyManualRanking(
          computeGroupStandingsForManual(playersForGroup, groupData.results || {}),
          groupData.manualRanking || {}
        );
        const third = standingsForGroup[2];
        return third ? { ...third, group } : null;
      })
      .filter(Boolean)
      .sort((a, b) => {
        if (b.wins !== a.wins) return b.wins - a.wins;
        if (b.setDiff !== a.setDiff) return b.setDiff - a.setDiff;
        return a.name.localeCompare(b.name, 'vi');
      });
  }, [allGroupStageData, groupAssignments, groupTabs]);

  const selectedTopThirds = Array.isArray(allGroupStageData.selectedTopThirds) ? allGroupStageData.selectedTopThirds : [];

  const toggleTopThirdSelection = async name => {
    if (!adminMode || !database) return;
    const current = selectedTopThirds.filter(Boolean);
    const exists = current.includes(name);
    let next = exists ? current.filter(item => item !== name) : [...current, name];
    if (next.length > 4) {
      window.alert('Chỉ được chọn tối đa 4 VĐV hạng 3 xuất sắc cho Serie A.');
      return;
    }
    await set(ref(database, 'clb31tq/group-stage/selectedTopThirds'), next);
  };

  const autoPickTopThirds = async () => {
    if (!adminMode || !database) return;
    const next = thirdPlaceCandidates.slice(0, 4).map(item => item.name);
    await set(ref(database, 'clb31tq/group-stage/selectedTopThirds'), next);
  };

  const clearTopThirds = async () => {
    if (!adminMode || !database) return;
    await set(ref(database, 'clb31tq/group-stage/selectedTopThirds'), []);
  };

  const TopThirdSelectionPanel = () => {
    if (!adminMode) return null;
    return (
      <div className="rounded-3xl border border-purple-200 bg-purple-50 p-4 shadow-inner">
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-xl font-black text-purple-900">Chọn 4 VĐV hạng 3 xuất sắc</div>
            <div className="text-sm font-semibold text-slate-600">
              Danh sách bên dưới là 6 VĐV đang xếp hạng 3 của các bảng A-F. Anh tick chọn 4 VĐV vào Serie A, 2 VĐV còn lại sẽ dùng cho Serie B nếu cần.
            </div>
          </div>
          <div className="rounded-xl bg-white px-3 py-2 text-sm font-black text-purple-800 shadow-sm">
            Đã chọn {selectedTopThirds.length}/4
          </div>
        </div>
        <div className="mb-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={autoPickTopThirds}
            className="rounded-xl bg-purple-700 px-4 py-2 font-bold text-white hover:bg-purple-800"
          >
            Tự chọn theo chỉ số
          </button>
          <button
            type="button"
            onClick={clearTopThirds}
            className="rounded-xl border border-purple-300 bg-white px-4 py-2 font-bold text-purple-800 hover:bg-purple-100"
          >
            Xóa chọn
          </button>
        </div>
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {thirdPlaceCandidates.map(item => {
            const checked = selectedTopThirds.includes(item.name);
            return (
              <label
                key={`${item.group}-${item.name}`}
                className={classNames(
                  'flex cursor-pointer items-center gap-3 rounded-2xl border p-3 shadow-sm transition',
                  checked ? 'border-purple-600 bg-white ring-2 ring-purple-300' : 'border-purple-100 bg-white hover:bg-purple-100'
                )}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleTopThirdSelection(item.name)}
                  className="h-5 w-5 accent-purple-700"
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-base font-black text-slate-900">{item.name}</div>
                  <div className="mt-1 text-xs font-bold text-slate-500">
                    Bảng {item.group} • Thắng {item.wins} • HS {item.setDiff > 0 ? `+${item.setDiff}` : item.setDiff} • Set {item.setFor}-{item.setAgainst}
                  </div>
                </div>
                <div className="rounded-xl bg-purple-100 px-2 py-1 text-xs font-black text-purple-800">H3{item.group}</div>
              </label>
            );
          })}
        </div>
        {!thirdPlaceCandidates.length && (
          <div className="rounded-2xl bg-white px-4 py-3 text-sm font-bold text-slate-600">
            Chưa có đủ dữ liệu vòng bảng để xác định VĐV hạng 3.
          </div>
        )}
      </div>
    );
  };

  const EditPlayerPopup = () => {
    if (editingPlayerIndex === null) return null;

    const rankOptions = ranks.includes(editRank) ? ranks : [editRank, ...ranks];

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
        <div className="w-full max-w-md rounded-3xl bg-white p-5 shadow-2xl">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <div className="text-xl font-black text-slate-900">Sửa thông tin VĐV</div>
              <div className="mt-1 text-sm font-semibold text-slate-500">
                Đổi tên hoặc chọn nhanh hạng, không cần gõ lại toàn bộ.
              </div>
            </div>
            <button onClick={closeEditPlayer} className="rounded-xl border border-slate-300 p-2 text-slate-700">
              <X size={18} />
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-sm font-bold text-slate-700">Tên VĐV</label>
              <input
                value={editName}
                onChange={e => setEditName(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-base font-bold outline-none focus:border-emerald-600"
                autoFocus
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-bold text-slate-700">Hạng</label>
              <select
                value={editRank}
                onChange={e => setEditRank(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base font-bold outline-none focus:border-emerald-600"
              >
                {rankOptions.map(rank => (
                  <option key={rank} value={rank}>
                    {rank}
                  </option>
                ))}
              </select>
            </div>

            <div className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-600">
              Sau khi lưu: <span className="font-black text-slate-900">{formatPlayerLabel(editName, editRank)}</span>
            </div>
          </div>

          <div className="mt-5 flex justify-end gap-2">
            <button onClick={closeEditPlayer} className="rounded-xl border border-slate-300 px-4 py-3 font-bold text-slate-700">
              Hủy
            </button>
            <button onClick={saveEditPlayer} className="rounded-xl bg-emerald-600 px-5 py-3 font-bold text-white hover:bg-emerald-700">
              Lưu
            </button>
          </div>
        </div>
      </div>
    );
  };

  const PlayerManagerPanel = () => (
    <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-4 shadow-inner">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <div className="text-xl font-black text-emerald-800">Quản lý VĐV</div>
          <div className="text-sm font-semibold text-slate-600">
            Thêm, sửa hoặc xóa tên VĐV. Bấm Lưu danh sách để cập nhật Firebase.
          </div>
        </div>

        <button
          onClick={() => setShowPlayerManager(false)}
          className="rounded-xl border border-slate-300 bg-white px-3 py-2 font-bold text-slate-700"
        >
          <X size={16} />
        </button>
      </div>

      <div className="mb-4 grid gap-2 sm:grid-cols-[1fr_auto]">
        <input
          value={newPlayerName}
          onChange={e => setNewPlayerName(e.target.value)}
          placeholder="Nhập tên VĐV mới, VD: Tuấn Anh - B1"
          className="w-full rounded-xl border border-emerald-300 bg-white px-4 py-3 text-base font-bold outline-none focus:border-emerald-600"
        />

        <button
          onClick={addPlayerToManager}
          className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 font-bold text-white hover:bg-emerald-700"
        >
          <UserPlus size={16} />
          Thêm VĐV
        </button>
      </div>

      <div className="max-h-96 space-y-2 overflow-y-auto pr-1">
        {editingPlayers.map((name, index) => (
          <div key={`${name}-${index}`} className="flex items-center justify-between gap-3 rounded-2xl bg-white p-3 shadow-sm">
            <div className="min-w-0 flex-1 truncate text-base font-black text-slate-900 sm:text-lg">{name}</div>

            <div className="flex shrink-0 gap-2">
              <button
                onClick={() => openEditPlayer(index)}
                className="flex items-center justify-center gap-1 rounded-xl bg-blue-600 px-3 py-2 font-bold text-white hover:bg-blue-700"
              >
                <Pencil size={16} />
                Sửa
              </button>

              <button
                onClick={() => deletePlayerFromManager(index)}
                className="flex items-center justify-center gap-1 rounded-xl border border-red-200 px-3 py-2 font-bold text-red-600 hover:bg-red-50"
              >
                <Trash2 size={16} />
                Xóa
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <button
          onClick={() => {
            setEditingPlayers(players);
            setNewPlayerName('');
            closeEditPlayer();
          }}
          className="rounded-xl border border-slate-300 bg-white px-4 py-3 font-bold text-slate-700"
        >
          Hoàn tác
        </button>

        <button
          onClick={savePlayerManager}
          className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 font-bold text-white hover:bg-emerald-700"
        >
          <Save size={16} />
          Lưu danh sách
        </button>
      </div>

      <EditPlayerPopup />
    </div>
  );

  const GroupSetupPanel = () => {
    const currentAssignments = normalizeGroupAssignments(editingGroupAssignments);
    const currentGroupPlayers = currentAssignments[activeGroup] || Array(PLAYERS_PER_GROUP).fill('');
    const selectedInOtherGroups = Object.entries(currentAssignments)
      .filter(([group]) => group !== activeGroup)
      .flatMap(([, groupPlayers]) => groupPlayers)
      .filter(Boolean);

    const getDropdownOptions = slotIndex => {
      const currentValue = currentGroupPlayers[slotIndex];
      const selectedInCurrentGroup = currentGroupPlayers.filter((name, index) => name && index !== slotIndex);

      return [currentValue, ...players]
        .filter(Boolean)
        .filter((name, index, arr) => arr.indexOf(name) === index)
        .filter(name => name === currentValue || (!selectedInOtherGroups.includes(name) && !selectedInCurrentGroup.includes(name)));
    };

    const filledSlots = currentGroupPlayers.filter(Boolean).length;

    return (
      <div className="rounded-3xl border border-blue-200 bg-blue-50 p-4 shadow-inner">
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-xl font-black text-blue-900">Thiết lập VĐV Bảng {activeGroup}</div>
            <div className="text-sm font-semibold text-slate-600">
              Sau khi bốc thăm thủ công, chọn nhanh 4 VĐV bằng dropdown rồi bấm Lưu. App sẽ dùng danh sách này cho vòng bảng.
            </div>
          </div>
          <div className="rounded-xl bg-white px-3 py-2 text-sm font-black text-blue-800 shadow-sm">
            Đã chọn {filledSlots}/{PLAYERS_PER_GROUP}
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: PLAYERS_PER_GROUP }, (_, index) => (
            <div key={index} className="rounded-2xl bg-white p-3 shadow-sm">
              <label className="mb-1 block text-sm font-black text-slate-700">VĐV {index + 1}</label>
              <select
                value={currentGroupPlayers[index] || ''}
                onChange={e => updateEditingGroupPlayer(activeGroup, index, e.target.value)}
                className="w-full rounded-xl border border-blue-200 bg-white px-3 py-3 text-base font-bold text-slate-900 outline-none focus:border-blue-600"
              >
                <option value="">Chọn VĐV</option>
                {getDropdownOptions(index).map(name => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>

        <div className="mt-4 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-600">
          Ghi chú: VĐV đã được chọn ở bảng khác sẽ tự ẩn khỏi dropdown để tránh trùng người. Nếu cần đổi bảng, bỏ chọn VĐV ở bảng cũ trước.
        </div>

        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <button
            onClick={() => setEditingGroupAssignments(normalizeGroupAssignments(groupAssignments))}
            className="rounded-xl border border-slate-300 bg-white px-4 py-3 font-bold text-slate-700"
          >
            Hoàn tác
          </button>
          <button
            onClick={() => setShowGroupSetup(false)}
            className="rounded-xl border border-slate-300 bg-white px-4 py-3 font-bold text-slate-700"
          >
            Đóng
          </button>
          <button
            onClick={saveGroupSetup}
            className="flex items-center gap-2 rounded-xl bg-blue-700 px-5 py-3 font-bold text-white hover:bg-blue-800"
          >
            <Save size={16} />
            Lưu Bảng {activeGroup}
          </button>
        </div>
      </div>
    );
  };

  const MatchCard = ({ match }) => {
    const leaderA = Number(match.scoreA) > Number(match.scoreB);
    const leaderB = Number(match.scoreB) > Number(match.scoreA);
    const canEdit = adminMode;
    const setHistoryText = (match.setHistory || []).map(s => `${s.scoreA}-${s.scoreB}`).join(' | ');
    const calculatedWins = getSetWins(match.setHistory || []);
    const displaySetA = calculatedWins.setA;
    const displaySetB = calculatedWins.setB;
    const isFinished = displaySetA >= SETS_TO_WIN || displaySetB >= SETS_TO_WIN;
    const winnerName = isFinished ? (displaySetA > displaySetB ? match.playerA : match.playerB) : '';
    const displayContent = String(match.customContent || '').trim() || (match.content === 'Khác' ? '' : match.content || '');

    const playerAOptions = [match.playerA, ...players]
      .filter(Boolean)
      .filter((p, index, arr) => arr.indexOf(p) === index)
      .filter(p => p !== match.playerB);

    const playerBOptions = [match.playerB, ...players]
      .filter(Boolean)
      .filter((p, index, arr) => arr.indexOf(p) === index)
      .filter(p => p !== match.playerA);

    return (
      <div
        className={classNames(
          'overflow-hidden rounded-3xl border border-white/10 bg-white shadow-2xl',
          match.status === 'Đang thi đấu' && 'ring-4 ring-red-500/40',
          isFinished && 'ring-4 ring-emerald-500/50'
        )}
      >
        <div className="flex items-center justify-between bg-slate-950 px-4 py-3 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-red-600 text-lg font-black">
              {match.id}
            </div>
            <div className="min-w-0">
              {canEdit ? (
                <input
                  value={match.table}
                  onChange={e => updateMatch(match.id, 'table', e.target.value)}
                  className="w-28 bg-transparent text-lg font-black outline-none"
                />
              ) : (
                <div className="text-lg font-black">{match.table}</div>
              )}
            </div>
          </div>

          {canEdit ? (
            <select
              value={match.status}
              onChange={e => updateMatch(match.id, 'status', e.target.value)}
              className={classNames('rounded-full px-3 py-1 text-sm font-bold outline-none', statusClass(match.status))}
            >
              {statusOptions.map(s => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          ) : (
            <div className={classNames('rounded-full px-3 py-1 text-sm font-bold', statusClass(match.status))}>
              {match.status}
            </div>
          )}
        </div>

        {canEdit ? (
          <div className="border-b bg-yellow-50 p-3">
            <div className="grid gap-2 sm:grid-cols-[180px_1fr]">
              <select
                value={match.content || ''}
                onChange={e => updateMatch(match.id, 'content', e.target.value)}
                className="w-full rounded-xl border border-yellow-300 bg-white px-3 py-3 text-base font-black text-slate-900 outline-none focus:border-red-500"
              >
                <option value="">Chọn nội dung thi đấu</option>
                {matchTypes.map(item => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>

              <input
                defaultValue={match.customContent || ''}
                onBlur={e => updateMatch(match.id, 'customContent', e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.currentTarget.blur();
                  }
                }}
                placeholder="Nội dung khác nếu cần"
                className="w-full rounded-xl border border-yellow-300 bg-white px-3 py-3 text-base font-bold text-slate-900 outline-none focus:border-red-500"
              />
            </div>
          </div>
        ) : (
          displayContent && (
            <div className="border-b bg-yellow-50 px-4 py-3 text-center">
              <div className="text-xl font-black uppercase tracking-wide text-red-700">{displayContent}</div>
            </div>
          )
        )}

        <div className="grid grid-cols-[1fr_46px_1fr] bg-white sm:grid-cols-[1fr_64px_1fr]">
          <div className={classNames('p-3 sm:p-5', leaderA && 'bg-red-50')}>
            {canEdit ? (
              <select
                value={match.playerA}
                onChange={e => updateMatch(match.id, 'playerA', e.target.value)}
                className="mt-1 mb-3 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-lg font-black text-slate-900 outline-none focus:border-red-500 sm:text-xl"
              >
                <option value="">Chọn người chơi</option>
                {playerAOptions.map(p => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            ) : (
              <div className="mb-4 min-h-12 text-xl font-black text-slate-950 sm:text-2xl">{match.playerA}</div>
            )}

            <div className="text-left sm:text-right">
              <div className="text-xs font-bold text-slate-500">ĐIỂM</div>
              <div className="flex items-center gap-2 sm:justify-end">
                {canEdit && (
                  <button disabled={isFinished} className="rounded-lg border px-2 py-1 disabled:opacity-40" onClick={() => changePoint(match.id, 'A', -1)}>
                    <Minus size={14} />
                  </button>
                )}
                <div className={classNames('min-w-16 text-center text-6xl font-black tracking-tight sm:text-7xl', leaderA ? 'text-red-600' : 'text-slate-950')}>
                  {match.scoreA}
                </div>
                {canEdit && (
                  <button disabled={isFinished} className="rounded-lg bg-red-600 px-2 py-1 text-white disabled:opacity-40" onClick={() => changePoint(match.id, 'A', 1)}>
                    <Plus size={14} />
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center bg-slate-100 px-2 text-slate-500">
            <div className="text-lg font-black sm:text-2xl">VS</div>
            <div className="mt-2 text-center text-xs font-black text-slate-700">{displaySetA}-{displaySetB}</div>
          </div>

          <div className={classNames('p-3 sm:p-5', leaderB && 'bg-blue-50')}>
            {canEdit ? (
              <select
                value={match.playerB}
                onChange={e => updateMatch(match.id, 'playerB', e.target.value)}
                className="mt-1 mb-3 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-right text-lg font-black text-slate-900 outline-none focus:border-blue-500 sm:text-xl"
              >
                <option value="">Chọn người chơi</option>
                {playerBOptions.map(p => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            ) : (
              <div className="mb-4 min-h-12 text-right text-xl font-black text-slate-950 sm:text-2xl">{match.playerB}</div>
            )}

            <div>
              <div className="text-xs font-bold text-slate-500">ĐIỂM</div>
              <div className="flex items-center gap-2">
                {canEdit && (
                  <button disabled={isFinished} className="rounded-lg border px-2 py-1 disabled:opacity-40" onClick={() => changePoint(match.id, 'B', -1)}>
                    <Minus size={14} />
                  </button>
                )}
                <div className={classNames('min-w-16 text-center text-6xl font-black tracking-tight sm:text-7xl', leaderB ? 'text-blue-600' : 'text-slate-950')}>
                  {match.scoreB}
                </div>
                {canEdit && (
                  <button disabled={isFinished} className="rounded-lg bg-blue-600 px-2 py-1 text-white disabled:opacity-40" onClick={() => changePoint(match.id, 'B', 1)}>
                    <Plus size={14} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {(match.setHistory || []).length > 0 && (
          <div className="border-t bg-yellow-50 px-4 py-3 text-center">
            <div className="text-sm font-black uppercase tracking-wider text-slate-600">Lịch sử set</div>
            <div className="mt-2 rounded-xl bg-white px-4 py-3 text-2xl font-black tracking-wider text-red-700 shadow">{setHistoryText}</div>
            {isFinished && winnerName && (
              <div className="mt-3 rounded-2xl bg-emerald-600 px-4 py-3 text-2xl font-black text-white shadow">
                Thắng trận: {winnerName} ({displaySetA}-{displaySetB})
              </div>
            )}
          </div>
        )}

        {canEdit && (
          <div className="flex flex-wrap items-center justify-end gap-2 border-t bg-slate-50 p-3">
            <button
              disabled={isFinished}
              className="flex items-center gap-1 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-400"
              onClick={() => finishSet(match.id)}
            >
              <CheckCircle2 size={15} />
              Sang Set Tiếp Theo
            </button>
            <button
              disabled={!(match.setHistory || []).length}
              className="flex items-center gap-1 rounded-xl border border-amber-300 px-3 py-2 text-sm font-bold text-amber-700 hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-40"
              onClick={() => undoLastSet(match.id)}
            >
              <RotateCcw size={15} />
              Hoàn tác Set cuối
            </button>
            <button className="flex items-center gap-1 rounded-xl border border-slate-300 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-white" onClick={() => resetScore(match.id)}>
              <RotateCcw size={15} />
              Reset
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-700 via-slate-950 to-blue-900 p-2 text-slate-950 sm:p-5">
      <div className="mx-auto max-w-7xl">
<div className="mb-3 overflow-hidden rounded-3xl bg-white/95 shadow-2xl sm:mb-5">
  <div className="bg-gradient-to-r from-red-700 via-red-600 to-yellow-400 px-4 py-3 text-white sm:px-5 sm:py-5">
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0 flex-1">
        {adminMode ? (
          <input
            value={data.clubTitle}
            onChange={e => updateField('clubTitle', e.target.value)}
            className="w-full bg-transparent text-base font-black tracking-wide outline-none sm:text-2xl md:text-4xl"
          />
        ) : (
          <h1 className="truncate text-base font-black tracking-wide sm:text-2xl md:text-4xl">
            {data.clubTitle}
          </h1>
        )}

        {adminMode ? (
          <input
            value={data.eventTitle}
            onChange={e => updateField('eventTitle', e.target.value)}
            className="mt-0.5 w-full bg-transparent text-sm font-black tracking-wide outline-none sm:mt-1 sm:text-xl md:text-3xl"
          />
        ) : (
          <h2 className="hidden sm:mt-1 sm:block sm:text-xl sm:font-black sm:tracking-wide md:text-3xl">
            {data.eventTitle}
          </h2>
        )}

        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-bold text-yellow-100 sm:mt-2 sm:text-sm">
          <span className="hidden items-center gap-2 sm:flex">
            <Clock size={16} /> {data.note}
          </span>

          <span className="flex items-center gap-1.5">
            {connected ? <Wifi size={14} /> : <WifiOff size={14} />}
            {connected ? 'Online' : hasFirebaseConfig ? 'Đang kết nối' : 'Demo local'}
          </span>

          <span>Cập nhật: {lastUpdated}</span>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1.5 overflow-x-auto whitespace-nowrap">
        <button
          onClick={handleAdminToggle}
          className="flex items-center gap-1 rounded-xl bg-white px-3 py-2 text-sm font-black text-slate-950 shadow hover:bg-yellow-50 sm:gap-2 sm:px-4"
        >
          {adminMode ? <ShieldCheck size={15} /> : <Eye size={15} />}
          {adminMode ? 'Thoát' : 'Admin'}
        </button>

        {adminMode && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={importPlayersFromExcel}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="hidden items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-bold text-blue-700 hover:bg-yellow-50 sm:flex"
            >
              <Upload size={16} />
              Import VĐV Excel
            </button>
          </>
        )}

        {adminMode && (
          <button
            onClick={() => setShowPlayerManager(!showPlayerManager)}
            className="hidden items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-bold text-emerald-700 hover:bg-yellow-50 sm:flex"
          >
            <UserPlus size={16} />
            Quản lý VĐV
          </button>
        )}
      </div>
    </div>
  </div>

  <div className="space-y-2 p-2 sm:space-y-3 sm:p-4">
    <div
      className={classNames(
        'sticky top-1 z-30 grid gap-1 rounded-2xl bg-white/95 p-1.5 shadow-lg ring-1 ring-slate-200 sm:top-2 sm:gap-2 sm:p-2',
        adminMode ? 'grid-cols-5' : 'grid-cols-4'
      )}
    >
      <button
        onClick={() => setActivePage('live')}
        className={classNames(
          'w-full rounded-xl px-1 py-1.5 text-center text-[10px] font-black leading-tight sm:px-4 sm:py-2 sm:text-sm',
          activePage === 'live'
            ? 'bg-red-600 text-white'
            : 'border border-slate-300 bg-white text-slate-700'
        )}
      >
        Live Score
      </button>

      <button
        onClick={() => setActivePage('group')}
        className={classNames(
          'w-full rounded-xl px-1 py-1.5 text-center text-[10px] font-black leading-tight sm:px-4 sm:py-2 sm:text-sm',
          activePage === 'group'
            ? 'bg-blue-700 text-white'
            : 'border border-slate-300 bg-white text-slate-700'
        )}
      >
        Vòng bảng
      </button>

      <button
        onClick={() => setActivePage('knockout')}
        className={classNames(
          'w-full rounded-xl px-1 py-1.5 text-center text-[10px] font-black leading-tight sm:px-4 sm:py-2 sm:text-sm',
          activePage === 'knockout'
            ? 'bg-emerald-700 text-white'
            : 'border border-slate-300 bg-white text-slate-700'
        )}
      >
        Knock Out Serie A
      </button>

      <button
        onClick={() => setActivePage('knockoutB')}
        className={classNames(
          'w-full rounded-xl px-1 py-1.5 text-center text-[10px] font-black leading-tight sm:px-4 sm:py-2 sm:text-sm',
          activePage === 'knockoutB'
            ? 'bg-purple-700 text-white'
            : 'border border-slate-300 bg-white text-slate-700'
        )}
      >
        Knock Out Serie B
      </button>

      {adminMode && (
        <button
          onClick={() => setActivePage('schedule')}
          className={classNames(
            'w-full rounded-xl px-1 py-1.5 text-center text-[10px] font-black leading-tight sm:px-4 sm:py-2 sm:text-sm',
            activePage === 'schedule'
              ? 'bg-amber-600 text-white'
              : 'border border-slate-300 bg-white text-slate-700'
          )}
        >
          📅 Lịch Thi Đấu
        </button>
      )}
    </div>

    <div className="hidden flex-col gap-3 sm:flex lg:flex-row lg:items-center lg:justify-between">
      <div className="flex items-center gap-2 text-sm font-bold text-slate-600">
        <Edit3 size={16} />
        {adminMode
          ? activePage === 'live'
            ? 'Chỉ hiển thị 4 bàn cố định. Có thể Import VĐV từ Excel hoặc Quản lý VĐV trực tiếp.'
            : activePage === 'group'
            ? 'Vòng bảng: chọn Bảng A-F để xem từng bảng, nhập kết quả theo từng ô đối đầu và tự tính xếp hạng.'
            : activePage === 'knockout'
            ? 'Knock Out Serie A nhập tỷ số để tự chuyển người thắng lên vòng tiếp theo.'
            : activePage === 'schedule'
            ? 'Lịch thi đấu tự động xếp theo từng cặp trên toàn bộ bảng, 4 bàn cố định và bắt đầu mặc định từ 08:00.'
            : 'Knock Out Serie B nhập tỷ số để tự chuyển người thắng lên vòng tiếp theo.'
          : activePage === 'live'
          ? 'Đây là link xem cho ACE CLB. Không cần bấm gì, tỷ số sẽ tự cập nhật.'
          : activePage === 'group'
          ? 'Đây là trang xem vòng bảng. Chọn Bảng A-F để xem từng bảng.'
          : activePage === 'knockout'
          ? 'Đây là trang xem sơ đồ Knock Out Serie A. Kết quả sẽ tự cập nhật realtime.'
          : activePage === 'schedule'
          ? 'Lịch thi đấu chỉ hiển thị trong Admin mode.'
          : 'Đây là trang xem sơ đồ Knock Out Serie B. Kết quả sẽ tự cập nhật realtime.'}
      </div>

      {activePage === 'live' && (
        <div className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-700">
          4 bàn cố định
        </div>
      )}
    </div>

    {adminMode && showPlayerManager && <PlayerManagerPanel />}
  </div>
</div>


        {activePage === 'live' ? (
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            {visibleMatches.map(match => (
              <MatchCard key={match.id} match={match} />
            ))}
          </div>
        ) : activePage === 'group' ? (
          <div className="space-y-4">
            <div className="rounded-3xl bg-white/95 p-3 shadow-xl">
              <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-lg font-black text-slate-900 sm:text-xl">Vòng bảng</div>
                  <div className="text-sm font-semibold text-slate-600">
                    Chọn bảng A-F để xem vòng bảng, hoặc chọn H3 để chọn 4 VĐV hạng 3 xuất sắc.
                  </div>
                </div>

                {adminMode && activeGroup !== 'H3' && (
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={generateRandomResultsForActiveGroup}
                      className="rounded-xl bg-amber-500 px-4 py-2 font-bold text-slate-950 hover:bg-amber-400"
                    >
                      Test Bảng {activeGroup}
                    </button>
                    <button
                      onClick={generateRandomResultsForAllGroups}
                      className="rounded-xl bg-purple-700 px-4 py-2 font-bold text-white hover:bg-purple-800"
                    >
                      Test tất cả bảng
                    </button>
                    <button
                      onClick={() => {
                        setEditingGroupAssignments(normalizeGroupAssignments(groupAssignments));
                        setShowGroupSetup(!showGroupSetup);
                      }}
                      className="rounded-xl bg-blue-700 px-4 py-2 font-bold text-white hover:bg-blue-800"
                    >
                      Thiết lập VĐV Bảng {activeGroup}
                    </button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-7 gap-2 rounded-2xl bg-slate-100 p-2">
                {groupTabs.map(group => (
                  <button
                    key={group}
                    onClick={() => setActiveGroup(group)}
                    className={classNames(
                      'rounded-xl px-1 py-2 text-center text-xs font-black sm:px-2 sm:text-sm',
                      activeGroup === group
                        ? 'bg-blue-700 text-white shadow'
                        : 'border border-slate-300 bg-white text-slate-700 hover:bg-blue-50'
                    )}
                  >
                    Bảng {group}
                  </button>
                ))}
                <button
                  onClick={() => setActiveGroup('H3')}
                  className={classNames(
                    'rounded-xl px-1 py-2 text-center text-xs font-black sm:px-2 sm:text-sm',
                    activeGroup === 'H3'
                      ? 'bg-purple-700 text-white shadow'
                      : 'border border-purple-300 bg-white text-purple-700 hover:bg-purple-50'
                  )}
                >
                  Chọn H3
                </button>
              </div>
            </div>

            {activeGroup === 'H3' ? (
              adminMode ? (
                <TopThirdSelectionPanel />
              ) : (
                <div className="rounded-3xl bg-white/95 p-5 text-center shadow-xl">
                  <div className="text-xl font-black text-purple-900">Chọn 4 VĐV hạng 3 xuất sắc</div>
                  <div className="mt-2 text-sm font-semibold text-slate-600">
                    Mục này chỉ dành cho Admin để chọn 4 VĐV hạng 3 vào Serie A.
                  </div>
                </div>
              )
            ) : (
              <>
                {adminMode && showGroupSetup && <GroupSetupPanel />}
                <ManualRankingPanel />

                <GroupStage
                  database={database}
                  adminMode={adminMode}
                  dbPath={`clb31tq/group-stage/group${activeGroup}`}
                  groupCode={activeGroup}
                  groupName={`Bảng ${activeGroup}`}
                  initialPlayers={groupAssignments[activeGroup] || []}
                />
              </>
            )}
          </div>
        ) : activePage === 'knockout' ? (
          <Knockout
            database={database}
            adminMode={adminMode}
            dbPath="clb31tq/knockout/serieA16"
            title="SERIE A"
            bracketSize={16}
          />
        ) : activePage === 'knockoutB' ? (
          <Knockout
            database={database}
            adminMode={adminMode}
            dbPath="clb31tq/knockout/serieB8"
            title="SERIE B"
            bracketSize={8}
          />
        ) : activePage === 'schedule' && adminMode ? (
          <ScheduleTab
            groupStageData={allGroupStageData}
            fallbackGroupAssignments={groupAssignments}
          />
        ) : null}

        <div className="mt-5 rounded-3xl bg-white/90 p-4 text-center text-sm font-semibold text-slate-600 shadow-xl">
          <div className="flex items-center justify-center gap-2">
            <Table2 size={16} /> CLB đang hiển thị tối đa 4 bàn cố định và có thêm trang vòng bảng, Knock Out Serie A, Knock Out Serie B và Lịch Thi Đấu trong Admin mode.
          </div>
        </div>
      </div>
    </div>
  );
}
