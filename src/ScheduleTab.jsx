import React from "react";

const scheduleData = [
  {
    time: "08:00",
    matches: [
      { group: "A", table: "Bàn 1", pair: "1 vs 4", players: "Lê Trực VS Hải K300" },
      { group: "B", table: "Bàn 2", pair: "1 vs 4", players: "Trí Trần VS Đức Đoàn" },
      { group: "C", table: "Bàn 3", pair: "1 vs 4", players: "Trung Hân VS Sang TH" },
      { group: "D", table: "Bàn 4", pair: "1 vs 4", players: "Vũ Gà Tơ VS Chủ Đường" },
    ],
  },
  {
    time: "08:20",
    matches: [
      { group: "E", table: "Bàn 1", pair: "1 vs 4", players: "Hưng Gai VS Đức Nhỏ" },
      { group: "F", table: "Bàn 2", pair: "1 vs 4", players: "Châu Anti VS Xuân Danh" },
      { group: "A", table: "Bàn 3", pair: "2 vs 3", players: "Nguyễn NT VS Nguyễn SK" },
      { group: "B", table: "Bàn 4", pair: "2 vs 3", players: "VĐV 2 VS VĐV 3" },
    ],
  },
  {
    time: "08:40",
    matches: [
      { group: "C", table: "Bàn 1", pair: "2 vs 3", players: "VĐV 2 VS VĐV 3" },
      { group: "D", table: "Bàn 2", pair: "2 vs 3", players: "VĐV 2 VS VĐV 3" },
      { group: "E", table: "Bàn 3", pair: "2 vs 3", players: "VĐV 2 VS VĐV 3" },
      { group: "F", table: "Bàn 4", pair: "2 vs 3", players: "VĐV 2 VS VĐV 3" },
    ],
  },
  {
    time: "09:00",
    matches: [
      { group: "A", table: "Bàn 1", pair: "1 vs 3", players: "VĐV 1 VS VĐV 3" },
      { group: "B", table: "Bàn 2", pair: "1 vs 3", players: "VĐV 1 VS VĐV 3" },
      { group: "C", table: "Bàn 3", pair: "1 vs 3", players: "VĐV 1 VS VĐV 3" },
      { group: "D", table: "Bàn 4", pair: "1 vs 3", players: "VĐV 1 VS VĐV 3" },
    ],
  },
  {
    time: "09:20",
    matches: [
      { group: "E", table: "Bàn 1", pair: "1 vs 3", players: "VĐV 1 VS VĐV 3" },
      { group: "F", table: "Bàn 2", pair: "1 vs 3", players: "VĐV 1 VS VĐV 3" },
      { group: "A", table: "Bàn 3", pair: "2 vs 4", players: "VĐV 2 VS VĐV 4" },
      { group: "B", table: "Bàn 4", pair: "2 vs 4", players: "VĐV 2 VS VĐV 4" },
    ],
  },
  {
    time: "09:40",
    matches: [
      { group: "C", table: "Bàn 1", pair: "2 vs 4", players: "VĐV 2 VS VĐV 4" },
      { group: "D", table: "Bàn 2", pair: "2 vs 4", players: "VĐV 2 VS VĐV 4" },
      { group: "E", table: "Bàn 3", pair: "2 vs 4", players: "VĐV 2 VS VĐV 4" },
      { group: "F", table: "Bàn 4", pair: "2 vs 4", players: "VĐV 2 VS VĐV 4" },
    ],
  },
  {
    time: "10:00",
    matches: [
      { group: "A", table: "Bàn 1", pair: "1 vs 2", players: "VĐV 1 VS VĐV 2" },
      { group: "B", table: "Bàn 2", pair: "1 vs 2", players: "VĐV 1 VS VĐV 2" },
      { group: "C", table: "Bàn 3", pair: "1 vs 2", players: "VĐV 1 VS VĐV 2" },
      { group: "D", table: "Bàn 4", pair: "1 vs 2", players: "VĐV 1 VS VĐV 2" },
    ],
  },
  {
    time: "10:20",
    matches: [
      { group: "E", table: "Bàn 1", pair: "1 vs 2", players: "VĐV 1 VS VĐV 2" },
      { group: "F", table: "Bàn 2", pair: "1 vs 2", players: "VĐV 1 VS VĐV 2" },
      { group: "A", table: "Bàn 3", pair: "3 vs 4", players: "VĐV 3 VS VĐV 4" },
      { group: "B", table: "Bàn 4", pair: "3 vs 4", players: "VĐV 3 VS VĐV 4" },
    ],
  },
  {
    time: "10:40",
    matches: [
      { group: "C", table: "Bàn 1", pair: "3 vs 4", players: "VĐV 3 VS VĐV 4" },
      { group: "D", table: "Bàn 2", pair: "3 vs 4", players: "VĐV 3 VS VĐV 4" },
      { group: "E", table: "Bàn 3", pair: "3 vs 4", players: "VĐV 3 VS VĐV 4" },
      { group: "F", table: "Bàn 4", pair: "3 vs 4", players: "VĐV 3 VS VĐV 4" },
    ],
  },
];

export default function ScheduleTab() {
  return (
    <div className="schedule-page schedule-clean">
      <h2 className="schedule-clean-title">📅 LỊCH THI ĐẤU</h2>

      {scheduleData.map((slot) => (
        <section className="schedule-time-block" key={slot.time}>
          <div className="schedule-time-title">{slot.time}</div>

          <div className="schedule-match-list">
            {slot.matches.map((match) => (
              <div className={`schedule-match-item group-${match.group}`} key={`${slot.time}-${match.group}-${match.table}`}>
                <div className="schedule-match-meta">
                  <span>Bảng {match.group}</span>
                  <span>|</span>
                  <span>{match.table}</span>
                  <span>|</span>
                  <strong>{match.pair}</strong>
                </div>
                <div className="schedule-players">{match.players}</div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
