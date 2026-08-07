import React, { useEffect, useState } from 'react';
2
import { RotateCcw, Trophy, Medal, CheckCircle2 } from 'lucide-react';
3
import { onValue, ref, set } from 'firebase/database';
4
 
5
const defaultKnockoutData = {
6
round16: {
7
t1: { title: 'T1', p1: 'N bốc thăm 1 - Nhất bảng', p2: 'H3 bốc thăm 1 - Hạng ba', winner: '' },
8
t2: { title: 'T2', p1: 'Nhì bảng A', p2: 'Nhì bảng D', winner: '' },
9
t3: { title: 'T3', p1: 'N bốc thăm 2 - Nhất bảng', p2: 'H3 bốc thăm 2 - Hạng ba', winner: '' },
10
t4: { title: 'T4', p1: 'Nhì bảng B', p2: 'Nhì bảng C', winner: '' },
11
t5: { title: 'T5', p1: 'N bốc thăm 3 - Nhất bảng', p2: 'H3 bốc thăm 3 - Hạng ba', winner: '' },
12
t6: { title: 'T6', p1: 'N còn lại 1 - Nhất bảng', p2: 'Nhì bảng E', winner: '' },
13
t7: { title: 'T7', p1: 'N bốc thăm 4 - Nhất bảng', p2: 'H3 bốc thăm 4 - Hạng ba', winner: '' },
14
t8: { title: 'T8', p1: 'N còn lại 2 - Nhất bảng', p2: 'Nhì bảng F', winner: '' },
15
},
16
quarter: {
17
tk1: { title: 'TK1', p1: '', p2: '', winner: '' },
18
tk2: { title: 'TK2', p1: '', p2: '', winner: '' },
19
tk3: { title: 'TK3', p1: '', p2: '', winner: '' },
20
tk4: { title: 'TK4', p1: '', p2: '', winner: '' },
21
},
22
semi: {
23
bk1: { title: 'BK1', p1: '', p2: '', winner: '' },
24
bk2: { title: 'BK2', p1: '', p2: '', winner: '' },
25
},
26
final: {
27
ck: { title: 'CHUNG KẾT', p1: '', p2: '', winner: '' },
28
},
29
thirdPlace: {
30
p1: '',
31
p2: '',
32
},
33
champion: '',
34
};
35
 
36
function classNames(...items) {
37
return items.filter(Boolean).join(' ');
38
}
39
 
40
function cloneData(value) {
41
return JSON.parse(JSON.stringify(value));
42
}
43
 
44
function prepareKnockoutData(value) {
45
return {
46
...defaultKnockoutData,
47
...(value || {}),
48
round16: {
49
...defaultKnockoutData.round16,
50
...(value?.round16 || {}),
51
},
52
quarter: {
53
...defaultKnockoutData.quarter,
54
...(value?.quarter || {}),
55
},
56
semi: {
57
...defaultKnockoutData.semi,
58
...(value?.semi || {}),
59
},
60
final: {
61
...defaultKnockoutData.final,
62
...(value?.final || {}),
63
},
64
thirdPlace: {
65
...defaultKnockoutData.thirdPlace,
66
...(value?.thirdPlace || {}),
67
},
68
champion: value?.champion || '',
69
};
70
}
71
 
