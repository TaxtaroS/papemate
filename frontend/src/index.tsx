// @ts-nocheck
// 초보자 안내: 프론트엔드 React 앱을 index.html의 root 영역에 붙이는 시작 파일입니다.

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// index.html의 <div id="root"></div>를 찾아 React 앱을 그릴 시작점으로 사용합니다.
const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
