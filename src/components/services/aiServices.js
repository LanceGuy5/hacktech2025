export const generateAIResponse = async (prompt, options = {}) => {
  try {
    if (!prompt || prompt.trim() === '') {
      throw new Error('Prompt cannot be empty');
    }
    
    // Log request
    console.log('Sending AI request:', { promptLength: prompt.length, options });
    
    // For now, we're going to use the existing endpoint in the backend
    const formData = new FormData();
    formData.append('symptoms', prompt);
    
    // If we have conversation history, add it to the request
    // Note: The backend isn't set up to handle this yet, but it's ready for when it is
    if (options.conversationHistory && options.conversationHistory.length > 0) {
      formData.append('conversationHistory', JSON.stringify(options.conversationHistory));
    }
    
    const response = await fetch('/api/postSymptoms', {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    
    if (!response.ok) {
        const errorMessage = 'Failed to process symptoms';
        console.error('AI service error:', errorMessage);
        throw new Error(errorMessage);
    }
    
    // Parse the response from the backend
    console.log(response.body);
    const responseData = await response.json();
    console.log('Backend response:', responseData);
    console.log(responseData.result);

    
    // Since the actual OpenAI response isn't returned in the backend yet,
    // we need to provide a fallback while the backend is being developed
    // This will automatically switch to using the real response when the backend is updated
    if (responseData.openaiResponse) {
      // If backend returns OpenAI response, use it
      return {
        response: {
          analysis: responseData.openaiResponse,
          raw: responseData
        }
      };
    } else {
      // Use the demo functions until backend returns actual OpenAI responses
      const analysis = analyzeSymptomsWithContext(prompt, options.conversationHistory || []);
      return {
        response: {
          analysis: analysis,
          raw: responseData
        }
      };
    }
  } catch (error) {
    console.error('Error calling AI service:', error);
    throw error;
  }
};

// Helper function that takes into account conversation history
const analyzeSymptomsWithContext = (symptoms, history) => {
  // Convert symptom text to lowercase for easier matching
  const symptomText = symptoms.toLowerCase();
  console.log(symptomText);
  
  // Extract previous interactions to provide more context-aware responses
  const previousMessages = history.filter(msg => msg.role === 'user').map(msg => msg.content);
  const isFollowUpQuestion = previousMessages.length > 1;
  
  // If this is a follow-up question, we should respond more conversationally
  if (isFollowUpQuestion) {
    if (symptomText.includes('how long') || symptomText.includes('duration')) {
      return 'Symptoms typically resolve within 2-3 days with proper rest and treatment, but if they persist beyond a week, you should consult a healthcare professional.';
    } else if (symptomText.includes('worse') || symptomText.includes('serious')) {
      return 'Warning signs that would require immediate medical attention include high fever (above 103°F), difficulty breathing, severe pain, confusion, or loss of consciousness. If you experience any of these, please seek emergency care.';
    } else if (symptomText.includes('medicine') || symptomText.includes('treatment')) {
      return 'Over-the-counter medications can help manage symptoms, but the specific treatment depends on your condition. For personalized medical advice, please consult with a healthcare provider.';
    } else if (symptomText.includes('thank')) {
      return 'You\'re welcome! Is there anything else you\'d like to know about your symptoms or condition?';
    } else {
      // Generic follow-up response
      return 'I understand you need more information. To give you the most accurate advice, could you provide more details about your symptoms or ask a specific question about your condition?';
    }
  }
  
  // Initial symptom assessment responses
  if (symptomText.includes('headache')) {
    return 'You may be experiencing a tension headache or migraine. I recommend taking over-the-counter pain relievers like acetaminophen or ibuprofen and resting in a quiet, dark room. A cold compress may also help alleviate pain. Would you like to know more about potential triggers or when you should see a doctor?';
  } else if (symptomText.includes('fever') || symptomText.includes('temperature')) {
    return 'Your symptoms suggest a possible infection or inflammatory response. Monitor your temperature regularly, stay hydrated, and take fever reducers if needed. If your fever persists over 102°F or lasts more than 3 days, consult a healthcare provider. Would you like information about warning signs that would require immediate medical attention?';
  } else if (symptomText.includes('pain') && (symptomText.includes('chest') || symptomText.includes('heart'))) {
    return 'IMPORTANT: Chest pain could indicate a serious cardiovascular issue. Please seek immediate medical attention by calling emergency services or going to the nearest emergency room. Do not wait or try to treat this at home. Chest pain can be a sign of a heart attack or other serious conditions that require immediate medical care.';
  } else if (symptomText.includes('dizz') || symptomText.includes('faint')) {
    return 'Your dizziness could be caused by vertigo, low blood pressure, or dehydration. Try sitting or lying down immediately, stay hydrated with water or electrolyte solutions, and avoid sudden movements. If symptoms persist or worsen, consult a healthcare provider. Would you like to know about possible treatments or prevention strategies?';
  } else if (symptomText.includes('cough') || symptomText.includes('cold') || symptomText.includes('flu')) {
    return 'Your symptoms sound like an upper respiratory infection, which could be a common cold or flu. Rest, stay hydrated, and consider over-the-counter medications to manage symptoms. If you develop a high fever, difficulty breathing, or symptoms worsen after 7-10 days, please consult a healthcare provider. Would you like to know how to prevent spreading it to others?';
  } else if (symptomText.includes('rash') || symptomText.includes('skin')) {
    return 'Skin rashes can have many causes including allergic reactions, infections, or autoimmune conditions. Without seeing the rash, I can offer general advice: avoid scratching, use gentle cleansers, and try over-the-counter hydrocortisone cream for itching. If the rash is spreading rapidly, painful, or accompanied by fever, seek medical attention. Would you like more information about identifying common rash types?';
  } else if (symptomText.includes('stomach') || symptomText.includes('nausea') || symptomText.includes('vomit')) {
    return 'Your digestive symptoms could be caused by a virus, food poisoning, or digestive condition. Stay hydrated with small sips of clear fluids, avoid solid foods until nausea subsides, and gradually reintroduce bland foods like rice or toast. If you experience severe abdominal pain, bloody vomit, or symptoms last more than 48 hours, seek medical care. Would you like advice on preventing dehydration?';
  } else {
    return 'Based on your description, I recommend consulting with a healthcare professional for a proper diagnosis and treatment plan. In the meantime, rest, stay hydrated, and monitor your symptoms for any changes. Is there any specific aspect of your symptoms that concerns you most?';
  }
};

// Keep the original function for backward compatibility
const analyzeSymptomsForDemo = analyzeSymptomsWithContext;

// Helper function to suggest medical supplies for the demo
const suggestMedicalSuppliesForDemo = (symptoms) => {
  const symptomText = symptoms.toLowerCase();
  const supplies = ['First Aid Kit'];
  
  if (symptomText.includes('headache')) {
    supplies.push('Pain relievers (acetaminophen, ibuprofen)', 'Cold compress');
  }
  if (symptomText.includes('fever') || symptomText.includes('temperature')) {
    supplies.push('Thermometer', 'Fever reducer', 'Cooling patches');
  }
  if (symptomText.includes('cut') || symptomText.includes('bleed')) {
    supplies.push('Bandages', 'Antiseptic wipes', 'Gauze');
  }
  if (symptomText.includes('dizz') || symptomText.includes('faint')) {
    supplies.push('Electrolyte solution', 'Blood pressure monitor');
  }
  
  return supplies;
};