72
export default function Knockout({
73
database = null,
74
adminMode = false,
75
dbPath = 'clb31tq/knockout/serieA16',
76
}) {
77
const [data, setData] = useState(defaultKnockoutData);
78
const [connected, setConnected] = useState(false);
79
 
80
useEffect(() => {
81
if (!database) {
82
const saved = localStorage.getItem('clb31tq-knockout');
83
 
84
if (saved) {
85
try {
86
setData(prepareKnockoutData(JSON.parse(saved)));
87
} catch {
88
setData(defaultKnockoutData);
89
}
90
}
91
 
92
setConnected(false);
93
return;
94
}
95
 
96
const knockoutRef = ref(database, dbPath);
97
 
98
const unsubscribe = onValue(
99
knockoutRef,
100
snapshot => {
101
const value = snapshot.val();
102
 
103
if (value) {
104
setData(prepareKnockoutData(value));
105
} else {
106
set(knockoutRef, defaultKnockoutData);
107
setData(defaultKnockoutData);
108
}
109
 
110
setConnected(true);
111
},
112
() => {
113
setConnected(false);
114
}
115
);
116
 
117
return () => unsubscribe();
118
}, [database, dbPath]);
119
 
120
const saveData = async nextData => {
121
const payload = prepareKnockoutData(nextData);
122
setData(payload);
123
 
124
if (database) {
125
await set(ref(database, dbPath), payload);
126
} else {
127
localStorage.setItem('clb31tq-knockout', JSON.stringify(payload));
128
}
129
};
130
 
131
const clearDownstreamIfNeeded = (next, oldWinner) => {
132
if (!oldWinner) return;
133
 
134
Object.keys(next.quarter).forEach(key => {
135
const match = next.quarter[key];
136
 
137
if (match.p1 === oldWinner) match.p1 = '';
138
if (match.p2 === oldWinner) match.p2 = '';
139
if (match.winner === oldWinner) match.winner = '';
140
});
141
 
142
Object.keys(next.semi).forEach(key => {
143
const match = next.semi[key];
144
 
145
if (match.p1 === oldWinner) match.p1 = '';
146
if (match.p2 === oldWinner) match.p2 = '';
147
if (match.winner === oldWinner) match.winner = '';
148
});
149
 
150
if (next.final.ck.p1 === oldWinner) next.final.ck.p1 = '';
151
if (next.final.ck.p2 === oldWinner) next.final.ck.p2 = '';
152
if (next.final.ck.winner === oldWinner) next.final.ck.winner = '';
153
 
154
if (next.thirdPlace.p1 === oldWinner) next.thirdPlace.p1 = '';
155
if (next.thirdPlace.p2 === oldWinner) next.thirdPlace.p2 = '';
156
 
157
if (next.champion === oldWinner) next.champion = '';
158
};
159
 
160
const pushWinnerForward = (next, matchId, winner, oldWinner) => {
161
clearDownstreamIfNeeded(next, oldWinner);
162
 
163
if (matchId === 't1') next.quarter.tk1.p1 = winner;
164
if (matchId === 't2') next.quarter.tk1.p2 = winner;
165
 
166
if (matchId === 't3') next.quarter.tk2.p1 = winner;
167
if (matchId === 't4') next.quarter.tk2.p2 = winner;
168
 
169
if (matchId === 't5') next.quarter.tk3.p1 = winner;
170
if (matchId === 't6') next.quarter.tk3.p2 = winner;
171
 
172
if (matchId === 't7') next.quarter.tk4.p1 = winner;
173
if (matchId === 't8') next.quarter.tk4.p2 = winner;
174
 
175
if (matchId === 'tk1') next.semi.bk1.p1 = winner;
176
if (matchId === 'tk2') next.semi.bk1.p2 = winner;
177
 
178
if (matchId === 'tk3') next.semi.bk2.p1 = winner;
179
if (matchId === 'tk4') next.semi.bk2.p2 = winner;
180
 
181
if (matchId === 'bk1') {
182
next.final.ck.p1 = winner;
183
next.thirdPlace.p1 = getLoser(next.semi.bk1, winner);
184
}
185
 
186
if (matchId === 'bk2') {
187
next.final.ck.p2 = winner;
188
next.thirdPlace.p2 = getLoser(next.semi.bk2, winner);
189
}
190
 
191
if (matchId === 'ck') {
192
next.champion = winner;
193
}
194
};
195
 
196
const chooseWinner = async (roundKey, matchId, winner) => {
197
if (!adminMode) return;
198
if (!winner) return;
199
 
200
const next = prepareKnockoutData(cloneData(data));
201
const match = next[roundKey][matchId];
202
const oldWinner = match.winner;
203
 
204
match.winner = winner;
205
pushWinnerForward(next, matchId, winner, oldWinner);
206
 
207
await saveData(next);
208
};
209
 
210
const updatePlayer = async (roundKey, matchId, playerKey, value) => {
211
if (!adminMode) return;
212
 
213
const next = prepareKnockoutData(cloneData(data));
214
next[roundKey][matchId][playerKey] = value;
215
 
216
if (
217
next[roundKey][matchId].winner &&
218
next[roundKey][matchId].winner !== next[roundKey][matchId].p1 &&
219
next[roundKey][matchId].winner !== next[roundKey][matchId].p2
220
) {
221
next[roundKey][matchId].winner = '';
222
}
223
 
224
await saveData(next);
225
};
226
 
227
const resetKnockout = async () => {
228
if (!adminMode) return;
229
 
230
const confirmReset = window.confirm('Reset toàn bộ sơ đồ Knock-out?');
231
if (!confirmReset) return;
232
 
233
await saveData(defaultKnockoutData);
234
};
235
 
236
const round16Entries = Object.entries(data.round16);
237
const quarterEntries = Object.entries(data.quarter);
238
const semiEntries = Object.entries(data.semi);
239
 
240
const round16Pairs = [
241
round16Entries.slice(0, 2),
242
round16Entries.slice(2, 4),
243
round16Entries.slice(4, 6),
244
round16Entries.slice(6, 8),
245
];
246
 
247
const quarterPairs = [
248
quarterEntries.slice(0, 2),
249
quarterEntries.slice(2, 4),
250
];
251
 
252
return (
253
<div className="rounded-2xl bg-white p-3 shadow-xl sm:p-4">
254
<div className="mb-4 flex flex-col gap-2 border-b border-slate-200 pb-3 lg:flex-row lg:items-center lg:justify-between">
255
<div>
256
<div className="text-xl font-black text-red-700 sm:text-2xl">
257
🏓 SƠ ĐỒ KNOCK-OUT SERIE A - 16 VĐV
258
</div>
259
 
260
<div className="mt-1 text-xs font-bold text-slate-500">
261
Bấm “Thắng” để tự động đẩy VĐV lên nhánh tiếp theo.
262
</div>
263
 
264
<div className="mt-1 text-xs font-bold text-slate-400">
265
Trạng thái: {connected ? 'Realtime Firebase' : 'Local'}
266
</div>
267
</div>
268
 
269
{adminMode && (
270
<button
271
type="button"
272
onClick={resetKnockout}
273
className="flex items-center justify-center gap-2 rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-sm font-black text-red-700 hover:bg-red-100"
274
>
275
<RotateCcw size={17} />
276
Reset Knock-out
277
</button>
278
)}
279
</div>
280
 
281
<div className="overflow-x-auto rounded-2xl bg-slate-50 p-3">
282
<div className="grid min-w-[940px] grid-cols-[230px_185px_185px_220px] gap-4">
283
<RoundColumn title="VÒNG 1/8" color="text-red-700">
284
<div className="space-y-5">
285
{round16Pairs.map((pair, pairIndex) => (
286
<BracketPair key={pairIndex}>
287
{pair.map(([id, match]) => (
288
<MatchBox
289
key={id}
290
roundKey="round16"
291
matchId={id}
292
match={match}
293
adminMode={adminMode}
294
onWinner={chooseWinner}
295
onUpdatePlayer={updatePlayer}
296
/>
297
))}
298
</BracketPair>
299
))}
300
</div>
301
</RoundColumn>
302
 
303
<RoundColumn title="TỨ KẾT" color="text-blue-700">
304
<div className="space-y-[104px] pt-[44px]">
305
{quarterPairs.map((pair, pairIndex) => (
306
<BracketPair key={pairIndex} tall>
307
{pair.map(([id, match]) => (
308
<MatchBox
309
key={id}
310
roundKey="quarter"
311
matchId={id}
312
match={match}
313
adminMode={adminMode}
314
onWinner={chooseWinner}
315
onUpdatePlayer={updatePlayer}
316
/>
317
))}
318
</BracketPair>
319
))}
320
</div>
321
</RoundColumn>
322
 
323
<RoundColumn title="BÁN KẾT" color="text-emerald-700">
324
<div className="pt-[135px]">
325
<BracketPair semi>
326
{semiEntries.map(([id, match]) => (
327
<MatchBox
328
key={id}
329
roundKey="semi"
330
matchId={id}
331
match={match}
332
adminMode={adminMode}
333
onWinner={chooseWinner}
334
onUpdatePlayer={updatePlayer}
335
/>
336
))}
337
</BracketPair>
338
</div>
339
</RoundColumn>
340
 
341
<RoundColumn title="CHUNG KẾT" color="text-yellow-600">
342
<div className="pt-[210px]">
343
<MatchBox
344
roundKey="final"
345
matchId="ck"
346
match={data.final.ck}
347
adminMode={adminMode}
348
onWinner={chooseWinner}
349
onUpdatePlayer={updatePlayer}
350
finalMatch
351
/>
352
 
353
<ChampionBox champion={data.champion} />
354
<ThirdPlaceBox thirdPlace={data.thirdPlace} />
355
</div>
356
</RoundColumn>
357
</div>
358
</div>
359
 
360
<div className="mt-5 rounded-2xl bg-slate-100 px-4 py-3 text-sm font-bold text-slate-600">
361
Ghi chú: N = VĐV nhất bảng theo thứ tự bốc thăm. H3 = VĐV hạng ba xuất sắc theo thứ tự bốc thăm.
362
</div>
363
</div>
364
);
365
}
366
 
