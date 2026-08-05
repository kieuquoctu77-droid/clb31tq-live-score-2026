import React, { useEffect, useMemo, useRef, useState } from 'react';
import { initializeApp } from 'firebase/app';
import { getDatabase, onValue, ref, set } from 'firebase/database';
import {
  Plus,
  Minus,
  RotateCcw,
  Trophy,
  Monitor,
  Users,
  Table2,
  Clock,
  Edit3,
  Wifi,
  WifiOff,
  Eye,
  ShieldCheck,
  Copy,
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
const ADMIN_PARAM = 'admin';

const initialMatches = [
  { id: 1, table: 'Bàn 1', round: 'Vòng bảng', playerA: 'VĐV A1', playerB: 'VĐV B1', scoreA: 0, scoreB: 0, setA: 0, setB: 0, status: 'Đang thi đấu' },
  { id: 2, table: 'Bàn 2', round: 'Vòng bảng', playerA: 'VĐV A2', playerB: 'VĐV B2', scoreA: 0, scoreB: 0, setA: 0, setB: 0, status: 'Chuẩn bị' },
  { id: 3, table: 'Bàn 3', round: 'Vòng bảng', playerA: 'VĐV A3', playerB: 'VĐV B3', scoreA: 0, scoreB: 0, setA: 0, setB: 0, status: 'Chuẩn bị' },
  { id: 4, table: 'Bàn 4', round: 'Vòng bảng', playerA: 'VĐV A4', playerB: 'VĐV B4', scoreA: 0, scoreB: 0, setA: 0, setB: 0, status: 'Chuẩn bị' },
];

const defaultData = {
  clubTitle: 'CLB BB 31 TÂN QUÝ',
  eventTitle: 'BẢNG TỶ SỐ LIVE',
  note: 'Cập nhật trực tiếp cho ACE CLB theo dõi',
  matches: initialMatches,
  updatedAt: Date.now(),
};

function getInitialAdminMode() {
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);
  return params.get(ADMIN_PARAM) === '1';
}

function getViewerLink() {
  if (typeof window === 'undefined') return '';
  return `${window.location.origin}${window.location.pathname}`;
}

function getAdminLink() {
  if (typeof window === 'undefined') return '';
  return `${window.location.origin}${window.location.pathname}?admin=1`;
}

function classNames(...items) {
  return items.filter(Boolean).join(' ');
}

