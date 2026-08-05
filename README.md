# CLB BB 31 TÂN QUÝ - LIVE SCORE

Bảng tỷ số trực tiếp cho CLB BB 31 Tân Quý, dùng cho 4 bàn thi đấu, TV Mode và link điện thoại cho ACE theo dõi.

## Link sử dụng sau khi deploy

- Link ACE xem: `https://clb31tq-live-score.vercel.app`
- Link Admin: `https://clb31tq-live-score.vercel.app` rồi bấm nút **Admin** và nhập mật khẩu.

Link xem và link Admin là một link. Người nhập điểm cần mật khẩu Admin.

## Chạy thử trên máy

```bash
npm install
npm run dev
```

Mở link local do Vite hiển thị, thường là:

```text
http://localhost:5173
```

## Deploy lên Vercel

1. Push toàn bộ source lên GitHub repo `clb31tq-live-score`.
2. Vào Vercel, chọn **Add New Project**.
3. Import repo GitHub.
4. Framework chọn **Vite**.
5. Build command: `npm run build`.
6. Output directory: `dist`.
7. Bấm **Deploy**.

## Cấu hình Firebase Realtime Database

Tạo project Firebase, bật **Realtime Database**, sau đó thêm các biến môi trường sau trong Vercel:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_DATABASE_URL=https://your_project-default-rtdb.asia-southeast1.firebasedatabase.app
VITE_FIREBASE_PROJECT_ID=your_project
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

Sau khi thêm Environment Variables trên Vercel, cần bấm **Redeploy** để website nhận cấu hình mới.

## Firebase Rules tạm thời cho giải CLB

File `firebase-rules.json` đang để read/write công khai để dễ dùng trong nội bộ CLB:

```json
{
  "rules": {
    "clb31tq": {
      "live-score": {
        ".read": true,
        ".write": true
      }
    }
  }
}
```

Lưu ý: Quy tắc này phù hợp dùng nhanh cho giải nội bộ. Nếu dùng lâu dài, nên nâng cấp bảo mật bằng mật khẩu admin hoặc Firebase Auth.

## Tính năng

- 4 bàn thi đấu mặc định.
- Cập nhật điểm và set theo từng bên.
- Chế độ ACE xem riêng, không sửa được điểm.
- Link nhập điểm riêng bằng `?admin=1`.
- TV Mode cho màn hình lớn.
- Copy nhanh link xem và link nhập điểm.
- Firebase Realtime Database để đồng bộ nhiều thiết bị.
- Nếu chưa cấu hình Firebase, app vẫn chạy demo bằng localStorage nhưng không đồng bộ nhiều máy.

## Mật khẩu Admin

Thêm biến môi trường trên Vercel:

```env
VITE_ADMIN_PASSWORD=31TQ2026
```

Sau khi đổi mật khẩu trên Vercel, cần Redeploy để nhận mật khẩu mới.
