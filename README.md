# Moe Bot 🤖

Moe Bot là một con bot Discord đa năng được phát triển bằng framework Sapphire (Node.js), cung cấp các tính năng từ tra cứu thông tin thực tế đến trò chuyện thông minh.

## 🚀 Tính năng chính

- **Tra cứu giá vàng (`/giavang`)** : Cập nhật giá vàng trong nước và thế giới theo thời gian thực.
- **Tra cứu giá xăng (`/giaxang`)** : Theo dõi biến động giá xăng dầu (PVOIL, Petrolimex...) mới nhất.
- **Chat AI (`/chat`)** : Tích hợp trí tuệ nhân tạo (OpenAI) để trò chuyện và trả lời thắc mắc của người dùng.
- **Tiện ích hệ thống** : Lệnh `/ping` để kiểm tra độ trễ và tình trạng hoạt động của bot.

## 🛠️ Công nghệ sử dụng

- **Ngôn ngữ**: Node.js (v18+)
- **Framework**: [@sapphire/framework](https://www.sapphirejs.dev/) - Một framework mạnh mẽ xây dựng trên Discord.js.
- **Web Scraping**: `cheerio` & `axios` dùng để lấy dữ liệu giá vàng/xăng dầu.
- **AI**: `openai` API.
- **Docker**: Hỗ trợ triển khai nhanh chóng và ổn định bằng container.

## ⚙️ Cài đặt

### 1. Yêu cầu hệ thống

- Node.js phiên bản 18 trở lên.
- [pnpm](https://pnpm.io/) (Khuyên dùng) hoặc npm/yarn.

### 2. Thiết lập môi trường

Tạo file `.env` từ file `.env.example` và điền đầy đủ các thông tin:

```env
APP_ID=Application ID của Bot Discord
DISCORD_TOKEN=Token của Bot Discord
PUBLIC_KEY=Public Key của Bot Discord
OPENAI_API_KEY=API Key của OpenAI
OPENAI_BASE_URL=Base URL của OpenAI
```

### 3. Cài đặt thư viện

```bash
pnpm install
```

### 4. Khởi chạy

```bash
pnpm start
```

## 🐳 Triển khai với Docker

Bot đã được cấu hình sẵn với Docker và Docker Compose để dễ dàng triển khai trên Server/VPS.

```bash
docker-compose up -d --build
```

## 📝 Giấy phép

Dự án này được phát triển cho mục đích học tập và sử dụng cá nhân.
