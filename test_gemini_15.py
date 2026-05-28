import os
from google import genai

API_KEY = "AIzaSyB1XGH_7AYpiuL65ARnip0VdXnS_PgovEY"

try:
    client = genai.Client(api_key=API_KEY)
    response = client.models.generate_content(model="gemini-1.5-flash", contents="Hello!")
    print("SUCCESS")
    print(response.text)
except Exception as e:
    print("FAILED")
    print(str(e))
