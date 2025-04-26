import React, { useState, useRef, useEffect } from 'react'
import './TextSelection.css'
import { generateAIResponse } from './services/aiServices'

function TextSelection({ onBack, onNavigateToMap }) {
  const [showTextBox, setShowTextBox] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [apiResponse, setApiResponse] = useState(null)
  // Store conversation history for context
  const [conversationHistory, setConversationHistory] = useState([])
  const [messages, setMessages] = useState([
    { 
      sender: 'ai',
      text: "Hello, I'm your medical assistant. Please describe your symptoms in detail, and I'll provide an analysis.",
      timestamp: new Date()
    }
  ])
  const symptomTextRef = useRef(null)
  const chatContainerRef = useRef(null)
  
  // Scroll to bottom of chat when messages change
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
    }
  }, [messages])
  
  const handleDescribeClick = () => {
    setShowTextBox(true)
    setApiResponse(null)
    setConversationHistory([])
    // Reset messages when returning to this screen
    setMessages([
      { 
        sender: 'ai',
        text: "Hello, I'm your medical assistant. Please describe your symptoms in detail, and I'll provide an analysis.",
        timestamp: new Date()
      }
    ])
  }
  
  const handleBackToOptions = () => {
    setShowTextBox(false)
    setApiResponse(null)
    setConversationHistory([])
  }
  
  const handleSubmit = async () => {
    const symptomText = symptomTextRef.current.value.trim()
    
    if (!symptomText) {
      alert('Please describe your symptoms')
      return
    }
    
    // Add user message to chat
    const newUserMessage = {
      sender: 'user',
      text: symptomText,
      timestamp: new Date()
    }
    setMessages([...messages, newUserMessage])
    
    // Add to conversation history to provide context for the AI
    const updatedHistory = [...conversationHistory, { role: 'user', content: symptomText }]
    setConversationHistory(updatedHistory)
    
    // Clear input field
    symptomTextRef.current.value = ''
    
    setIsLoading(true)
    
    try {
      // Call the AI service with the updated conversation history for context
      const data = await generateAIResponse(symptomText, { conversationHistory: updatedHistory })
      
      // Add AI message to chat
      const newAiMessage = {
        sender: 'ai',
        text: data.response.analysis,
        timestamp: new Date()
      }
      setMessages(prevMessages => [...prevMessages, newAiMessage])
      
      // Update conversation history with the AI's response
      setConversationHistory([...updatedHistory, { role: 'assistant', content: data.response.analysis }])
      
      // Save response data for reference
      setApiResponse(data.response)
      
      setIsLoading(false)
      
    } catch (error) {
      console.error('Error submitting symptoms:', error)
      setIsLoading(false)
      
      // Add error message to chat
      const errorMessage = {
        sender: 'ai',
        text: "I'm sorry, there was an error processing your symptoms. Please try again.",
        timestamp: new Date(),
        isError: true
      }
      setMessages(prevMessages => [...prevMessages, errorMessage])
    }
  }
  
  // Format chat message with line breaks
  const formatMessageText = (text) => {
    return text.split('\\n').map((line, i) => (
      <React.Fragment key={i}>
        {line}
        <br />
      </React.Fragment>
    ))
  }
  
  return (
    <div className="text-selection">
      <h1 className='text-selection-title'>Text Selection</h1>
      
      {!showTextBox ? (
        // Show symptom options
        <div className="content">
          <p className='text-selection-description'>Select your medical issue:</p>
          <div className="symptom-options">
            <div className="symptom-option" onClick={onNavigateToMap}>Chest Pain</div>
            <div className="symptom-option">Seizure</div>
            <div className="symptom-option">Headache</div>
            <div className="symptom-option" onClick={handleDescribeClick}>Describe Symptom</div>
          </div>
        </div>
      ) : (
        // Show chat interface for describing symptoms
        <div className="content chat-content">
          <div className="chat-header">
            <button className="back-option-button" onClick={handleBackToOptions}>
              Back to Options
            </button>
          </div>
          
          <div className="chat-container" ref={chatContainerRef}>
            {/* All Messages in sequence */}
            {messages.map((message, index) => (
              <div 
                key={`message-${index}`} 
                className={`chat-message ${message.sender === 'ai' ? 'ai-message' : 'user-message'} ${message.isError ? 'error-message' : ''}`}
              >
                <div className="message-bubble">
                  {formatMessageText(message.text)}
                </div>
                <div className="message-info">
                  <span className="message-sender">{message.sender === 'ai' ? 'Medical Assistant' : 'You'}</span>
                  <span className="message-time">
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            ))}
            
            {/* Loading indicator */}
            {isLoading && (
              <div className="chat-message ai-message loading-message">
                <div className="message-bubble">
                  <div className="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <div className="chat-input-container">
            <textarea 
              ref={symptomTextRef}
              className="chat-input" 
              placeholder="Describe your symptoms..."
              rows="2"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  if (!isLoading) handleSubmit()
                }
              }}
            ></textarea>
            <button 
              className={`chat-send-button ${isLoading ? 'loading' : ''}`} 
              onClick={handleSubmit}
              disabled={isLoading}
            >
              {isLoading ? 'Processing...' : 'Send'}
            </button>
          </div>
        </div>
      )}
      
      {!showTextBox && (
        <button className="back-button" onClick={onBack}>
          Back to Options
        </button>
      )}
    </div>
  )
}

export default TextSelection
