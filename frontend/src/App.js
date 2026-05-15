import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'; 
import Sidebar from './Lee_frontend_code/Sidebar_L';

// 각 페이지 컴포넌트 임포트
import Main from './Lee_frontend_code/Main_L'; 
import QAPage from './Lee_frontend_code/Serch_L'; 
import Dashboard from './Lee_frontend_code/Dashbord_L'; 
import Project from './Lee_frontend_code/Project_L'; 
import Share from './Lee_frontend_code/Share_L'; 

// 💡 Login 임포트는 이제 필요 없으므로 삭제하거나 주석 처리합니다.
// import Login from './Lee_frontend_code/Login_L'; 

function App() {
  return (
    <Router>
      <div className="App" style={{ display: 'flex' }}>
        {/* 1. 사이드바는 화면 왼쪽에 고정 */}
        <Sidebar /> 

        {/* 2. 오른쪽 콘텐츠 영역 */}
        <div style={{ flex: 1, marginLeft: '260px' }}>
          <Routes>
            {/* 이제 /login 경로는 사용하지 않습니다. 
               대신 메인 페이지(/) 안에서 모달로 로그인이 뜹니다. 
            */}
            <Route path="/" element={<Main />} />
            <Route path="/qa" element={<QAPage />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/projects" element={<Project />} />
            <Route path="/share" element={<Share />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;