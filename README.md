# Moe Bot 🤖

Moe Bot là một con bot Discord đa năng được phát triển bằng framework Sapphire (Node.js), cung cấp các tính năng từ tra cứu thực tế, giải trí văn mẫu đến hệ thống Voice TTS thông minh.

## 🚀 Tính năng chính

### 🎭 Giải trí & Văn mẫu
- **Văn mẫu ngẫu nhiên (`/van-mau random`)** : Lấy các bài văn mẫu "bất hủ" từ API hoặc kho lưu trữ dự phòng.
- **Voice TTS (Tiếng Việt)**: Tích hợp giọng nói AI trong lệnh `/van-mau` với khả năng tự động vào phòng Voice và đọc nội dung.
- **Tốc độ đọc linh hoạt**: Tùy chỉnh tốc độ TTS (x1.5, x2, x3) ngay trong lệnh.
- **Hệ thống hàng đợi (Voice Queue)**: Xử lý nhiều yêu cầu phát âm thanh cùng lúc một cách tuần tự theo từng Server.
- **Dừng phát (`/van-mau stop`)**: Dừng âm thanh, xóa hàng đợi và rời phòng voice ngay lập tức.
- **Văn mẫu đe dọa (`/alo [user]`)**: Tag và gửi văn mẫu "đòi nợ/đe dọa" hài hước.
- **Văn mẫu xin lỗi (`/xin-loi [user]`)**: Gửi lời xin lỗi "chân thành" đến mục tiêu.

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
```

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
