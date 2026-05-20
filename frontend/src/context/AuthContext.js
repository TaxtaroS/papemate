import React, { createContext, useState, useContext, useEffect } from 'react';
import { authAPI } from '../services/api';
import { migrateCurrentUserStorage } from '../utils/storageKeys';

// React Context API로 로그인 상태를 앱 전체에서 공유합니다.
// Home, Sidebar, 각 페이지는 useAuth()를 통해 현재 로그인 유저와 login/logout 함수를 가져옵니다.
const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  // useState는 React의 상태 저장 기능입니다.
  // 값이 바뀌면 이 Context를 사용하는 컴포넌트들이 다시 렌더링됩니다.
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // useEffect는 컴포넌트가 처음 올라올 때 실행되는 React Hook입니다.
  // 새로고침 후에도 로그인 상태를 유지하기 위해 localStorage의 토큰을 확인합니다.
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    const username = localStorage.getItem('username');
    const userId = localStorage.getItem('userId');

    if (token && username && userId) {
      // 로그인된 계정을 확인한 뒤, 예전 저장 데이터를 현재 계정 키로 한 번 이전합니다.
      migrateCurrentUserStorage();
      setIsLoggedIn(true);
      setUser({ username, id: userId });
    }
    setLoading(false);
  }, []);

  // authAPI는 services/api.js에 정의된 axios 기반 API 호출 객체입니다.
  // 백엔드 로그인 성공 시 access_token과 user 정보를 받아 localStorage에 저장합니다.
  const login = async (username, password) => {
    const response = await authAPI.login(username, password);
    const { access_token, user: userData } = response.data;

    localStorage.setItem('accessToken', access_token);
    localStorage.setItem('username', userData.username);
    localStorage.setItem('userId', userData.id);

    // userId가 저장된 다음 실행해야 계정별 저장소 키가 올바르게 만들어집니다.
    migrateCurrentUserStorage();

    setIsLoggedIn(true);
    setUser(userData);
  };

  // 회원가입도 로그인과 동일하게 토큰/유저 정보를 저장한 뒤 앱 상태를 로그인으로 바꿉니다.
  const signup = async (username, password) => {
    const response = await authAPI.signup(username, password);
    const { access_token, user: userData } = response.data;

    localStorage.setItem('accessToken', access_token);
    localStorage.setItem('username', userData.username);
    localStorage.setItem('userId', userData.id);
    migrateCurrentUserStorage();

    setIsLoggedIn(true);
    setUser(userData);
  };

  // 로그아웃은 인증 정보만 지웁니다.
  // 프로젝트/대화 데이터는 계정별 키에 남겨 두어 다음 로그인 때 다시 볼 수 있게 합니다.
  const logout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('username');
    localStorage.removeItem('userId');
    setIsLoggedIn(false);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        isLoggedIn,
        user,
        loading,
        login,
        signup,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// Context를 직접 만지지 않고 useAuth()로만 쓰게 만드는 커스텀 Hook입니다.
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