367
function RoundColumn({ title, color, children }) {
368
return (
369
<div>
370
<div className={classNames('mb-2 text-center text-base font-black', color)}>
371
{title}
372
</div>
373
 
374
{children}
375
</div>
376
);
377
}
378
 
379
function BracketPair({ children, tall = false, semi = false }) {
380
return (
381
<div
382
className={classNames(
383
'relative',
384
semi ? 'space-y-[190px]' : tall ? 'space-y-[92px]' : 'space-y-3'
385
)}
386
>
387
{children}
388
 
389
<div className="absolute right-[-22px] top-[25%] h-[2px] w-6 rounded-full bg-slate-400" />
390
<div className="absolute right-[-22px] top-[75%] h-[2px] w-6 rounded-full bg-slate-400" />
391
<div className="absolute right-[-22px] top-[25%] h-[50%] w-[2px] rounded-full bg-slate-400" />
392
<div className="absolute right-[-58px] top-1/2 h-[2px] w-9 rounded-full bg-slate-400" />
393
</div>
394
);
395
}
396
 
397
function MatchBox({
398
roundKey,
399
matchId,
400
match,
401
adminMode,
402
onWinner,
403
onUpdatePlayer,
404
finalMatch = false,
405
}) {
406
const hasP1 = String(match.p1 || '').trim();
407
const hasP2 = String(match.p2 || '').trim();
408
 
409
return (
410
<div
411
className={classNames(
412
'rounded-lg border bg-white p-1.5 shadow transition-all',
413
match.winner ? 'border-emerald-400' : 'border-slate-200',
414
finalMatch && 'border-yellow-400 bg-yellow-50 ring-2 ring-yellow-200'
415
)}
416
>
417
<div className="mb-1 flex items-center justify-between gap-1">
418
<div
419
className={classNames(
420
'rounded-md px-2 py-0.5 text-xs font-bold text-white',
421
matchId.startsWith('tk') ? 'bg-blue-700' : '',
422
matchId.startsWith('bk') ? 'bg-emerald-700' : '',
423
matchId === 'ck' ? 'bg-yellow-600' : '',
424
matchId.startsWith('t') && !matchId.startsWith('tk') ? 'bg-red-700' : ''
425
)}
426
>
427
{match.title}
428
</div>
429
 
430
{match.winner && (
431
<div className="flex items-center gap-1 text-[11px] font-bold text-emerald-700">
432
<CheckCircle2 size={12} />
433
Đã chọn
434
</div>
435
)}
436
</div>
437
 
438
<PlayerButton
439
value={match.p1}
440
selected={match.winner === match.p1}
441
disabled={!hasP1 || !adminMode}
442
onClick={() => onWinner(roundKey, matchId, match.p1)}
443
onChange={value => onUpdatePlayer(roundKey, matchId, 'p1', value)}
444
adminMode={adminMode}
445
placeholder="VĐV 1"
446
/>
447
 
448
<div className="my-1 text-center text-xs font-bold text-slate-400">
449
VS
450
</div>
451
 
452
<PlayerButton
453
value={match.p2}
454
selected={match.winner === match.p2}
455
disabled={!hasP2 || !adminMode}
456
onClick={() => onWinner(roundKey, matchId, match.p2)}
457
onChange={value => onUpdatePlayer(roundKey, matchId, 'p2', value)}
458
adminMode={adminMode}
459
placeholder="VĐV 2"
460
/>
461
</div>
462
);
463
}
464
 
