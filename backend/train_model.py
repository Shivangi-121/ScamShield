import pandas as pd
import numpy as np
from sklearn.feature_extraction.text import CountVectorizer
from sklearn.naive_bayes import MultinomialNB
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score
import pickle
import os

def train():
    # Load dataset
    # The file is in the parent directory of backend
    csv_path = os.path.join('..', 'spam.csv')
    df = pd.read_csv(csv_path, encoding='latin-1')
    
    # Drop unnecessary columns
    df = df.drop(['Unnamed: 2', 'Unnamed: 3', 'Unnamed: 4'], axis=1)
    
    # Rename columns
    df = df.rename(columns={'v1': 'label', 'v2': 'message'})
    
    # Encode labels: ham -> 0, spam -> 1
    df['label_num'] = df['label'].map({'ham': 0, 'spam': 1})
    
    X = df['message']
    y = df['label_num']
    
    # Vectorize text
    cv = CountVectorizer()
    X = cv.fit_transform(X)
    
    # Split data
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.33, random_state=42)
    
    # Train model
    clf = MultinomialNB()
    clf.fit(X_train, y_train)
    
    # Evaluate
    y_pred = clf.predict(X_test)
    print(f"Model Accuracy: {accuracy_score(y_test, y_pred) * 100:.2f}%")
    
    # Save model and vectorizer
    models_dir = 'models'
    if not os.path.exists(models_dir):
        os.makedirs(models_dir)
        
    with open(os.path.join(models_dir, 'spam_model.pkl'), 'wb') as f:
        pickle.dump(clf, f)
        
    with open(os.path.join(models_dir, 'vectorizer.pkl'), 'wb') as f:
        pickle.dump(cv, f)
        
    print("Model and vectorizer saved successfully in 'backend/models/'")

if __name__ == "__main__":
    train()