export default function App() {
  const [data, setData] = useState(defaultData);
  const [tvMode, setTvMode] = useState(false);
  const [adminMode, setAdminMode] = useState(getInitialAdminMode);
  const [activeFilter, setActiveFilter] = useState('Tất cả');
  const [connected, setConnected] = useState(false);
  const [copied, setCopied] = useState('');
  const hydrated = useRef(false);

  const statusOptions = ['Chuẩn bị', 'Đang thi đấu', 'Kết thúc'];
  const filters = ['Tất cả', 'Đang thi đấu', 'Chuẩn bị', 'Kết thúc'];

  useEffect(() => {
    if (!database) {
      const saved = localStorage.getItem('clb31tq-live-score');
      if (saved) {
        try {
          setData(JSON.parse(saved));
        } catch {
          setData(defaultData);
        }
      }
      setConnected(false);
      hydrated.current = true;
      return;
    }

    const scoreRef = ref(database, DB_PATH);
    const unsubscribe = onValue(scoreRef, snapshot => {
      const value = snapshot.val();
      if (value) {
        setData(value);
      } else {
        set(scoreRef, defaultData);
        setData(defaultData);
      }
      setConnected(true);
      hydrated.current = true;
    }, () => {
      setConnected(false);
      hydrated.current = true;
    });

    return () => unsubscribe();
  }, []);

  const saveData = async nextData => {
    const payload = { ...nextData, updatedAt: Date.now() };
    setData(payload);

    if (database) {
      await set(ref(database, DB_PATH), payload);
    } else {
      localStorage.setItem('clb31tq-live-score', JSON.stringify(payload));
    }
  };

  const visibleMatches = useMemo(() => {
    if (activeFilter === 'Tất cả') return data.matches || [];
    return (data.matches || []).filter(m => m.status === activeFilter);
  }, [data.matches, activeFilter]);

  const updateField = (field, value) => {
    if (!adminMode) return;
    saveData({ ...data, [field]: value });
  };

  const updateMatch = (id, field, value) => {
    if (!adminMode) return;
    const matches = data.matches.map(m => m.id === id ? { ...m, [field]: value } : m);
    saveData({ ...data, matches });
  };

  const changePoint = (id, side, delta) => {
    if (!adminMode) return;
    const matches = data.matches.map(m => {
      if (m.id !== id) return m;
      const field = side === 'A' ? 'scoreA' : 'scoreB';
      return { ...m, [field]: Math.max(0, Number(m[field] || 0) + delta) };
    });
    saveData({ ...data, matches });
  };

  const changeSet = (id, side, delta) => {
    if (!adminMode) return;
    const matches = data.matches.map(m => {
      if (m.id !== id) return m;
      const field = side === 'A' ? 'setA' : 'setB';
      return { ...m, [field]: Math.max(0, Number(m[field] || 0) + delta) };
    });
    saveData({ ...data, matches });
  };

  const resetScore = id => {
    if (!adminMode) return;
    const matches = data.matches.map(m => m.id === id ? { ...m, scoreA: 0, scoreB: 0, setA: 0, setB: 0 } : m);
    saveData({ ...data, matches });
  };

  const addMatch = () => {
    if (!adminMode) return;
    const current = data.matches || [];
    const nextId = current.length ? Math.max(...current.map(m => Number(m.id))) + 1 : 1;
    const matches = [...current, {
      id: nextId,
      table: `Bàn ${((nextId - 1) % 4) + 1}`,
      round: 'Vòng bảng',
      playerA: `VĐV A${nextId}`,
      playerB: `VĐV B${nextId}`,
      scoreA: 0,
      scoreB: 0,
      setA: 0,
      setB: 0,
      status: 'Chuẩn bị',
    }];
    saveData({ ...data, matches });
  };

  const copyText = async (text, type) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      setTimeout(() => setCopied(''), 1500);
    } catch {
      setCopied('Lỗi copy');
      setTimeout(() => setCopied(''), 1500);
    }
  };

  const statusClass = status => {
    if (status === 'Đang thi đấu') return 'bg-red-600 text-white';
    if (status === 'Kết thúc') return 'bg-emerald-600 text-white';
    return 'bg-amber-400 text-slate-950';
  };

  const lastUpdated = data.updatedAt ? new Date(data.updatedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '--:--:--';

  const MatchCard = ({ match }) => {
    const leaderA = Number(match.scoreA) > Number(match.scoreB);
    const leaderB = Number(match.scoreB) > Number(match.scoreA);
    const canEdit = adminMode && !tvMode;

    return (
      <div className={classNames('overflow-hidden rounded-3xl border border-white/10 bg-white shadow-2xl', match.status === 'Đang thi đấu' && 'ring-4 ring-red-500/40')}>
        <div className="flex items-center justify-between bg-slate-950 px-4 py-3 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-red-600 text-lg font-black">{match.id}</div>
            <div>
              {canEdit ? (
                <input value={match.table} onChange={e => updateMatch(match.id, 'table', e.target.value)} className="w-28 bg-transparent text-lg font-black outline-none" />
              ) : (
                <div className="text-lg font-black">{match.table}</div>
              )}
              {canEdit ? (
                <input value={match.round} onChange={e => updateMatch(match.id, 'round', e.target.value)} className="block w-44 bg-transparent text-xs text-slate-300 outline-none" />
              ) : (
                <div className="text-xs font-semibold text-slate-300">{match.round}</div>
              )}
            </div>
          </div>

          {canEdit ? (
            <select value={match.status} onChange={e => updateMatch(match.id, 'status', e.target.value)} className={classNames('rounded-full px-3 py-1 text-sm font-bold outline-none', statusClass(match.status))}>
              {statusOptions.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          ) : (
            <div className={classNames('rounded-full px-3 py-1 text-sm font-bold', statusClass(match.status))}>{match.status}</div>
          )}
        </div>

        <div className="grid grid-cols-[1fr_54px_1fr] bg-white sm:grid-cols-[1fr_76px_1fr]">
          <div className={classNames('p-3 sm:p-5', leaderA && 'bg-red-50')}>
            <div className="mb-2 flex items-center gap-2 text-slate-500"><Users size={16} /><span className="text-xs font-bold uppercase">VĐV / Đội A</span></div>
            {canEdit ? (
              <input value={match.playerA} onChange={e => updateMatch(match.id, 'playerA', e.target.value)} className="mb-3 w-full rounded-xl border border-slate-200 px-3 py-2 text-lg font-black text-slate-900 outline-none focus:border-red-500 sm:text-xl" />
            ) : (
              <div className="mb-4 min-h-12 text-xl font-black text-slate-950 sm:text-2xl">{match.playerA}</div>
            )}

            <div className="grid gap-3 sm:grid-cols-[90px_1fr] sm:items-end">
              <div>
                <div className="text-xs font-bold text-slate-500">SET</div>
                <div className="flex items-center gap-2">
                  {canEdit && <button className="rounded-lg border px-2 py-1" onClick={() => changeSet(match.id, 'A', -1)}><Minus size={14}/></button>}
                  <div className="min-w-9 text-center text-4xl font-black text-slate-950">{match.setA}</div>
                  {canEdit && <button className="rounded-lg border px-2 py-1" onClick={() => changeSet(match.id, 'A', 1)}><Plus size={14}/></button>}
                </div>
              </div>
              <div className="text-left sm:text-right">
                <div className="text-xs font-bold text-slate-500">ĐIỂM</div>
                <div className="flex items-center gap-2 sm:justify-end">
                  {canEdit && <button className="rounded-lg border px-2 py-1" onClick={() => changePoint(match.id, 'A', -1)}><Minus size={14}/></button>}
                  <div className={classNames('min-w-16 text-center text-6xl font-black tracking-tight sm:text-7xl', leaderA ? 'text-red-600' : 'text-slate-950')}>{match.scoreA}</div>
                  {canEdit && <button className="rounded-lg bg-red-600 px-2 py-1 text-white" onClick={() => changePoint(match.id, 'A', 1)}><Plus size={14}/></button>}
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center bg-slate-100 px-2 text-slate-500">
            <Trophy className="mb-1 text-amber-500" size={26}/>
            <div className="text-xl font-black sm:text-2xl">VS</div>
          </div>

          <div className={classNames('p-3 sm:p-5', leaderB && 'bg-blue-50')}>
            <div className="mb-2 flex items-center justify-end gap-2 text-slate-500"><span className="text-xs font-bold uppercase">VĐV / Đội B</span><Users size={16} /></div>
            {canEdit ? (
              <input value={match.playerB} onChange={e => updateMatch(match.id, 'playerB', e.target.value)} className="mb-3 w-full rounded-xl border border-slate-200 px-3 py-2 text-right text-lg font-black text-slate-900 outline-none focus:border-blue-500 sm:text-xl" />
            ) : (
              <div className="mb-4 min-h-12 text-right text-xl font-black text-slate-950 sm:text-2xl">{match.playerB}</div>
            )}

            <div className="grid gap-3 sm:grid-cols-[1fr_90px] sm:items-end">
              <div>
                <div className="text-xs font-bold text-slate-500">ĐIỂM</div>
                <div className="flex items-center gap-2">
                  {canEdit && <button className="rounded-lg border px-2 py-1" onClick={() => changePoint(match.id, 'B', -1)}><Minus size={14}/></button>}
                  <div className={classNames('min-w-16 text-center text-6xl font-black tracking-tight sm:text-7xl', leaderB ? 'text-blue-600' : 'text-slate-950')}>{match.scoreB}</div>
                  {canEdit && <button className="rounded-lg bg-blue-600 px-2 py-1 text-white" onClick={() => changePoint(match.id, 'B', 1)}><Plus size={14}/></button>}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs font-bold text-slate-500">SET</div>
                <div className="flex items-center justify-end gap-2">
                  {canEdit && <button className="rounded-lg border px-2 py-1" onClick={() => changeSet(match.id, 'B', -1)}><Minus size={14}/></button>}
                  <div className="min-w-9 text-center text-4xl font-black text-slate-950">{match.setB}</div>
                  {canEdit && <button className="rounded-lg border px-2 py-1" onClick={() => changeSet(match.id, 'B', 1)}><Plus size={14}/></button>}
                </div>
              </div>
            </div>
          </div>
        </div>

        {canEdit && (
          <div className="flex items-center justify-end gap-2 border-t bg-slate-50 p-3">
            <button className="flex items-center gap-1 rounded-xl border border-slate-300 px-3 py-2 text-sm font-bold text-slate-700" onClick={() => resetScore(match.id)}><RotateCcw size={15}/> Reset</button>
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
                  <input value={data.clubTitle} onChange={e => updateField('clubTitle', e.target.value)} className="w-full bg-transparent text-2xl font-black tracking-wide outline-none md:text-4xl" />
                ) : (
                  <h1 className="text-2xl font-black tracking-wide md:text-4xl">{data.clubTitle}</h1>
                )}
                {adminMode && !tvMode ? (
                  <input value={data.eventTitle} onChange={e => updateField('eventTitle', e.target.value)} className="mt-1 w-full bg-transparent text-xl font-black tracking-wide outline-none md:text-3xl" />
                ) : (
                  <h2 className="mt-1 text-xl font-black tracking-wide md:text-3xl">{data.eventTitle}</h2>
                )}
                <div className="mt-2 flex flex-wrap items-center gap-3 text-sm font-semibold text-yellow-100">
                  <span className="flex items-center gap-2"><Clock size={16}/> {data.note}</span>
                  <span className="flex items-center gap-2">{connected ? <Wifi size={16}/> : <WifiOff size={16}/>} {connected ? 'Realtime Online' : hasFirebaseConfig ? 'Đang kết nối' : 'Demo local'}</span>
                  <span>Cập nhật: {lastUpdated}</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button onClick={() => setAdminMode(!adminMode)} className="flex items-center gap-2 rounded-xl bg-white px-4 py-2 font-bold text-slate-950 hover:bg-yellow-50">
                  {adminMode ? <ShieldCheck size={16}/> : <Eye size={16}/>} {adminMode ? 'Admin nhập điểm' : 'Chế độ xem'}
                </button>
                <button onClick={() => setTvMode(!tvMode)} className="flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2 font-bold text-white hover:bg-slate-800">
                  <Monitor size={16}/>{tvMode ? 'Tắt TV mode' : 'TV mode'}
                </button>
                {adminMode && !tvMode && <button onClick={addMatch} className="flex items-center gap-2 rounded-xl bg-white px-4 py-2 font-bold text-red-700 hover:bg-yellow-50"><Plus size={16}/>Thêm trận</button>}
              </div>
            </div>
          </div>

          {!tvMode && (
            <div className="space-y-3 p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-2 text-sm font-bold text-slate-600">
                  <Edit3 size={16}/>
                  {adminMode ? 'Bấm trực tiếp vào tên VĐV, bàn, vòng đấu để sửa. Link admin chỉ gửi cho người nhập điểm.' : 'Đây là link xem cho ACE CLB. Không cần bấm gì, tỷ số sẽ tự cập nhật.'}
                </div>
                <div className="flex flex-wrap gap-2">
                  {filters.map(f => (
                    <button key={f} onClick={() => setActiveFilter(f)} className={classNames('rounded-xl border px-3 py-2 text-sm font-bold', activeFilter === f ? 'border-red-600 bg-red-600 text-white' : 'border-slate-300 bg-white text-slate-700')}>{f}</button>
                  ))}
                </div>
              </div>

              <div className="grid gap-2 rounded-2xl bg-slate-100 p-3 text-sm font-semibold text-slate-700 lg:grid-cols-2">
                <button className="flex items-center justify-center gap-2 rounded-xl bg-white px-3 py-2" onClick={() => copyText(getViewerLink(), 'viewer')}><Copy size={15}/> Copy link ACE xem {copied === 'viewer' && '✓'}</button>
                <button className="flex items-center justify-center gap-2 rounded-xl bg-white px-3 py-2" onClick={() => copyText(getAdminLink(), 'admin')}><Copy size={15}/> Copy link nhập điểm {copied === 'admin' && '✓'}</button>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          {visibleMatches.map(match => <MatchCard key={match.id} match={match} />)}
        </div>

        <div className="mt-5 rounded-3xl bg-white/90 p-4 text-center text-sm font-semibold text-slate-600 shadow-xl">
          <div className="flex items-center justify-center gap-2"><Table2 size={16}/> Link ACE xem dùng link thường. Link nhập điểm dùng thêm ?admin=1. Khi đã cấu hình Firebase, mọi thiết bị sẽ cập nhật realtime.</div>
        </div>
      </div>
    </div>
  );
}
