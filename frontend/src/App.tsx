// @ts-nocheck
// 초보자 안내: PaperMate 프론트엔드의 최상위 컴포넌트입니다. 로그인 상태와 메인 화면을 감쌉니다.

import React from 'react';
import Home from './pages/Home';
import { AuthProvider } from './context/AuthContext';

class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 32, fontFamily: 'sans-serif', color: '#0f172a' }}>
          <h2>화면을 불러오지 못했습니다.</h2>
          <p>저장된 임시 데이터 형식이 맞지 않아 화면이 멈췄을 수 있습니다.</p>
          <pre style={{ whiteSpace: 'pre-wrap', color: '#dc2626' }}>
            {this.state.error.message}
          </pre>
          <button type="button" onClick={() => window.location.reload()}>
            다시 불러오기
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

function App() {
  return (
    <AuthProvider>
      <AppErrorBoundary>
        <div className="App">
          <Home />
        </div>
      </AppErrorBoundary>
    </AuthProvider>
  );
}

export default App;
