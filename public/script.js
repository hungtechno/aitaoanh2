document.addEventListener('DOMContentLoaded', () => {
    // --- KHAI BÁO BIẾN ELEMENTS ---
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const editorContainer = document.getElementById('editor-container');
    const sourceImg = document.getElementById('source-img');
    const maskCanvas = document.getElementById('mask-canvas');
    const ctx = maskCanvas.getContext('2d');
    
    const canvasTools = document.getElementById('canvas-tools');
    const brushSizeInput = document.getElementById('brush-size');
    const brushVal = document.getElementById('brush-val');
    const clearBtn = document.getElementById('clear-btn');
    const actionBar = document.getElementById('action-bar');
    const renderBtn = document.getElementById('render-btn');
    
    // Nâng cấp: Các biến cho Blur và Strength
    const maskBlurInput = document.getElementById('mask-blur');
    const blurVal = document.getElementById('blur-val');
    const aiStrengthInput = document.getElementById('ai-strength');
    const strengthVal = document.getElementById('strength-val');
    
    const chatPanel = document.getElementById('chat-panel');
    const chatHistory = document.getElementById('chat-history');
    const userInput = document.getElementById('user-input');
    const sendBtn = document.getElementById('send-btn');
    
    const loader = document.getElementById('loader');
    const loaderText = document.getElementById('loader-text');
    const downloadArea = document.getElementById('download-area');
    const downloadBtn = document.getElementById('download-btn');
    const resetBtn = document.getElementById('reset-btn');

    // --- TRẠNG THÁI ỨNG DỤNG ---
    let originalImageBase64 = null;
    let currentResultBase64 = null;
    let isDrawing = false;
    let hasDrawn = false;

    // --- 1. XỬ LÝ UPLOAD ẢNH ---
    dropZone.addEventListener('click', () => fileInput.click());
    
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) handleFile(e.target.files[0]);
    });

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('active');
    });

    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('active'));

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('active');
        if (e.dataTransfer.files.length > 0) handleFile(e.dataTransfer.files[0]);
    });

    function handleFile(file) {
        if (!file.type.startsWith('image/')) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            originalImageBase64 = e.target.result;
            sourceImg.src = originalImageBase64;
            
            sourceImg.onload = () => {
                // Hiển thị khung editor
                dropZone.classList.add('hidden');
                editorContainer.classList.remove('hidden');
                canvasTools.classList.remove('hidden');
                actionBar.classList.remove('hidden');
                
                // Đồng bộ kích thước Canvas với ảnh
                setupCanvas();
            };
        };
        reader.readAsDataURL(file);
    }

    // --- 2. LOGIC CANVAS MASKING ---
    function setupCanvas() {
        maskCanvas.width = sourceImg.clientWidth;
        maskCanvas.height = sourceImg.clientHeight;
        
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = 'rgba(47, 129, 247, 0.6)'; // Màu Brush (Xanh neon mờ)
        ctx.shadowBlur = 5;
        ctx.shadowColor = '#2f81f7';
    }

    brushSizeInput.addEventListener('input', (e) => {
        brushVal.textContent = e.target.value + 'px';
    });

    maskBlurInput.addEventListener('input', (e) => {
        blurVal.textContent = e.target.value + 'px';
    });

    aiStrengthInput.addEventListener('input', (e) => {
        strengthVal.textContent = (e.target.value / 100).toFixed(2);
    });

    maskCanvas.addEventListener('mousedown', startDrawing);
    maskCanvas.addEventListener('mousemove', draw);
    window.addEventListener('mouseup', stopDrawing);

    function startDrawing(e) {
        isDrawing = true;
        hasDrawn = true;
        ctx.beginPath();
        const { x, y } = getMousePos(e);
        ctx.moveTo(x, y);
    }

    function draw(e) {
        if (!isDrawing) return;
        const { x, y } = getMousePos(e);
        ctx.lineWidth = brushSizeInput.value;
        ctx.lineTo(x, y);
        ctx.stroke();
    }

    function stopDrawing() {
        if (isDrawing) {
            ctx.closePath();
            isDrawing = false;
        }
    }

    function getMousePos(e) {
        const rect = maskCanvas.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    }

    clearBtn.addEventListener('click', () => {
        ctx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
        hasDrawn = false;
    });

    // --- 3. LOGIC XUẤT MẶT NẠ (BLACK & WHITE) ---
    function getMaskBase64() {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = sourceImg.naturalWidth;
        tempCanvas.height = sourceImg.naturalHeight;
        const tCtx = tempCanvas.getContext('2d');

        // Nền đen (Vùng giữ nguyên)
        tCtx.fillStyle = 'black';
        tCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

        // Vẽ Mask trắng (Vùng AI sẽ vẽ lại)
        tCtx.lineCap = 'round';
        tCtx.lineJoin = 'round';
        tCtx.strokeStyle = 'white';
        
        // Scale brush size tỉ lệ với ảnh gốc
        const scale = sourceImg.naturalWidth / maskCanvas.width;
        tCtx.lineWidth = brushSizeInput.value * scale;

        // Vẽ lại nội dung từ canvas hiển thị nhưng dùng màu trắng
        // Ở đây ta dùng canvas hiện tại làm mẫu hoặc vẽ lại từ mảng points. 
        // Đơn giản nhất: Vẽ lại canvas mask hiện tại lên temp canvas với globalCompositeOperation
        tCtx.drawImage(maskCanvas, 0, 0, tempCanvas.width, tempCanvas.height);
        
        // Để đảm bảo là Trắng Tuyệt Đối trên Đen Tuyệt Đối:
        const imgData = tCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
        for (let i = 0; i < imgData.data.length; i += 4) {
            const alpha = imgData.data[i + 3];
            if (alpha > 10) { // Có nét vẽ
                imgData.data[i] = 255;
                imgData.data[i+1] = 255;
                imgData.data[i+2] = 255;
                imgData.data[i+3] = 255;
            } else {
                imgData.data[i] = 0;
                imgData.data[i+1] = 0;
                imgData.data[i+2] = 0;
                imgData.data[i+3] = 255;
            }
        }
        tCtx.putImageData(imgData, 0, 0);

        return tempCanvas.toDataURL('image/png');
    }

    function getProcessedMaskBase64() {
        const rawMask = getMaskBase64();
        const blurSize = parseInt(maskBlurInput.value);
        
        if (blurSize === 0) return rawMask;

        // Tạo canvas phụ để làm mờ
        const blurCanvas = document.createElement('canvas');
        blurCanvas.width = sourceImg.naturalWidth;
        blurCanvas.height = sourceImg.naturalHeight;
        const bCtx = blurCanvas.getContext('2d');

        // Áp dụng bộ lọc Blur (Khử răng cưa cho cạnh mask)
        bCtx.filter = `blur(${blurSize}px)`;
        
        const tempImg = new Image();
        return new Promise((resolve) => {
            tempImg.onload = () => {
                bCtx.drawImage(tempImg, 0, 0);
                resolve(blurCanvas.toDataURL('image/png'));
            };
            tempImg.src = rawMask;
        });
    }

    // --- 4. GỌI API HARMONIZE (GIAI ĐOẠN 1) ---
    renderBtn.addEventListener('click', async () => {
        if (!hasDrawn) {
            alert('Vui lòng bôi mask lên vật thể 3D cần hòa hợp!');
            return;
        }

        const maskBase64 = await getProcessedMaskBase64();
        await callHarmonizeAPI(originalImageBase64, maskBase64, null, "Giai đoạn 1: Đang Auto-Harmonize...");
    });

    async function callHarmonizeAPI(imgBase64, maskBase64, textPrompt, loadingMsg) {
        showLoading(true, loadingMsg);
        
        try {
            const response = await fetch('/api/harmonize', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    image: imgBase64,
                    mask: maskBase64,
                    prompt: textPrompt,
                    strength: aiStrengthInput.value / 100,
                    num_steps: 25
                })
            });

            // Kiểm tra nếu phản hồi không phải JSON
            const contentType = response.headers.get("content-type");
            if (!contentType || !contentType.includes("application/json")) {
                const text = await response.text();
                console.error("Server trả về phản hồi không phải JSON:", text);
                throw new Error(`Server error (${response.status}): Vui lòng kiểm tra console log của server.`);
            }

            const data = await response.json();
            
            if (data.success) {
                currentResultBase64 = data.image;
                sourceImg.src = currentResultBase64;
                
                unlockChat();
                
                if (textPrompt) {
                    addMessage('bot', 'Đã cập nhật ảnh theo yêu cầu của bạn!');
                } else {
                    addMessage('bot', 'Auto Harmonize hoàn tất! Bạn có thể tinh chỉnh thêm qua chat ↓');
                }
            } else {
                throw new Error(data.details || data.error || 'Lỗi không xác định');
            }
        } catch (err) {
            console.error(err);
            addMessage('bot', `<i class="fa-solid fa-triangle-exclamation"></i> <strong>Lỗi:</strong> ${err.message}`);
            // Thông báo thân thiện cho người dùng về .env
            if (err.message.includes('file .env')) {
                alert('Bạn chưa cấu hình Cloudflare. Hãy tạo file .env trong thư mục dự án!');
            }
        } finally {
            showLoading(false);
        }
    }

    // --- 5. HỆ THỐNG CHAT (GIAI ĐOẠN 2) ---
    function unlockChat() {
        chatPanel.classList.remove('chat-locked');
        userInput.disabled = false;
        sendBtn.disabled = false;
        downloadArea.classList.remove('hidden');
        maskCanvas.classList.add('hidden'); // Ẩn mask sau khi đã có kết quả
    }

    sendBtn.addEventListener('click', handleChat);
    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleChat();
    });

    async function handleChat() {
        const msg = userInput.value.trim();
        if (!msg) return;

        addMessage('user', msg);
        userInput.value = '';

        const maskBase64 = await getProcessedMaskBase64();
        // Gửi kèm prompt mới để tinh chỉnh
        await callHarmonizeAPI(originalImageBase64, maskBase64, msg, "Đang tinh chỉnh theo yêu cầu...");
    }

    function addMessage(role, text) {
        const div = document.createElement('div');
        div.className = `message ${role}`;
        div.innerHTML = `<div class="msg-content">${text}</div>`;
        chatHistory.appendChild(div);
        chatHistory.scrollTop = chatHistory.scrollHeight;
    }

    // --- 6. UTILS (LOADING, DOWNLOAD, RESET) ---
    function showLoading(show, text = "") {
        loader.classList.toggle('hidden', !show);
        if (text) loaderText.textContent = text;
        renderBtn.disabled = show;
        sendBtn.disabled = show;
    }

    downloadBtn.addEventListener('click', () => {
        const link = document.createElement('a');
        link.download = 'harmonized-photo.png';
        link.href = currentResultBase64;
        link.click();
    });

    resetBtn.addEventListener('click', () => {
        location.reload();
    });
});
