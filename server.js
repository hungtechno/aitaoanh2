require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const multer = require('multer');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Cấu hình Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Middleware Logger để theo dõi requests và debug
app.use((req, res, next) => {
    if (req.url !== '/') {
        console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    }
    next();
});

// Thông tin Cloudflare từ .env
const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;

/**
 * Helper: Chuyển đổi Base64 sang Array of numbers (Bytes) cho Cloudflare API
 */
function base64ToUint8Array(base64String) {
    const base64 = base64String.split(',')[1] || base64String;
    const buffer = Buffer.from(base64, 'base64');
    return Array.from(new Uint8Array(buffer));
}

/**
 * Giai đoạn 1 & 2: Xử lý Inpainting qua Cloudflare Workers AI
 */
app.post('/api/harmonize', async (req, res, next) => {
    try {
        const { image, mask, prompt, strength = 0.75, num_steps = 20 } = req.body;

        if (!image || !mask) {
            return res.status(400).json({ error: 'Thiếu dữ liệu ảnh hoặc mặt nạ (mask).' });
        }

        if (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_API_TOKEN) {
            return res.status(500).json({ 
                error: 'Cấu hình lỗi', 
                details: 'Chưa tìm thấy CLOUDFLARE_ACCOUNT_ID hoặc CLOUDFLARE_API_TOKEN trong file .env. Hãy đảm bảo bạn đã tạo file .env từ .env.example' 
            });
        }

        const model = '@cf/runwayml/stable-diffusion-v1-5-inpainting';
        const url = `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/ai/run/${model}`;

        const payload = {
            prompt: prompt || "professional product photography, seamless integration, high quality, physically based rendering, cinematic lighting, soft shadows, sharp edges, 8k",
            image: base64ToUint8Array(image),
            mask: base64ToUint8Array(mask),
            strength: parseFloat(strength),
            num_steps: parseInt(num_steps)
        };

        const response = await axios.post(url, payload, {
            headers: {
                'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}`,
                'Content-Type': 'application/json'
            },
            responseType: 'arraybuffer'
        });

        const resultBase64 = Buffer.from(response.data, 'binary').toString('base64');
        const dataUri = `data:image/png;base64,${resultBase64}`;

        res.json({ success: true, image: dataUri });

    } catch (error) {
        // Chuyển lỗi sang error handler middleware
        next(error);
    }
});

// Middleware xử lý lỗi tập trung - Đảm bảo luôn trả về JSON
app.use((err, req, res, next) => {
    console.error('[Internal Error]', err.message);
    
    let details = err.message;
    if (err.response && err.response.data) {
        try {
            // Giải mã lỗi từ Cloudflare nếu là buffer
            const buffer = Buffer.from(err.response.data);
            const cloudflareErr = JSON.parse(buffer.toString());
            details = cloudflareErr.errors?.[0]?.message || details;
        } catch (e) {}
    }

    res.status(err.status || 500).json({
        success: false,
        error: 'Xử lý AI thất bại',
        details: details
    });
});

app.listen(PORT, () => {
    console.log(`
🚀 AI Photo Harmonizer đang chạy!
📍 Local: http://localhost:${PORT}
🛠 Role: Senior Fullstack AI Engineer
    `);
});
