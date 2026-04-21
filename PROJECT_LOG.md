# HỒ SƠ CHI TIẾT DỰ ÁN: AI PHOTO HARMONIZER

Dưới đây là toàn bộ ghi chép về quá trình xây dựng, giải thích kỹ thuật và hướng dẫn vận hành dự án.

## 1. TỔNG QUAN & KIẾN TRÚC
Dự án là một ứng dụng AI Inpainting, giúp hòa hợp các vật thể 3D vào ảnh nền thực tế.
- **Backend (server.js)**: Đóng vai trò là "người vận chuyển" (Proxy) để gửi ảnh lên Cloudflare. Việc này giúp bảo mật API Key của bạn (không lộ ra ở phía người dùng).
- **Frontend (public/)**: Giao diện người dùng cao cấp với hiệu ứng Glassmorphism và Canvas hỗ trợ bôi mask.

## 2. GIẢI THÍCH VỀ DEPLOY (QUAN TRỌNG)
Trong quá trình thực hiện, chúng ta đã gặp vấn đề với GitHub Pages:
- **Hiện tượng**: Link GitHub Pages báo lỗi 405 khi nhấn nút AI.
- **Giải thích**: GitHub Pages chỉ dành cho web tĩnh. Nó không thể chạy Node.js (file server.js). Do đó, khi web gọi API xử lý ảnh, GitHub không có "bộ não" backend để trả lời.
- **Giải pháp**: Sử dụng **Render.com**. Render hỗ trợ chạy Server Node.js, giúp xử lý toàn bộ quy trình từ hiển thị giao diện đến gọi API AI. Hãy sử dụng link Render làm link chính thức.

## 3. HƯỚNG DẪN CẤU HÌNH CLOUDFLARE
Để AI hoạt động, bạn cần 2 mã số từ [dash.cloudflare.com](https://dash.cloudflare.com/):
- **Account ID**: Nằm ngay trên URL trình duyệt sau khi bạn đăng nhập (chuỗi 32 ký tự).
- **API Token**: Tạo trong mục *My Profile* -> *API Tokens* -> Dùng mẫu *Workers AI*.
- **Lưu ý**: Token này chỉ hiện 1 lần, cần lưu lại ngay vào file `.env` (local) và tab *Environment* (trên Render).

## 4. QUY TRÌNH CẬP NHẬT CODE NHANH
Mỗi khi bạn sửa code ở máy tính, hãy chạy các lệnh sau để đẩy lên GitHub & Render tự động cập nhật:
```bash
git add .
git commit -m "Mô tả thay đổi"
git push
```

## 5. CÁC LƯU Ý VỀ BẢO MẬT
- **File .gitignore**: Tôi đã cài đặt để chặn file `.env` không bị đưa lên GitHub. Điều này cực kỳ quan trọng để bảo vệ tiền và tài khoản Cloudflare của bạn.
- **Environment Variables trên Render**: Khi deploy, bạn phải nhập thủ công ID và Token vào mục Environment của Render vì file `.env` không có trên đó.

## 6. HƯỚNG DẪN VẬN HÀNH (LOCAL)
1. Cài thư viện: `npm install`
2. Tạo file `.env` (copy từ `.env.example`).
3. Chạy: `node server.js` hoặc `npm start`.
4. Truy cập: `localhost:3000`.

---
*Tài liệu này được biên soạn bởi Antigravity để lưu lại toàn bộ tri thức trong cuộc trò chuyện này.*
