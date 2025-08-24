import { GoogleGenAI, Type } from "@google/genai";
import { MaintenanceRecord, SensorDataPoint, TuningSuggestion, VoiceCommandIntent, DiagnosticAlert } from '../types';

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  // In a real app, you'd want to handle this more gracefully.
  // For this project, we assume the key is present in the environment.
  console.error("API_KEY environment variable not set.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY! });

const SYSTEM_INSTRUCTION = `You are an expert automotive mechanic and performance tuner named 'KC'. You are the AI assistant for the 'Karapiro Cartel Speed Shop' app. Your answers should be clear, concise, and helpful to both novice drivers and experienced technicians. When appropriate, provide step-by-step instructions or bullet points. Do not mention that you are an AI model. Format your responses using markdown for better readability.`;

export const getDiagnosticAnswer = async (query: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: query,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
      }
    });
    return response.text;
  } catch (error) {
    console.error("Error fetching diagnostic answer from Gemini:", error);
    return "I'm sorry, I'm having trouble connecting to my diagnostic systems right now. Please try again in a moment.";
  }
};

export const getPredictiveAnalysis = async (
  liveData: SensorDataPoint,
  maintenanceHistory: MaintenanceRecord[]
) => {
  const prompt = `
    Analyze the following vehicle data for potential issues.

    **Vehicle**: 2022 Subaru WRX (Simulated)
    **Mileage**: 45,000 miles
    
    **Live Data Snapshot**:
    - RPM: ${liveData.rpm.toFixed(0)}
    - Engine Load: ${liveData.engineLoad.toFixed(1)}%
    - Short Term Fuel Trim: ${liveData.shortTermFuelTrim.toFixed(1)}%
    - Long Term Fuel Trim: ${liveData.longTermFuelTrim.toFixed(1)}%
    - O2 Sensor Voltage: ${liveData.o2SensorVoltage.toFixed(2)}V
    - Engine Temp: ${liveData.engineTemp.toFixed(1)}°C

    **Maintenance History**: ${JSON.stringify(maintenanceHistory, null, 2)}

    **Your Task**:
    As the 'KC' AI mechanic, perform a deep analysis.
    1.  **Identify Anomalies**: Look for any unusual patterns or values in the live data, considering the vehicle's maintenance history.
    2.  **Root Cause Analysis**: If an anomaly is found, what are the 3 most likely root causes?
    3.  **Predictive Timeline**: Based on the data, what components are at immediate, near-term, or long-term risk of failure? Formulate a dynamic 'Risk Timeline'.
    4.  **Recommended Actions**: Provide a prioritized, step-by-step diagnostic and repair plan for the most urgent issue.
    5.  **Plain-English Summary**: Explain the core problem to the owner as if you were their trusted mechanic.
    6.  **Official Data**: Use your search tool to find any relevant Technical Service Bulletins (TSBs) or recalls for this issue on a 2022 Subaru WRX.
    7.  **JSON Output**: Structure your entire response as a single, valid JSON object following this format: 
        {
          "timelineEvents": [
            {
              "id": "event-1",
              "level": "Critical" | "Warning" | "Info",
              "title": "Component at Risk",
              "timeframe": "e.g., Immediate, Next 1000 miles",
              "details": {
                "component": "Component Name",
                "rootCause": "Detailed explanation of the likely root cause.",
                "recommendedActions": ["Action 1", "Action 2"],
                "plainEnglishSummary": "A simple explanation for the user.",
                "tsbs": ["TSB-123: Description", "Recall-456: Description"]
              }
            }
          ]
        }
        If no issues are found, return a JSON object with an empty "timelineEvents" array.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        tools: [{googleSearch: {}}],
        // responseMimeType is not allowed when using the googleSearch tool, this was an error.
        // It has been corrected by removing it.
      },
    });

    // The Gemini API can sometimes wrap the JSON in markdown backticks.
    const cleanedText = response.text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanedText);

  } catch (error) {
    console.error("Error fetching predictive analysis from Gemini:", error);
    // Return a structured error so the UI can handle it gracefully
    return { 
      error: "Failed to get predictive analysis.",
      details: error instanceof Error ? error.message : String(error)
    };
  }
};


const tuningSchema = {
  type: Type.OBJECT,
  properties: {
    suggestedParams: {
      type: Type.OBJECT,
      properties: {
        fuelMap: {
          type: Type.NUMBER,
          description: "Fuel Map Enrichment percentage change. Integer. Range: -10 to 10."
        },
        ignitionTiming: {
          type: Type.NUMBER,
          description: "Ignition Timing Advance in degrees. Integer. Range: -5 to 5."
        },
        boostPressure: {
          type: Type.NUMBER,
          description: "Boost Pressure increase in PSI. Float. Range: 0 to 8."
        },
      },
      required: ["fuelMap", "ignitionTiming", "boostPressure"],
    },
    analysis: {
      type: Type.OBJECT,
      properties: {
        predictedGains: {
          type: Type.STRING,
          description: "A summary of the expected performance improvements."
        },
        potentialRisks: {
          type: Type.STRING,
          description: "A summary of potential risks, trade-offs, or requirements for this tune."
        }
      },
      required: ["predictedGains", "potentialRisks"],
    }
  },
  required: ["suggestedParams", "analysis"],
};


export const getTuningSuggestion = async (
  liveData: SensorDataPoint,
  drivingStyle: string,
  conditions: string
): Promise<TuningSuggestion> => {

  const prompt = `
    You are 'KC', an expert automotive performance tuner for the 'Karapiro Cartel Speed Shop'. Your task is to provide a personalized engine tune recommendation.

    **Vehicle**: 2022 Subaru WRX (Simulated)
    **Mileage**: 45,000 miles

    **User's Goal**:
    - Driving Style: ${drivingStyle}
    - Environmental Conditions: ${conditions}

    **Live Data Snapshot**:
    - RPM: ${liveData.rpm.toFixed(0)}
    - Engine Load: ${liveData.engineLoad.toFixed(1)}%
    - Inlet Air Temp: ${liveData.inletAirTemp.toFixed(1)}°C
    - Turbo Boost: ${liveData.turboBoost.toFixed(1)} BAR

    **Your Task**:
    Based on the user's goal and the live data, provide a safe but effective engine tune.
    1.  **Suggest Parameters**: Recommend specific adjustments for the following parameters. The values should be relative changes from the baseline (0).
        - \`fuelMap\`: Fuel Map Enrichment (%). A value between -10 and 10.
        - \`ignitionTiming\`: Ignition Timing Advance (°). A value between -5 and 5.
        - \`boostPressure\`: Boost Pressure increase (PSI). A value between 0 and 8.
    2.  **Analyze the Tune**: Briefly explain the performance gains and any potential risks or trade-offs associated with your recommendation. Keep it concise and clear for the user.

    **JSON Output**:
    Structure your entire response as a single, valid JSON object following the provided schema. Do not add any extra text or markdown formatting.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: tuningSchema,
      },
    });

    const cleanedText = response.text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanedText) as TuningSuggestion;
  } catch (error) {
    console.error("Error fetching tuning suggestion from Gemini:", error);
    throw new Error("Failed to get tuning suggestion.");
  }
};

const voiceCommandSchema = {
  type: Type.OBJECT,
  properties: {
    intent: {
      type: Type.STRING,
      description: "The user's primary goal. Must be one of: 'SHOW_COMPONENT', 'QUERY_SERVICE', 'HIDE_COMPONENT', 'UNKNOWN'.",
    },
    component: {
      type: Type.STRING,
      description: "If intent is 'SHOW_COMPONENT', the normalized component ID. Must be one of: 'o2-sensor', 'map-sensor', 'alternator', 'turbo', 'intake', 'coolant', 'oil-filter'. Otherwise, null.",
    },
    confidence: {
      type: Type.NUMBER,
      description: "A score from 0.0 to 1.0 indicating how confident you are in this interpretation."
    }
  },
  required: ["intent", "confidence"],
};

export const getVoiceCommandIntent = async (command: string): Promise<VoiceCommandIntent> => {
  const prompt = `
    You are the Natural Language Understanding (NLU) engine for 'KC', an AR automotive assistant. Your task is to interpret the user's voice command and translate it into a structured JSON format.

    **User Command**: "${command}"

    **Available Component IDs**: 'o2-sensor', 'map-sensor', 'alternator', 'turbo', 'intake', 'coolant', 'oil-filter'.
    
    **Available Intents**:
    - \`SHOW_COMPONENT\`: User wants to visually identify or get information about a specific part.
    - \`QUERY_SERVICE\`: User is asking about maintenance, service history, or when the next service is due.
    - \`HIDE_COMPONENT\`: User wants to clear or hide the visual highlights.
    - \`UNKNOWN\`: The command is unclear or unrelated to the available actions.

    **Your Task**:
    1. Determine the user's \`intent\`.
    2. If the intent is \`SHOW_COMPONENT\`, identify the requested \`component\` and map it to one of the available component IDs. The component should be null for other intents.
    3. Provide a \`confidence\` score for your interpretation.

    **Examples**:
    - "Show me the oxygen sensor" -> { "intent": "SHOW_COMPONENT", "component": "o2-sensor", "confidence": 0.95 }
    - "What is my next required service?" -> { "intent": "QUERY_SERVICE", "confidence": 0.98 }
    - "Highlight the turbo" -> { "intent": "SHOW_COMPONENT", "component": "turbo", "confidence": 0.9 }
    - "Clear the screen" -> { "intent": "HIDE_COMPONENT", "confidence": 0.92 }
    - "What's the weather like?" -> { "intent": "UNKNOWN", "confidence": 1.0 }

    Output your response as a single, valid JSON object following the provided schema.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: voiceCommandSchema,
      },
    });

    const cleanedText = response.text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanedText) as VoiceCommandIntent;
  } catch (error) {
    console.error("Error fetching voice command intent from Gemini:", error);
    return {
      intent: 'UNKNOWN',
      confidence: 1.0,
      error: 'Failed to process command.',
    } as any;
  }
};

export const generateComponentImage = async (componentName: string): Promise<string> => {
  try {
    const prompt = `A high-resolution, photorealistic image of a single automotive '${componentName}' for a 2022 Subaru WRX, isolated on a clean white background. Studio lighting.`;

    const response = await ai.models.generateImages({
        model: 'imagen-3.0-generate-002',
        prompt: prompt,
        config: {
          numberOfImages: 1,
          outputMimeType: 'image/jpeg',
          aspectRatio: '1:1',
        },
    });

    if (response.generatedImages && response.generatedImages.length > 0) {
        const base64ImageBytes: string = response.generatedImages[0].image.imageBytes;
        return `data:image/jpeg;base64,${base64ImageBytes}`;
    } else {
        throw new Error("No image was generated.");
    }
  } catch (error) {
    console.error(`Error generating component image for ${componentName}:`, error);
    throw new Error("Failed to generate component diagram.");
  }
};

const COPILOT_INSTRUCTION = `You are 'KC', a hands-free, voice-activated AI Co-Pilot for a high-performance vehicle. Your purpose is to assist the driver with real-time information and diagnostics. Be conversational, concise, and direct. Your responses will be read aloud, so avoid long paragraphs, complex markdown, or lists. Focus on providing immediate, actionable information. The user is likely driving.`;

export const getCoPilotResponse = async (
  command: string,
  vehicleData: SensorDataPoint,
  activeAlerts: DiagnosticAlert[]
): Promise<string> => {
  const prompt = `
    The driver just gave you a voice command. Use the provided real-time context to give the best possible response.

    **Driver's Command**: "${command}"

    **Real-Time Vehicle Data**:
    - RPM: ${vehicleData.rpm.toFixed(0)}
    - Speed: ${vehicleData.speed.toFixed(0)} km/h
    - Gear: ${vehicleData.gear}
    - Engine Temp: ${vehicleData.engineTemp.toFixed(1)}°C
    - Turbo Boost: ${vehicleData.turboBoost.toFixed(2)} bar
    - Oil Pressure: ${vehicleData.oilPressure.toFixed(1)} bar

    **Active Diagnostic Alerts**:
    ${activeAlerts.length > 0 ? JSON.stringify(activeAlerts, null, 2) : "None. All systems are normal."}

    **Your Task**:
    1.  **Acknowledge Alerts**: If the command is general (e.g., "What's my status?", "Is everything okay?") and there are active alerts, prioritize explaining the most critical alert in simple terms.
    2.  **Answer Directly**: If the command is a specific question (e.g., "What's my oil pressure?"), answer it using the real-time data.
    3.  **Be Proactive**: If you notice something in the data that's relevant to the command, mention it. For example, if asked for engine temp and it's high, say so.
    4.  **Keep it Brief**: Remember, your response will be spoken aloud. Aim for one or two short sentences.

    **Example Responses**:
    - *User Command: "Hey KC, what's going on?" with a MAP sensor alert active.* -> "I've detected a critical fault with the MAP sensor. Readings are erratic, which could cause a stall. I recommend pulling over to inspect it."
    - *User Command: "What's my current boost?"* -> "You're currently at ${vehicleData.turboBoost.toFixed(2)} bar of boost."
    - *User Command: "Is everything okay?" with no alerts.* -> "Yes, all systems are nominal. Everything looks good."
    - *User Command: "Tell me about my engine."* -> "Your engine is running at ${vehicleData.rpm.toFixed(0)} RPM, with a coolant temperature of ${vehicleData.engineTemp.toFixed(1)} degrees Celsius. Oil pressure is stable."
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        systemInstruction: COPILOT_INSTRUCTION,
      }
    });
    return response.text;
  } catch (error) {
    console.error("Error fetching Co-Pilot response from Gemini:", error);
    return "I'm sorry, I'm having trouble communicating right now. Please try again in a moment.";
  }
};