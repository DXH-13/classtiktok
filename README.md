# 🏫 ClassTikTok - Quiz Live TikTok

Ứng dụng quiz tương tác realtime cho TikTok Live. Khán giả comment đáp án, hệ thống tự động chấm điểm theo thời gian và hiển thị leaderboard trực tiếp trên màn hình live (qua OBS Browser Source).

## Tính năng

- ✅ Đọc comment TikTok Live realtime
- ✅ Hai loại câu hỏi: Trắc nghiệm (A/B/C/D) và Vua Tiếng Việt (điền từ)
- ✅ Chấm điểm theo thời gian phản hồi (trả lời nhanh = điểm cao hơn)
- ✅ Leaderboard cập nhật realtime
- ✅ Overlay 1920×1080 cho OBS Browser Source
- ✅ Dashboard điều khiển dành cho giáo viên
- ✅ Quản lý bộ câu hỏi với DB

## Cài đặt

### 1. Backend

```bash
cd backend
npm install
npx prisma db push
node src/db/seed.js   # Tạo dữ liệu mẫu
npm run dev
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

## Sử dụng

1. Mở Dashboard: http://localhost:5173
2. Nhập username TikTok và chọn bộ câu hỏi
3. Nhấn "Bắt đầu buổi học"
4. Copy URL Overlay và dán vào OBS Browser Source (kích thước 1920×1080)
5. Bắt đầu câu hỏi từ Dashboard

## Cấu trúc thư mục

```
classtiktok/
├── backend/
│   ├── prisma/schema.prisma     # DB schema
│   ├── src/
│   │   ├── index.js             # Entry point
│   │   ├── db/prisma.js         # Prisma client
│   │   ├── db/seed.js           # Dữ liệu mẫu
│   │   ├── quiz/
│   │   │   ├── scoreEngine.js   # Logic tính điểm
│   │   │   └── gameState.js     # Trạng thái game realtime
│   │   ├── tiktok/manager.js    # Kết nối TikTok Live
│   │   ├── socket/handlers.js   # Socket.IO events
│   │   └── routes/              # REST API
└── frontend/
    └── src/
        ├── overlay/             # OBS Browser Source
        └── dashboard/           # Điều khiển giáo viên
```

## Tính điểm

```
Điểm = Điểm_cơ_bản × (0.2 + 0.8 × (thời_gian_còn_lại / thời_gian_tổng))
```

- Trả lời ngay đầu → 100% điểm cơ bản
- Trả lời cuối giờ → 20% điểm cơ bản
- Trả lời sai → 0 điểm

## Lưu ý

- Cần TikTok account đang LIVE để đọc comment
- OBS Browser Source: bật "Shutdown source when not visible" = OFF
- Nền Overlay là trong suốt (transparent) để overlay lên stream