465
function PlayerButton({
466
value,
467
selected,
468
disabled,
469
onClick,
470
onChange,
471
adminMode,
472
placeholder,
473
}) {
474
return (
475
<div
476
className={classNames(
477
'rounded-lg border px-2 py-1 transition-all',
478
selected
479
? 'border-emerald-700 bg-emerald-600 text-white shadow-md'
480
: 'border-slate-200 bg-white text-slate-900 hover:bg-slate-50'
481
)}
482
>
483
{adminMode ? (
484
<div className="flex items-center gap-2">
485
<input
486
value={value || ''}
487
onChange={e => onChange(e.target.value)}
488
placeholder={placeholder}
489
className={classNames(
490
'min-w-0 flex-1 bg-transparent text-xs font-bold outline-none',
491
selected
492
? 'text-white placeholder:text-emerald-100'
493
: 'text-slate-900 placeholder:text-slate-400'
494
)}
495
/>
496
 
497
<button
498
type="button"
499
onClick={onClick}
500
disabled={disabled}
501
className={classNames(
502
'shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-bold',
503
selected
504
? 'bg-white text-emerald-700'
505
: disabled
506
? 'bg-slate-200 text-slate-400'
507
: 'bg-emerald-600 text-white hover:bg-emerald-700'
508
)}
509
>
510
Thắng
511
</button>
512
</div>
513
) : (
514
<div className="text-sm font-black">
515
{value || '-'}
516
</div>
517
)}
518
</div>
519
);
520
}
521
 
