import requests
import os
from dotenv import load_dotenv

load_dotenv()

api_key = os.getenv('API_KEY')
api_url = os.getenv('API_URL')

models = [
    'google/gemini-2.0-flash-lite-preview-02-05:free',
    'meta-llama/llama-3.1-8b-instruct:free',
    'mistralai/mistral-7b-instruct:free',
    'openrouter/auto'
]

headers = {
    'Authorization': f'Bearer {api_key}',
    'Content-Type': 'application/json',
    'HTTP-Referer': 'http://localhost:5000',
    'X-Title': 'Verify with AI'
}

for model in models:
    print(f"\n--- Testing Model: {model} ---")
    payload = {
        'model': model,
        'messages': [{'role': 'user', 'content': 'Hi'}],
        'temperature': 0.1
    }
    try:
        response = requests.post(api_url, headers=headers, json=payload, timeout=10)
        print(f"Status Code: {response.status_code}")
        if response.status_code == 200:
            print("Success!")
            print(f"Response: {response.text[:200]}...")
        else:
            print(f"Error: {response.text}")
    except Exception as e:
        print(f"Exception: {e}")
