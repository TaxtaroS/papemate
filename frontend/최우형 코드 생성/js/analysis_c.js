// analysis.js

const dropZone       = document.getElementById('dropZone');
const fileInput      = document.getElementById('analysisFileInput');
const uploadFileList = document.getElementById('uploadFileList');
const chatMessages   = document.getElementById('chatMessages');
const chatInput      = document.getElementById('analysisChatInput');
const sendBtn        = document.getElementById('analysisSendBtn');
const plusBtn        = document.getElementById('analysisPlusBtn');

/* ─── 파일 업로드 ─── */
plusBtn.addEventListener('click', () => fileInput.click());

dropZone.addEventListener('click', () => fileInput.click());

dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropZone.classList.add('dragover');
});

dropZone.addEventListener('dragleave', () => {
  dropZone.classList.remove('dragover');
});

dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('dragover');
  handleFiles(e.dataTransfer.files);
});

fileInput.addEventListener('change', () => {
  handleFiles(fileInput.files);
});

function handleFiles(files) {
  Array.from(files).forEach(file => {
    const sizeMB = (file.byteStat / 1024 / 1024).toFixed(1);
    const item = document.createElement('div');
    item.className = 'upload-file-item analyzing';
    item.innerHTML = `
      <i class="fa-regular fa-file-pdf"></i>
      <span class="file-name">${file.name}</span>
      <span class="file-badge">분석 중</span>
    `;
    uploadFileList.appendChild(item);

    // 2초 후 분석 완료 상태로 전환
    setTimeout(() => {
      item.classList.remove('analyzing');
      item.innerHTML = `
        <i class="fa-regular fa-file-pdf"></i>
        <span class="file-name">${file.name}</span>
        <span class="file-size">${(file.size / 1024 / 1024).toFixed(1)}MB</span>
      `;
    }, 2000);
  });
}

/* ─── 채팅 메시지 전송 ─── */
sendBtn.addEventListener('click', sendMessage);
chatInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') sendMessage();
});

function sendMessage() {
  const text = chatInput.value.trim();
  if (!text) return;

  // 유저 말풍선 추가
  appendMessage('user', text);
  chatInput.value = '';

  // 로딩 표시
  const loadingEl = appendLoading();

  // 1.5초 후 AI 응답 (실제 연동 시 API 호출로 교체)
  setTimeout(() => {
    loadingEl.remove();
    appendMessage('ai', 'AI 분석 중입니다. 잠시만 기다려 주세요.');
  }, 1500);
}

function appendMessage(role, text) {
  const row = document.createElement('div');
  row.className = `chat-row ${role}`;

  if (role === 'ai') {
    row.innerHTML = `
      <div class="chat-avatar"><i class="fa-solid fa-robot"></i></div>
      <div class="chat-bubble ai-bubble">${text}</div>
    `;
  } else {
    row.innerHTML = `
      <div class="chat-bubble user-bubble">${text}</div>
    `;
  }

  chatMessages.appendChild(row);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  return row;
}

function appendLoading() {
  const row = document.createElement('div');
  row.className = 'chat-row ai';
  row.innerHTML = `
    <div class="chat-avatar"><i class="fa-solid fa-robot"></i></div>
    <div class="chat-bubble ai-bubble">
      <span style="color:#aaa">분석 중...</span>
    </div>
  `;
  chatMessages.appendChild(row);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  return row;
}