522
function ChampionBox({ champion }) {
523
if (!champion) {
524
return (
525
<div className="mt-3 rounded-xl border-2 border-dashed border-yellow-300 bg-yellow-50 p-3 text-center">
526
<Trophy className="mx-auto mb-1 text-yellow-500" size={30} />
527
 
528
<div className="text-sm font-black text-yellow-700">
529
Chưa có nhà vô địch
530
</div>
531
</div>
532
);
533
}
534
 
535
return (
536
<div className="mt-3 rounded-xl bg-gradient-to-r from-yellow-300 via-yellow-400 to-yellow-500 p-3 text-center shadow-xl ring-2 ring-yellow-300">
537
<Trophy className="mx-auto mb-1 text-yellow-900" size={34} />
538
 
539
<div className="text-sm font-black uppercase text-yellow-900">
540
Nhà vô địch
541
</div>
542
 
543
<div className="mt-1 text-lg font-black text-slate-950">
544
{champion}
545
</div>
546
</div>
547
);
548
}
549
 
550
function ThirdPlaceBox({ thirdPlace }) {
551
return (
552
<div className="mt-3 rounded-xl border border-blue-200 bg-blue-50 p-3">
553
<div className="mb-2 flex items-center justify-center gap-1 rounded-lg bg-blue-700 px-2 py-1 text-center text-xs font-black text-white">
554
<Medal size={14} />
555
ĐỒNG HẠNG 3
556
</div>
557
 
558
<div className="space-y-1 text-center text-xs font-bold text-slate-800">
559
<div>
560
Thua BK1: {thirdPlace.p1 || '-'}
561
</div>
562
 
563
<div>
564
Thua BK2: {thirdPlace.p2 || '-'}
565
</div>
566
</div>
567
</div>
568
);
569
}
570
 
571
function getLoser(match, winner) {
572
if (!match) return '';
573
if (match.p1 === winner) return match.p2 || '';
574
if (match.p2 === winner) return match.p1 || '';
575
return '';
576
}