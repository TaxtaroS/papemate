# ----streamlit 에서 바로 사용해보기 위해 만든 임시파일입니다.
# 쥬피터 노트북이나 코랩에서 바로 실행해 보실수 있어요.
# pip부터 설치 후 초기화 해주시고, 구글 api-key 생성하시면 됩니다.
# owpml test용 코드 입니다


pip install streamlit pypdf pillow pytesseract pandas opencv-python

pip install google-genai streamlit pypdf pandas pillow


import subprocess
import time

# --- [Personalization] 타스 형님의 웹 전용 app.py 다시 쓰기 ---
with open("app.py", "w", encoding="utf-8") as f:
    f.write('''import streamlit as st
import zipfile
import xml.etree.ElementTree as ET
from pypdf import PdfReader
from PIL import Image
import pandas as pd
import io
from google import genai  # 구글 최신 라이브러리 (2026 표준)

st.set_page_config(page_title="타스 형님의 AI 만능 챗봇", layout="wide")
st.title("🤖 타스 형님의 Gemini 탑재 문서 요약 챗봇")
st.caption("단순 본문 읽기가 아닌, 진짜 AI(Gemini)가 문맥을 파싱하고 요약합니다.")
st.write("---")

# --- [어원 표시 코너] 인공지능 관련 핵심 단어 3개 ---
# 1. Intelligence (지능) : 라틴어 inter(~사이에) + legere(고르다, 이해하다)가 합쳐져 '사물 사이의 관계를 이해하고 분별하는 능력'을 뜻함.
# 2. Prompt (프롬프트/지시어) : 라틴어 promptus(준비된, 신속한)에서 유래, AI가 즉각 응답할 수 있도록 준비시키는 유도 문구를 의미.
# 3. Model (모델/모형) : 라틴어 modulus(작은 측정 단위, 기준)에서 유래, 현실의 복잡한 뇌 신경망을 본떠 만든 기준 체계를 의미.

# --- 사이드바: 보안을 위한 API 키 입력 창 ---
st.sidebar.header("🔑 API 설정")
api_key = st.sidebar.text_input("Gemini API Key를 입력하세요", type="password")

# --- [학습용 비교] 텍스트 파싱 함수들 ---
def parse_hwpx(file_bytes):
    """📂 HWPX 구조 분해 및 텍스트 추출"""
    text_content = []
    try:
        with zipfile.ZipFile(io.BytesIO(file_bytes)) as z:
            section_files = [f for f in z.namelist() if 'Contents/section' in f and f.endswith('.xml')]
            for sec_file in sorted(section_files):
                xml_data = z.read(sec_file)
                root = ET.fromstring(xml_data)
                for p in root.iter():
                    if p.tag.endswith('t') and p.text:
                        text_content.append(p.text)
        return "\\n".join(text_content)
    except Exception as e:
        return f"HWPX 파싱 실패: {str(e)}"

def parse_pdf(file_bytes):
    """📄 PDF 텍스트 추출"""
    try:
        reader = PdfReader(io.BytesIO(file_bytes))
        return "\\n".join([page.extract_text() for page in reader.pages if page.extract_text()])
    except Exception as e:
        return f"PDF 파싱 실패: {str(e)}"

# --- 메인 UI: 파일 업로드 창 ---
st.subheader("📥 문서 업로드")
uploaded_file = st.file_uploader(
    "요약할 문서를 올려주십시오, 타스 형님!", 
    type=["hwpx", "pdf"]
)

if uploaded_file is not None:
    if not api_key:
        st.warning("👈 왼쪽 사이드바에 Gemini API Key를 먼저 입력해 주셔야 AI 기능을 사용하실 수 있습니다!")
    else:
        file_bytes = uploaded_file.read()
        file_name = uploaded_file.name
        file_ext = file_name.split(".")[-1].lower()
        
        # 1. 문서 종류별 텍스트 변환 (Rule-based)
        with st.spinner("문서 보따리를 푸는 중..."):
            if file_ext == "hwpx":
                document_text = parse_hwpx(file_bytes)
            elif file_ext == "pdf":
                document_text = parse_pdf(file_bytes)
            else:
                document_text = ""

        if document_text.strip():
            st.success("🎯 문서 파싱 성공! 이제 Gemini가 학습 및 분석을 시작합니다.")
            
            # 2. Gemini AI에게 요약 지시 (LLM-based 인공지능 요약)
            with st.spinner("Gemini가 문맥을 맹렬히 분석 중입니다..."):
                try:
                    # 구글 최신 genai 클라이언트 가동
                    client = genai.Client(api_key=api_key)
                    
                    # AI에게 줄 프롬프트 설계
                    prompt = f"""
                    당신은 문서 분석 전문가입니다. 다음 제공된 문서의 내용을 기반으로 두 가지를 작성해 주세요.
                    
                    1. [한 줄 요약]: 전체 문서의 핵심을 관통하는 명확한 한 줄 요약
                    2. [핵심 요약 표]: 주요 항목과 내용을 기반으로 한 요약 데이터 (Markdown 표 형식으로 작성하되, 상하좌우 모든 칸의 테두리가 명확하게 보이도록 구분선을 완벽히 채워주세요.)
                    3. [주요 대목 발췌]: 문서에서 가장 중요한 문장이나 구절 3개 추출 및 이유 설명.
                    
                    [대상 문서 본문]:
                    {document_text}
                    """
                    
                    # Gemini 2.5 Flash 모델 호출 (빠르고 가성비 최고)
                    response = client.models.generate_content(
                        model='gemini-2.5-flash',
                        contents=prompt,
                    )
                    
                    # 3. AI의 응답 화면에 출력
                    st.write("---")
                    st.subheader("✨ Gemini AI 분석 보고서")
                    st.markdown(response.text)
                    
                except Exception as e:
                    st.error(f"❌ Gemini API 호출 중 오류 발생: {str(e)}")
                    
            with st.expander("👁️ 원본 본문 텍스트 보기"):
                st.text_area("Raw Text", document_text, height=200)
        else:
            st.error("⚠️ 문서에서 텍스트를 추출하지 못했습니다.")
''')

print("✅ Gemini 연동 버전 app.py 생성 완료!")
print("🚀 타스 형님, AI 대시보드 창을 띄웁니다...")
process = subprocess.Popen(["streamlit", "run", "app.py"])

try:
    while True:
        time.sleep(1)
except KeyboardInterrupt:
    print("\n🛑 서버를 종료합니다.")
    process.terminate()
