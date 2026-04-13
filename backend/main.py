from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pickle
import os
import numpy as np

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify the frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load model and vectorizer
MODELS_DIR = os.path.join(os.path.dirname(__file__), 'models')
MODEL_PATH = os.path.join(MODELS_DIR, 'spam_model.pkl')
VECTORIZER_PATH = os.path.join(MODELS_DIR, 'vectorizer.pkl')

if not os.path.exists(MODEL_PATH) or not os.path.exists(VECTORIZER_PATH):
    raise RuntimeError("Model files not found. Run train_model.py first.")

with open(MODEL_PATH, 'rb') as f:
    model = pickle.load(f)

with open(VECTORIZER_PATH, 'rb') as f:
    cv = pickle.load(f)

class TextData(BaseModel):
    text: str

@app.get("/")
def read_root():
    return {"message": "ScamShield API is running"}

def normalize_text(text: str) -> str:
    """Removes common scammer obfuscation (e.g., f.r.e.e, pr1ze)."""
    normalized = text.lower()
    # Remove common separators used to bypass filters
    for char in ['.', '-', '_', '*', ' ']:
        normalized = normalized.replace(char, '')
    # Basic leet-speak conversion
    leets = {'1': 'i', '0': 'o', '3': 'e', '4': 'a', '5': 's', '7': 't'}
    for k, v in leets.items():
        normalized = normalized.replace(k, v)
    return normalized

@app.post("/api/analyze")
def analyze_text(data: TextData):
    if not data.text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty")
    
    original_text = data.text
    clean_text = original_text.lower()
    normalized = normalize_text(original_text)
    
    # 1. ML Prediction
    vect_text = cv.transform([original_text])
    probabilities = model.predict_proba(vect_text)[0]
    spam_prob = probabilities[1] * 100
    
    # 2. Heuristic Analysis & Insights
    insights = []
    heuristic_score = 0
    
    # Check for Urgency
    urgency_words = ["urgent", "immediate", "action required", "expiring", "last chance", "limited time"]
    if any(word in clean_text for word in urgency_words):
        insights.append("High-pressure urgency tactics detected")
        heuristic_score += 20
        
    # Check for Authority Impersonation
    authorities = ["bank", "irs", "hmrc", "police", "amazon", "netflix", "fedex", "ups", "dhl", "microsoft", "apple"]
    if any(auth in clean_text for auth in authorities):
        insights.append("Potential impersonation of a trusted authority")
        heuristic_score += 15
        
    # Check for Obfuscation
    if normalized != clean_text.replace(' ', ''):
        # Only flag if there's a significant difference that looks like obfuscation
        insights.append("Character obfuscation detected (bypassing filters)")
        heuristic_score += 25

    # Check for Financial Bait
    financial_bait = ["cash", "prize", "reward", "win", "dollars", "pounds", "unclaimed", "refund", "tax"]
    if any(word in clean_text for word in financial_bait):
        insights.append("Financial bait/incentive detected")
        heuristic_score += 20

    # 3. Combine Scores (Weighted average of ML and Heuristics)
    final_prob = (spam_prob * 0.7) + (min(heuristic_score, 100) * 0.3)
    final_prob = min(max(final_prob, 0), 100)
    
    # Determine risk level
    risk_level = "Safe"
    if final_prob > 35:
        risk_level = "Suspicious"
    if final_prob > 70:
        risk_level = "Scam"
        
    # Risky keywords for highlighting
    risky_keywords = ["win", "prize", "claim", "urgent", "call", "text", "free", "reward", "txt", "mobile", "stop", "cash", "now", "reply", "bank", "account", "verify", "link"]
    found_keywords = [word for word in risky_keywords if word in original_text.lower()]
    
    return {
        "text": original_text,
        "probability": round(final_prob, 2),
        "label": risk_level,
        "riskyWords": found_keywords,
        "insights": insights if insights else ["No significant threats patterns detected"]
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
