import os
from google import genai

API_KEY = "AIzaSyAq_2U6ADZSjotwfvzD-8DFJ34B0ns-I8c"

models_to_test = [
    "gemini-1.5-flash-8b",
    "gemini-1.5-flash-latest",
    "gemini-1.5-pro",
    "gemini-1.5-pro-latest"
]

client = genai.Client(api_key=API_KEY)
for m in models_to_test:
    try:
        response = client.models.generate_content(model=m, contents="hi")
        print(f"SUCCESS: {m}")
        break
    except Exception as e:
        print(f"FAILED: {m} -> {e}")
