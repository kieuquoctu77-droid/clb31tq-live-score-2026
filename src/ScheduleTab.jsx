import React from "react";

const scheduleData = [
  {
    time: "08:00",
    courts: [
      { table: "Bàn 1", group: "A", pair: "1 vs 4", players: "Lê Trực - A** VS Hải K300 - B1" },
      { table: "Bàn 2", group: "B", pair: "1 vs 4", players: "Trí Trần - A1 VS Đức Đoàn - B2" },
      { table: "Bàn 3", group: "C", pair: "1 vs 4", players: "Trung Hân - A1 VS Sang TH - B2" },
      { table: "Bàn 4", group: "D", pair: "1 vs 4", players: "Vũ Gà Tơ - A1 VS Chủ Đường - B2" },
    ],
  },
  {
    time: "08:20",
    courts: [
      { table: "Bàn 1", group: "E", pair: "1 vs 4", players: "Hưng Gai - A1 VS Đức Nhỏ - C1" },
      { table: "Bàn 2", group: "F", pair: "1 vs 4", players: "Châu Anti - A1 VS Xuân Danh - C1" },
      { table: "Bàn 3", group: "A", pair: "2 vs 3", players: "Nguyễn NT - A1 VS Nguyễn SK - A2" },
      { table: "Bàn 4", group: "B", pair: "2 vs 3", players: "VĐV 2 VS VĐV 3" },
    ],
  },
  {
    time: "08:40",
    courts: [
      { table: "Bàn 1", group: "C", pair: "2 vs 3", players: "VĐV 2 VS VĐV 3" },
      { table: "Bàn 2", group: "D", pair: "2 vs 3", players: "VĐV 2 VS VĐV 3" },
      { table: "Bàn 3", group: "E", pair: "2 vs 3", players: "VĐV 2 VS VĐV 3" },
      { table: "Bàn 4", group: "F", pair: "2 vs 3", players: "VĐV 2 VS VĐV 3" },
    ],
  },
  {
    time: "09:00",
    courts: [
      { table: "Bàn 1", group: "A", pair: "1 vs 3", players: "VĐV 1 VS VĐV 3" },
      { table: "Bàn 2", group: "B", pair: "1 vs 3", players: "VĐV 1 VS VĐV 3" },
      { table: "Bàn 3", group: "C", pair: "1 vs 3", players: "VĐV 1 VS VĐV 3" },
      { table: "Bàn 4", group: "D", pair: "1 vs 3", players: "VĐV 1 VS VĐV 3" },
    ],
  },
  {
    time: "09:20",
    courts: [
      { table: "Bàn 1", group: "E", pair: "1 vs 3", players: "VĐV 1 VS VĐV 3" },
      { table: "Bàn 2", group: "F", pair: "1 vs 3", players: "VĐV 1 VS VĐV 3" },
      { table: "Bàn 3", group: "A", pair: "2 vs 4", players: "VĐV 2 VS VĐV 4" },
      { table: "Bàn 4", group: "B", pair: "2 vs 4", players: "VĐV 2 VS VĐV 4" },
    ],
  },
  {
    time: "09:40",
    courts: [
      { table: "Bàn 1", group: "C", pair: "2 vs 4", players: "VĐV 2 VS VĐV 4" },
      { table: "Bàn 2", group: "D", pair: "2 vs 4", players: "VĐV 2 VS VĐV 4" },
      { table: "Bàn 3", group: "E", pair: "2 vs 4", players: "VĐV 2 VS VĐV 4" },
      { table: "Bàn 4", group: "F", pair: "2 vs 4", players: "VĐV 2 VS VĐV 4" },
    ],
  },
  {
    time: "10:00",
    courts: [
      { table: "Bàn 1", group: "A", pair: "1 vs 2", players: "VĐV 1 VS VĐV 2" },
      { table: "Bàn 2", group: "B", pair: "1 vs 2", players: "VĐV 1 VS VĐV 2" },
      { table: "Bàn 3", group: "C", pair: "1 vs 2", players: "VĐV 1 VS VĐV 2" },
      { table: "Bàn 4", group: "D", pair: "1 vs 2", players: "VĐV 1 VS VĐV 2" },
    ],
  },
  {
    time: "10:20",
    courts: [
      { table: "Bàn 1", group: "E", pair: "1 vs 2", players: "VĐV 1 VS VĐV 2" },
      { table: "Bàn 2", group: "F", pair: "1 vs 2", players: "VĐV 1 VS VĐV 2" },
      { table: "Bàn 3", group: "A", pair: "3 vs 4", players: "VĐV 3 VS VĐV 4" },
      { table: "Bàn 4", group: "B", pair: "3 vs 4", players: "VĐV 3 VS VĐV 4" },
    ],
  },
  {
    time: "10:40",
    courts: [
      { table: "Bàn 1", group: "C", pair: "3 vs 4", players: "VĐV 3 VS VĐV 4" },
      { table: "Bàn 2", group: "D", pair: "3 vs 4", players: "VĐV 3 VS VĐV 4" },
      { table: "Bàn 3", group: "E", pair: "3 vs 4", players: "VĐV 3 VS VĐV 4" },
      { table: "Bàn 4", group: "F", pair: "3 vs 4", players: "VĐV 3 VS VĐV 4" },
    ],
  },
];

export default function ScheduleTab() {
  return (
    <div className="schedule-page compact-schedule">
      <div className="schedule-title">📅 LỊCH THI ĐẤU</div>
      <div className="schedule-subtitle">
        Lịch dạng gọn: chọn giờ trước, sau đó nhìn ngang theo Bàn 1, Bàn 2, Bàn 3, Bàn 4.
      </div>

      <div className="schedule-summary-row">
        <div className="schedule-summary-box"><span>Tổng trận</span><strong>36</strong></div>
        <div className="schedule-summary-box"><span>Số bàn</span><strong>4</strong></div>
        <div className="schedule-summary-box"><span>Bắt đầu</span><strong>08:00</strong></div>
        <div className="schedule-summary-box"><span>Lượt cuối</span><strong>10:40</strong></div>
      </div>

      <div className="compact-table-wrap">
        <div className="compact-table-head">
          <div>Giờ</div>
          <div>Bàn 1</div>
          <div>Bàn 2</div>
          <div>Bàn 3</div>
          <div>Bàn 4</div>
        </div>

        {scheduleData.map((slot) => (
          <div className="compact-time-row" key={slot.time}>
            <div className="compact-time-cell">{slot.time}</div>

            {slot.courts.map((court) => (
              <div className={`compact-match-card group-${court.group}`} key={`${slot.time}-${court.table}`}>
                <div className="compact-match-line">
                  <span>Bảng {court.group}</span>
                  <strong>{court.pair}</strong>
                </div>
                <div className="compact-player-line">{court.players}</div>
              </div>
            ))}
          </div>
        ))}
      </div>

      <div className="schedule-note compact-note">
        ✅ Nghỉ tối thiểu 40 phút &nbsp; | &nbsp; ✅ Không đánh liên tiếp &nbsp; | &nbsp; ✅ Xong vòng bảng dự kiến 11:00
      </div>
    </div>
  );
}
