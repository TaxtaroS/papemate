// 초보자 안내: Tailwind CSS가 어떤 파일에서 클래스 이름을 찾을지 알려주는 설정 파일입니다.

const toScale = (values) => ({
  50: values[0],
  100: values[1],
  200: values[2],
  300: values[3],
  400: values[4],
  500: values[5],
  600: values[6],
  700: values[7],
  800: values[8],
  900: values[9],
});

module.exports = {
  content: ['./public/index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        kakao: '#fee500',
        naver: '#03c75a',
        gray: toScale(['#f8f9fa', '#f1f3f5', '#e9ecef', '#dee2e6', '#ced4da', '#adb5bd', '#868e96', '#495057', '#343a40', '#212529']),
        slate: toScale(['#f8f9fa', '#f1f3f5', '#e9ecef', '#dee2e6', '#ced4da', '#adb5bd', '#868e96', '#495057', '#343a40', '#212529']),
        teal: toScale(['#e6f4f4', '#c3fae8', '#96f2d7', '#63e6be', '#38d9a9', '#0ea5a4', '#0d9493', '#0ca678', '#099268', '#087f5b']),
        green: toScale(['#ebfbee', '#d3f9d8', '#b2f2bb', '#8ce99a', '#69db7c', '#51cf66', '#40c057', '#37b24d', '#2f9e44', '#2b8a3e']),
        blue: toScale(['#e7f5ff', '#d0ebff', '#a5d8ff', '#74c0fc', '#4dabf7', '#339af0', '#228be6', '#1c7ed6', '#1971c2', '#1864ab']),
      },
    },
  },
  plugins: [],
};
