import React, { useEffect, useState, useRef } from 'react';
import '../css/reset.css';
import '../css/layout.css';
import '../css/sidebar.css';
import '../css/analysis.css';

function Analysis() {
  const [username, setUsername] = useState('user14530');
  
  // ─── 1. 바닐라 JS 기능을 대체할 리액트 상태(State) 선언 ───
  const [files, setFiles] = useState([
    { id: 1, name: 'attention_is_all_you_need.pdf', size: '2.1MB', analyzing: false },
    { id: 2, name: 'BERT_pretraining.pdf', size: '1.8MB', analyzing: false },
    { id: 3, name: 'GPT4_technical_report.pdf', size: '분석 중', analyzing: true }
  ]);

  const [messages, setMessages] = useState([
    { id: 1, role: 'ai', text: '3개의 논문을 업로드하셨네요! 어떤 내용이 궁금하신가요? 각 논문의 핵심 내용, 실험 결과 비교, 또는 방법론 차이점을 분석해드릴 수 있어요.' },
    { id: 2, role: 'user', text: '세 논문의 정확도 성능을 비교해줘' },
    { id: 3, role: 'ai', text: '논문별 주요 벤치마크 정확도를 비교를 하고 있습니다.' }
  ]);

  const [inputText, setInputText] = useState('');
  const [isInsideDrag, setIsInsideDrag] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);

  // DOM 접근을 위한 Ref 선언 (숨겨진 파일 input 클릭 및 스크롤 제어용)
  const fileInputRef = useRef(null);
  const chatMessagesRef = useRef(null);

  // ─── 2. 초기 로그인 및 스크롤 제어 Effect ───
  useEffect(() => {
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    if (!isLoggedIn) {
      window.location.href = './login.html';
    }

    const savedUsername = localStorage.getItem('username');
    if (savedUsername) {
      setUsername(savedUsername);
    }
  }, []);

  // 새 메시지가 추가될 때마다 채팅창을 가장 아래로 스크롤
  useEffect(() => {
    if (chatMessagesRef.current) {
      chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
    }
  }, [messages, isAiLoading]);

  // ─── 3. 파일 업로드 핸들러 함수들 ───
  const handlePlusOrZoneClick = () => {
    fileInputRef.current.click();
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsInsideDrag(true);
  };

  const handleDragLeave = () => {
    setIsInsideDrag(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsInsideDrag(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleFileChange = () => {
    if (fileInputRef.current.files) {
      handleFiles(fileInputRef.current.files);
    }
  };

  const handleFiles = (uploadedFiles) => {
    Array.from(uploadedFiles).forEach((file) => {
      const newId = Date.now() + Math.random();
      
      // 우선 '분석 중' 상태로 파일 목록에 추가
      const newFile = {
        id: newId,
        name: file.name,
        size: '분석 중',
        analyzing: true
      };
      
      setFiles((prev) => [...prev, newFile]);

      // 2초 후 분석 완료 상태로 업데이트 (기존 setTimeout 로직 이식)
      setTimeout(() => {
        const sizeMB = `${(file.size / 1024 / 1024).toFixed(1)}MB`;
        setFiles((prev) =>
          prev.map((f) => (f.id === newId ? { ...f, size: sizeMB, analyzing: false } : f))
        );
      }, 2000);
    });
  };

  // ─── 4. 채팅 메시지 전송 핸들러 함수들 ───
  const handleSendMessage = () => {
    const text = inputText.trim();
    if (!text) return;

    // 유저 메시지 추가
    setMessages((prev) => [...prev, { id: Date.now(), role: 'user', text }]);
    setInputText('');
    
    // AI 로딩 상태 ON
    setIsAiLoading(true);

    // 1.5초 후 AI 응답 추가 및 로딩 OFF (기존 setTimeout 로직 이식)
    setTimeout(() => {
      setIsAiLoading(false);
      setMessages((prev) => [
        ...prev,
        { id: Date.now() + 1, role: 'ai', text: 'AI 분석 중입니다. 잠시만 기다려 주세요.' }
      ]);
    }, 1500);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  return (
    <div className="container">
      {/* ── 사이드바 ── */}
      <aside className="sidebar">
        <div className="logo-wrap">
          <div className="logo-icon"><i className="fa-solid fa-robot"></i></div>
          <div className="logo-text">
            <span>ChatBot AI</span>
            <h2>Paper Mate</h2>
          </div>
        </div>

        <div className="menu-group">
          <a href="./index.html" className="menu-link">
            <div className="menu-item">
              <i className="fa-regular fa-message"></i>
              <span>새 채팅</span>
            </div>
          </a>
          <div className="menu-sub">최근 대화</div>
          <div className="menu-item"><i className="fa-regular fa-message"></i><span>Rag란 무엇인가</span></div>
          <div className="menu-item"><i className="fa-regular fa-message"></i><span>비교분석</span></div>
          <div className="menu-item"><i className="fa-regular fa-message"></i><span>LLM이란 무엇인가</span></div>
        </div>

        <div className="menu-bottom">
          <div className="menu-item"><i className="fa-solid fa-share-nodes"></i><span>공유</span></div>
          <div className="menu-item"><i className="fa-regular fa-clock"></i><span>히스토리</span></div>
          <div className="menu-item active-menu"><i className="fa-solid fa-chart-simple"></i><span>분석 비교</span></div>
          <a href="./dashboard.html" className="menu-link">
            <div className="menu-item"><i className="fa-regular fa-folder"></i><span>대시보드</span></div>
          </a>
        </div>

        <div className="user-box">
          <i className="fa-regular fa-circle-user"></i>
          <span id="sidebarUsername">{username}</span>
          <i className="fa-solid fa-gear"></i>
        </div>
      </aside>

      {/* ── 메인 영역 ── */}
      <main className="analysis-main">
        <div className="analysis-header">
          <h1>AI 분석 Q&amp;A</h1>
          <div className="analysis-header-btns">
            <button className="header-btn"><i className="fa-regular fa-floppy-disk"></i>차트 저장</button>
            <button className="header-btn share"><i className="fa-solid fa-paperclip"></i>공유</button>
          </div>
        </div>

        <div className="analysis-body">
          {/* 왼쪽: 업로드 패널 */}
          <aside className="upload-panel">
            {/* 드래그 앤 드롭 존 */}
            <div 
              className={`drop-zone ${isInsideDrag ? 'dragover' : ''}`}
              onClick={handlePlusOrZoneClick}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <i className="fa-solid fa-upload"></i>
              <p>Drag &amp; Drop</p>
              <p className="drop-sub">HWP, PDF, HWPX 지원</p>
              <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleFileChange}
                multiple 
                accept=".pdf,.hwp,.hwpx" 
                style={{ display: 'none' }} // 기존 input을 보이지 않게 처리
              />
            </div>

            {/* 업로드된 파일 목록 데이터 기반 동적 렌더링 */}
            <div className="upload-file-list">
              {files.map((file) => (
                <div key={file.id} className={`upload-file-item ${file.analyzing ? 'analyzing' : ''}`}>
                  <i className="fa-regular fa-file-pdf"></i>
                  <span className="file-name">{file.name}</span>
                  {file.analyzing ? (
                    <span className="file-badge">분석 중</span>
                  ) : (
                    <span className="file-size">{file.size}</span>
                  )}
                </div>
              ))}
            </div>

            <div className="analyzing-status">
              <i className="fa-solid fa-rotate analyzing-spin"></i>
              <span>AI가 문서를 분석하고 있어요...</span>
            </div>
          </aside>

          {/* 오른쪽: 채팅 영역 */}
          <section className="chat-area">
            {/* 대화 메시지 목록 데이터 기반 동적 렌더링 */}
            <div className="chat-messages" ref={chatMessagesRef}>
              {messages.map((msg) => (
                <div key={msg.id} className={`chat-row ${msg.role}`}>
                  {msg.role === 'ai' && (
                    <div className="chat-avatar"><i className="fa-solid fa-robot"></i></div>
                  )}
                  <div className={`chat-bubble ${msg.role}-bubble`}>
                    {msg.text}
                  </div>
                </div>
              ))}

              {/* AI 응답 대기 로딩 조건부 렌더링 */}
              {isAiLoading && (
                <div className="chat-row ai">
                  <div className="chat-avatar"><i className="fa-solid fa-robot"></i></div>
                  <div className="chat-bubble ai-bubble">
                    <span style={{ color: '#aaa' }}>분석 중...</span>
                  </div>
                </div>
              )}
            </div>

            {/* 입력창 */}
            <div className="analysis-chat-box">
              <button className="plus-btn" onClick={handlePlusOrZoneClick}>
                <i className="fa-solid fa-plus"></i>
              </button>
              <input
                type="text"
                className="chat-input"
                placeholder="논문에 대해 질문하세요..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
              />
              <button className="send-btn" onClick={handleSendMessage}>
                <i className="fa-regular fa-paper-plane"></i>
              </button>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

export default Analysis;