import os
from google import genai

API_KEY = "AIzaSyAq_2U6ADZSjotwfvzD-8DFJ34B0ns-I8c"

try:
    client = genai.Client(api_key=API_KEY)
    models = client.models.list_models()
    for m in models:
        print(m.name)
except Exception as e:
    print("FAILED")
    print(str(e))
