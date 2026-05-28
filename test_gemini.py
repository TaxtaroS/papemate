import os
from google import genai

API_KEY = "AIzaSyAq_2U6ADZSjotwfvzD-8DFJ34B0ns-I8c"

try:
    client = genai.Client(api_key=API_KEY)
    response = client.models.generate_content(model="gemini-2.0-flash", contents="Hello, are you there?")
    print("SUCCESS")
    print(response.text)
except Exception as e:
    print("FAILED")
    print(str(e))
