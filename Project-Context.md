# Project Context: Moe Bot 🤖

## Overview

**Moe Bot** (còn gọi là **Demo**) là một Discord bot đa năng được xây dựng trên nền tảng **Sapphire Framework** (Node.js). Bot kết hợp khả năng tương tác thông minh qua AI, tra cứu dữ liệu thực tế (giá vàng, xăng dầu) và các tiện ích hệ thống với một phong cách đặc trưng (anime/wibu).

## Tech Stack

- **Runtime**: Node.js (v18+)
- **Framework**: [@sapphire/framework](https://www.sapphirejs.dev/) (v5.5.0)
- **Library**: [discord.js](https://discord.js.org/) (v14)
- **AI Integration**: OpenAI API (gói `openai`)
- **Web Scraping**: `axios` & `cheerio`
- **Database/Logging**: Google Spreadsheet (`google-spreadsheet`) - _Mới tích hợp_
- **Deployment**: Docker & Docker Compose

## Project Structure

```text
moe-bot/
├── src/
│   ├── index.js             # Điểm khởi đầu của ứng dụng
│   ├── commands/            # Chứa các Slash Commands (Sapphire commands)
│   │   ├── chat.js          # Lệnh /chat (AI)
│   │   ├── giavang.js       # Lệnh /giavang (Scraping)
│   │   ├── giaxang.js       # Lệnh /giaxang (Scraping)
│   │   └── ping.js          # Lệnh /ping (Hệ thống)
│   ├── lib/                 # Thư viện dùng chung
│   │   ├── history.js       # Quản lý lịch sử hội thoại cho Chat AI
│   │   └── scraper.js       # Logic cào dữ liệu từ các website
│   └── utils/               # Tiện ích bổ trợ
│       └── system-promp.js  # Định nghĩa "nhân cách" và hướng dẫn cho AI
├── Dockerfile               # Cấu hình container hóa
├── docker-compose.yml       # Điều phối dịch vụ (Development/Staging)
├── package.json             # Quản lý dependencies và scripts
└── .env                     # Biến môi trường (Token, API Keys)
```

## Core Features & Logic

### 1. Chat AI (`/chat`)

- **Model**: Sử dụng OpenAI GPT.
- **Persona**: Style "anime wibu", siêu cute (uwu, nà~), sử dụng Tiếng Việt đan xen thuật ngữ Tiếng Anh kỹ thuật.
- **Context Management**: Sử dụng `src/lib/history.js` để lưu trữ tối đa 10 tin nhắn gần nhất mỗi channel (trong bộ nhớ tạm) để giữ ngữ cảnh hội thoại.

### 2. Market Data Scraping (`/giavang`, `/giaxang`)

- **Logic**: Nằm trong `src/lib/scraper.js`.
- **Target**: Cào dữ liệu từ các trang web giá xăng (PVOIL) và vàng (WebGia/SJC).
- **Format**: Trả về thông tin dưới dạng Discord Embeds chuyên nghiệp.

### 3. Google Spreadsheet Integration

- Dự án vừa được cài đặt thư viện `google-spreadsheet`.
- **Mục tiêu**: Có thể được dùng để lưu trữ logs, quản lý whitelist, hoặc lưu dữ liệu giá thị trường một cách bền vững mà không cần database phức tạp.

## Development Workflow

- **Chạy local**: `pnpm start` (Yêu cầu Node 18+).
- **Dockerize**: Hỗ trợ chạy 24/7 trên VPS thông qua Docker Compose.
- **Update Commands**: Sapphire tự động đăng ký/cập nhật Slash Commands khi bot khởi động.
