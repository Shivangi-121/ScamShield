import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, ShieldCheck, ShieldAlert, Search, Trash2 } from 'lucide-react';
import { analyzeText, SCAM_KEYWORDS } from '../../utils/scamDetector';
import './TextScamDetector.css';

const TextScamDetector = () => {
  const [inputText, setInputText] = useState('');
  const [results, setResults] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleAnalyze = async () => {
    if (!inputText.trim()) return;
    
    setIsAnalyzing(true);
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: inputText }),
      });

      if (!response.ok) {
        throw new Error('Analysis failed');
      }

      const data = await response.json();
      
      // Map backend response to frontend structure
      setResults({
        probability: Math.round(data.probability),
        label: data.label,
        riskyWords: data.riskyWords,
        insights: data.insights
      });
    } catch (error) {
      console.error('Error analyzing text:', error);
      // Fallback to local analysis if backend fails
      const analysis = analyzeText(inputText);
      setResults(analysis);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const reset = () => {
    setInputText('');
    setResults(null);
  };

  const handleFeedback = async (userLabel) => {
    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input_data: inputText,
          original_label: results.label,
          user_label: userLabel,
          type: 'text'
        }),
      });

      if (response.ok) {
        alert('Feedback received! Thank you for helping us improve.');
      }
    } catch (error) {
      console.error('Error sending feedback:', error);
    }
  };

  const highlightedText = useMemo(() => {
    if (!results || !inputText) return inputText;

    let segments = [inputText];
    
    // Simple word-by-word highlight for demonstration
    // In a production app, this would use a more robust regex-based splitting
    const words = inputText.split(/(\s+)/);
    
    return words.map((word, idx) => {
      const cleanWord = word.toLowerCase().trim().replace(/[.,!?;:]/g, '');
      const isRisky = SCAM_KEYWORDS.some(k => k.word === cleanWord);
      
      if (isRisky) {
        return (
          <motion.span 
            key={idx} 
            className="risky-word"
            initial={{ backgroundColor: "rgba(239, 68, 68, 0)" }}
            animate={{ backgroundColor: "rgba(239, 68, 68, 0.1)" }}
          >
            {word}
          </motion.span>
        );
      }
      return word;
    });
  }, [results, inputText]);

  return (
    <div className="detector-container">
      <div className="input-section glass-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <label>Message Content</label>
          {inputText && (
            <button onClick={reset} style={{ background: 'none', color: 'var(--text-secondary)' }}>
              <Trash2 size={18} />
            </button>
          )}
        </div>
        
        <div className="text-area-wrapper">
          <textarea
            className="scam-textarea"
            placeholder="Paste the SMS, email, or message here..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
          />
        </div>

        <button 
          className="analyze-btn"
          onClick={handleAnalyze}
          disabled={isAnalyzing || !inputText.trim()}
        >
          {isAnalyzing ? "Scanning System..." : "Analyze for Fraud"}
        </button>
      </div>

      <AnimatePresence>
        {results && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="results-section"
          >
            <div className="results-grid">
              <div className="result-card">
                <span className="result-label">Scam Probability</span>
                <span className="result-value" style={{ 
                  color: results.probability > 70 ? 'var(--status-danger)' : 
                         results.probability > 40 ? 'var(--status-warning)' : 
                         'var(--status-safe)' 
                }}>
                  {results.probability}%
                </span>
                <div className="progress-bar-bg" style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', marginTop: '10px' }}>
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${results.probability}%` }}
                    style={{ 
                      height: '100%', 
                      borderRadius: '4px',
                      background: results.probability > 70 ? 'var(--status-danger)' : 
                                  results.probability > 40 ? 'var(--status-warning)' : 
                                  'var(--status-safe)' 
                    }} 
                  />
                </div>
              </div>

              <div className="result-card">
                <span className="result-label">Security Label</span>
                <div style={{ marginTop: '0.5rem' }}>
                  {results.label === 'Scam' && <ShieldAlert size={48} color="var(--status-danger)" />}
                  {results.label === 'Suspicious' && <AlertTriangle size={48} color="var(--status-warning)" />}
                  {results.label === 'Safe' && <ShieldCheck size={48} color="var(--status-safe)" />}
                </div>
                <span className={`status-badge status-${results.label.toLowerCase()}`}>
                  {results.label}
                </span>
              </div>
            </div>

            {results.insights && results.insights.length > 0 && (
              <div className="glass-card" style={{ marginTop: '1.5rem' }}>
                <h3 style={{ marginBottom: '1rem', fontSize: '1rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Search size={18} />
                  Detection Insights
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {results.insights.map((insight, idx) => (
                    <motion.div 
                      key={idx}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      style={{ 
                        padding: '10px 15px', 
                        background: 'rgba(255,255,255,0.05)', 
                        borderRadius: '8px',
                        fontSize: '0.9rem',
                        borderLeft: `4px solid ${results.label === 'Scam' ? 'var(--status-danger)' : 'var(--status-warning)'}`,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px'
                      }}
                    >
                      <AlertTriangle size={14} color={results.label === 'Scam' ? 'var(--status-danger)' : 'var(--status-warning)'} />
                      {insight}
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            <div className="glass-card" style={{ marginTop: '1.5rem' }}>
              <h3 style={{ marginBottom: '1rem', fontSize: '1rem', color: 'var(--text-secondary)' }}>
                Highlighted Risky Elements
              </h3>
              <div className="highlighted-text">
                {highlightedText}
              </div>
            </div>

            {/* FEEDBACK LOOP */}
            <div className="glass-card" style={{ marginTop: '1.5rem', textAlign: 'center' }}>
              <h3 style={{ marginBottom: '1rem', fontSize: '1rem', color: 'var(--text-secondary)' }}>
                Was this analysis accurate?
              </h3>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', flexWrap: 'wrap' }}>
                <button 
                  onClick={() => handleFeedback(results.label)}
                  style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid var(--status-safe)', background: 'rgba(34, 197, 94, 0.1)', color: 'var(--status-safe)', cursor: 'pointer' }}
                >
                  ✅ Yes, Correct
                </button>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button 
                    onClick={() => handleFeedback('Safe')}
                    style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #666', background: 'none', color: '#ccc', fontSize: '0.8rem', cursor: 'pointer' }}
                  >
                    🚩 Mark Safe
                  </button>
                  <button 
                    onClick={() => handleFeedback('Suspicious')}
                    style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #666', background: 'none', color: '#ccc', fontSize: '0.8rem', cursor: 'pointer' }}
                  >
                    🚩 Mark Suspicious
                  </button>
                  <button 
                    onClick={() => handleFeedback('Scam')}
                    style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #666', background: 'none', color: '#ccc', fontSize: '0.8rem', cursor: 'pointer' }}
                  >
                    🚩 Mark Scam
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TextScamDetector;
