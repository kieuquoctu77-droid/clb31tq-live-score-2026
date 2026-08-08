import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { initializeApp } from 'firebase/app';
import { getDatabase, onValue, ref, set } from 'firebase/database';
import GroupStage from './GroupStage';
import Knockout from './Knockout';
import {
  Plus,
  Minus,
  RotateCcw,
  Monitor,
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
const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || '31TQ2026';
const SETS_TO_WIN = 3;
const MAX_TABLES = 4;

const defaultPlayers = ['Anthony', 'Leo', 'Hico', 'Banlan', 'Minh', 'Hung'];
const ranks = ['A**', 'A1', 'A2', 'B1', 'B2', 'C1'];

const matchTypes = [
  'Vòng bảng',
  'Tứ kết',
  'Bán kết',
  'Chung kết',
  'Tranh hạng 3',
  'Giao lưu',
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

export default function App() {
  const [data, setData] = useState(defaultData);
  const [players, setPlayers] = useState(defaultPlayers);
  const [tvMode, setTvMode] = useState(false);
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
  const hydrated = useRef(false);
  const fileInputRef = useRef(null);

  const statusOptions = ['Chuẩn bị', 'Đang thi đấu', 'Kết thúc'];
  const groupTabs = ['A', 'B', 'C', 'D', 'E', 'F'];
  const activeGroupIndex = groupTabs.indexOf(activeGroup);
  const activeGroupPlayers = players.slice(activeGroupIndex * 4, activeGroupIndex * 4 + 4);

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
    if (showPlayerManager) {
      setEditingPlayers(players);
    }
  }, [showPlayerManager, players]);

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

  const finishSet = id => {
    if (!adminMode) return;

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

    saveData({ ...data, matches });
  };

  const resetScore = id => {
    if (!adminMode) return;
    const matches = normalizeMatches(data.matches).map(m =>
      m.id === id
        ? {
            ...m,
            scoreA: 0,
            scoreB: 0,
            setA: 0,
            setB: 0,
            setHistory: [],
            winner: '',
            status: 'Đang thi đấu',
          }
        : m
    );
    saveData({ ...data, matches });
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

  const MatchCard = ({ match }) => {
    const leaderA = Number(match.scoreA) > Number(match.scoreB);
    const leaderB = Number(match.scoreB) > Number(match.scoreA);
    const canEdit = adminMode && !tvMode;
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
    <div className="min-h-screen bg-gradient-to-br from-red-700 via-slate-950 to-blue-900 p-3 text-slate-950 sm:p-5">
      <div className="mx-auto max-w-7xl">
        <div className="mb-5 overflow-hidden rounded-3xl bg-white/95 shadow-2xl">
          <div className="bg-gradient-to-r from-red-700 via-red-600 to-yellow-400 px-5 py-5 text-white">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0 flex-1">
                {adminMode && !tvMode ? (
                  <input
                    value={data.clubTitle}
                    onChange={e => updateField('clubTitle', e.target.value)}
                    className="w-full bg-transparent text-2xl font-black tracking-wide outline-none md:text-4xl"
                  />
                ) : (
                  <h1 className="text-2xl font-black tracking-wide md:text-4xl">{data.clubTitle}</h1>
                )}
                {adminMode && !tvMode ? (
                  <input
                    value={data.eventTitle}
                    onChange={e => updateField('eventTitle', e.target.value)}
                    className="mt-1 w-full bg-transparent text-xl font-black tracking-wide outline-none md:text-3xl"
                  />
                ) : (
                  <h2 className="mt-1 text-xl font-black tracking-wide md:text-3xl">{data.eventTitle}</h2>
                )}
                <div className="mt-2 flex flex-wrap items-center gap-3 text-sm font-semibold text-yellow-100">
                  <span className="flex items-center gap-2">
                    <Clock size={16} /> {data.note}
                  </span>
                  <span className="flex items-center gap-2">
                    {connected ? <Wifi size={16} /> : <WifiOff size={16} />}{' '}
                    {connected ? 'Realtime Online' : hasFirebaseConfig ? 'Đang kết nối' : 'Demo local'}
                  </span>
                  <span>Cập nhật: {lastUpdated}</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={handleAdminToggle}
                  className="flex items-center gap-2 rounded-xl bg-white px-4 py-2 font-bold text-slate-950 hover:bg-yellow-50"
                >
                  {adminMode ? <ShieldCheck size={16} /> : <Eye size={16} />}
                  {adminMode ? 'Thoát Admin' : 'Admin'}
                </button>
                <button
                  onClick={() => setTvMode(!tvMode)}
                  className="flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2 font-bold text-white hover:bg-slate-800"
                >
                  <Monitor size={16} />
                  {tvMode ? 'Tắt màn hình lớn' : 'Màn hình lớn'}
                </button>
                {adminMode && !tvMode && (
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
                      className="flex items-center gap-2 rounded-xl bg-white px-4 py-2 font-bold text-blue-700 hover:bg-yellow-50"
                    >
                      <Upload size={16} />
                      Import VĐV Excel
                    </button>
                  </>
                )}
                {adminMode && !tvMode && (
                  <button
                    onClick={() => setShowPlayerManager(!showPlayerManager)}
                    className="flex items-center gap-2 rounded-xl bg-white px-4 py-2 font-bold text-emerald-700 hover:bg-yellow-50"
                  >
                    <UserPlus size={16} />
                    Quản lý VĐV
                  </button>
                )}
              </div>
            </div>
          </div>

          {!tvMode && (
            <div className="space-y-3 p-4">
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setActivePage('live')}
                  className={classNames(
                    'rounded-xl px-4 py-2 font-bold',
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
                    'rounded-xl px-4 py-2 font-bold',
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
                    'rounded-xl px-4 py-2 font-bold',
                    activePage === 'knockout'
                      ? 'bg-emerald-700 text-white'
                      : 'border border-slate-300 bg-white text-slate-700'
                  )}
                >
                  Knock-out Serie A
                </button>
              </div>

              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-2 text-sm font-bold text-slate-600">
                  <Edit3 size={16} />
                  {adminMode
                    ? activePage === 'live'
                      ? 'Chỉ hiển thị 4 bàn cố định. Có thể Import VĐV từ Excel hoặc Quản lý VĐV trực tiếp.'
                      : activePage === 'group'
                      ? 'Vòng bảng có thể nhập kết quả theo từng ô đối đầu và tự tính xếp hạng.'
                      : 'Knock-out Serie Acó thể chọn người thắng để tự chuyển lên vòng tiếp theo.'
                    : activePage === 'live'
                    ? 'Đây là link xem cho ACE CLB. Không cần bấm gì, tỷ số sẽ tự cập nhật.'
                    : activePage === 'group'
                    ? 'Đây là trang xem vòng bảng. Kết quả sẽ tự cập nhật realtime.'
                    : 'Đây là trang xem sơ đồ Knock-out Ser. Kết quả sẽ tự cập nhật realtime.'}
                </div>

                {activePage === 'live' && (
                  <div className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-700">
                    4 bàn cố định
                  </div>
                )}
              </div>

              {adminMode && !tvMode && showPlayerManager && <PlayerManagerPanel />}
            </div>
          )}
        </div>

        {activePage === 'live' ? (
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            {visibleMatches.map(match => (
              <MatchCard key={match.id} match={match} />
            ))}
          </div>
        ) : activePage === 'group' ? (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {groupTabs.map(group => (
                <button
                  key={group}
                  onClick={() => setActiveGroup(group)}
                  className={classNames(
                    'rounded-xl px-4 py-2 font-bold',
                    activeGroup === group
                      ? 'bg-blue-700 text-white'
                      : 'border border-slate-300 bg-white text-slate-700'
                  )}
                >
                  Bảng {group}
                </button>
              ))}
            </div>

            <GroupStage
              database={database}
              adminMode={adminMode}
              dbPath={`clb31tq/group-stage/group${activeGroup}`}
              groupCode={activeGroup}
              groupName={`Bảng ${activeGroup}`}
              initialPlayers={activeGroupPlayers}
            />
          </div>
        ) : (
          <Knockout
            database={database}
            adminMode={adminMode}
            dbPath="clb31tq/knockout/serieA16"
          />
        )}

        <div className="mt-5 rounded-3xl bg-white/90 p-4 text-center text-sm font-semibold text-slate-600 shadow-xl">
          <div className="flex items-center justify-center gap-2">
            <Table2 size={16} /> CLB đang hiển thị tối đa 4 bàn cố định và có thêm trang vòng bảng, Knock-out.
          </div>
        </div>
      </div>
    </div>
  );
}
