# Moe Bot 🤖

Moe Bot là một con bot Discord đa năng được phát triển bằng framework Sapphire (Node.js), cung cấp các tính năng từ tra cứu thực tế, giải trí văn mẫu đến hệ thống Voice TTS thông minh.

## 🚀 Tính năng chính

### 🎭 Giải trí & Văn mẫu

- **Văn mẫu ngẫu nhiên (`/van-mau random`)** : Lấy các bài văn mẫu "bất hủ" từ API hoặc kho lưu trữ dự phòng.
- **Voice TTS (Tiếng Việt)**: Tích hợp giọng nói AI trong lệnh `/van-mau` với khả năng tự động vào phòng Voice và đọc nội dung.
- **Tốc độ đọc linh hoạt**: Tùy chỉnh tốc độ TTS (x1.5, x2, x3) ngay trong lệnh.
- **Hệ thống hàng đợi (Voice Queue)**: Xử lý nhiều yêu cầu phát âm thanh cùng lúc một cách tuần tự theo từng Server.
- **Dừng phát (`/van-mau stop`)**: Dừng âm thanh, xóa hàng đợi và rời phòng voice ngay lập tức.
- **Bỏ qua bài đang phát (`/van-mau skip`)**: Bỏ qua bài đang phát và tự động phát bài tiếp theo trong hàng đợi Voice.
- **Văn mẫu đe dọa (`/alo [user]`)**: Tag và gửi văn mẫu "đòi nợ/đe dọa" hài hước.
- **Văn mẫu xin lỗi (`/xin-loi [user]`)**: Gửi lời xin lỗi "chân thành" đến mục tiêu.

### 📺 Quản lý YouTube Premium

- **Kiểm tra trạng thái (`/yt-status`)**: Kiểm tra trạng thái đóng phí YouTube Premium theo từng tháng và cả năm.
- **Gửi hóa đơn (`/yt-submit`)**: Gửi ảnh chụp màn hình bill thanh toán kèm theo hình thức thanh toán (MB Bank, MoMo) để Admin/chủ host duyệt.
- **Lịch sử thanh toán (`/yt-history`)**: Xem lại danh sách lịch sử các lần chuyển khoản thanh toán YouTube Premium đã được xác nhận.

### 📊 Tra cứu thông tin

- **Giá vàng (`/giavang`)** : Cập nhật giá vàng trong nước và thế giới theo thời gian thực.
- **Giá xăng (`/giaxang`)** : Theo dõi biến động giá xăng dầu mới nhất.
- **Chat AI (`/chat`)** : Trò chuyện thông minh với OpenAI.
- **Hỗ trợ (`/help`)**: Hiển thị danh sách toàn bộ các lệnh bot đang sở hữu.

## 🛠️ Công nghệ sử dụng

- **Framework**: [Sapphire Framework](https://www.sapphirejs.dev/) & Discord.js v14.
- **Âm thanh**: `@discordjs/voice`, `google-tts-api` & `FFmpeg`.
- **Mã hóa Opus**: `opusscript` (Tối ưu hóa khả năng tương thích).
- **Web Scraping**: `cheerio` & `axios`.
- **AI**: OpenAI API.

## ⚙️ Cài đặt

### 1. Yêu cầu hệ thống

- **Node.js**: Phiên bản 20 trở lên.
- **FFmpeg**: Bắt buộc phải cài đặt trên hệ điều hành (để xử lý TTS).
  - Ubuntu: `sudo apt update && sudo apt install -y ffmpeg`
  - Windows: Tải binary và thêm vào PATH.
- **pnpm**: `corepack enable pnpm` (Khuyên dùng).

### 2. Thiết lập môi trường

Tạo file `.env` và điền đầy đủ các thông tin:

```env
DISCORD_TOKEN=Token của Bot Discord
OPENAI_API_KEY=API Key của OpenAI
OPENAI_BASE_URL=Base URL của OpenAI (Tùy chọn)

# Google Sheet YouTube Premium
GOOGLE_SERVICE_ACCOUNT_EMAIL=Email service account Google
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
SPREADSHEET_ID_YT=ID file Google Sheet
YT_SHEET_TITLE=2026 dev

# Payment ledger environment
# dev  -> ghi vào tab: Payment Submissions dev, Payment History dev
# prod -> ghi vào tab: Payment Submissions, Payment History
# Nếu bỏ trống, bot mặc định dùng prod để tránh đổi tab prod ngoài ý muốn.
YT_PAYMENT_ENV=dev

# YouTube Premium reminder
YT_REMINDER_CHANNEL_ID=ID channel nhắc nợ
YT_REMINDER_TIMEZONE=Asia/Ho_Chi_Minh
YT_PAYMENT_AMOUNT=28000
YT_HOST_DISCORD_UIDS=Discord UID chủ host, cách nhau bằng dấu phẩy

# Email SMTP
YT_EMAIL_ENABLED=false
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=Email SMTP
SMTP_PASS=Mật khẩu SMTP/App Password
SMTP_FROM="Moe Bot <Email SMTP>"
YT_HOST_BCC_EMAIL=Email chủ host nhận BCC khi nhắc nợ
```

### Lưu ý dev/prod cho lịch sử thanh toán

`YT_PAYMENT_ENV` chỉ quyết định nơi lưu dữ liệu của 2 bảng payment ledger:

- `YT_PAYMENT_ENV=prod`: dùng `Payment Submissions` và `Payment History`.
- `YT_PAYMENT_ENV=dev`: dùng `Payment Submissions dev` và `Payment History dev`.

Không dùng `YT_SHEET_TITLE` để suy luận môi trường payment ledger. `YT_SHEET_TITLE` chỉ chọn tab danh sách thành viên YouTube Premium, ví dụ `2026 dev` hoặc `2026`.

Để bảo toàn dữ liệu prod, 2 tab `Payment Submissions` và `Payment History` hiện tại được giữ nguyên. Khi dev cần test submit/confirm bill, hãy set `YT_PAYMENT_ENV=dev` để bot tự tạo và ghi vào 2 tab dev riêng.

### 3. Cài đặt thư viện

```bash
pnpm install
```

### 4. Khởi chạy

```bash
pnpm run build
pnpm start
```

## 🐳 Triển khai với Docker

Bot đi kèm Dockerfile đã được tích hợp sẵn FFmpeg hệ thống để đảm bảo tính ổn định tối đa trên Linux.

```bash
docker-compose up -d --build
```

## 📝 Giấy phép

Dự án này được phát triển cho mục đích học tập và giải trí cá nhân.
