
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { MaintenanceRecord, SensorDataPoint, TuningSuggestion, VoiceCommandIntent, DiagnosticAlert, CoPilotAction } from '../types';

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
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
      },
    });

    const cleanedText = response.text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanedText);

  } catch (error) {
    console.error("Error fetching predictive analysis from Gemini:", error);
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
        model: 'imagen-4.0-generate-001',
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

const copilotSchema = {
    type: Type.OBJECT,
    properties: {
        action: {
            type: Type.STRING,
            description: "The action to perform. 'NAVIGATE' to change screens, 'SPEAK' to answer questions without navigation, 'ANALYZE' to trigger deep diagnostics.",
        },
        payload: {
            type: Type.STRING,
            description: "If action is NAVIGATE, the route path (e.g. '/tuning'). If no specific route, or for other actions, null or empty string.",
        },
        textToSpeak: {
            type: Type.STRING,
            description: "The spoken response to the user. Keep it brief and conversational.",
        },
    },
    required: ["action", "textToSpeak"],
};

export const interpretHandsFreeCommand = async (
    command: string,
    currentRoute: string,
    vehicleData: SensorDataPoint,
    alerts: DiagnosticAlert[]
): Promise<CoPilotAction> => {
    
    const prompt = `
        You are KC, the advanced AI Co-Pilot for the Genesis Telemetry System. Your user is driving or tuning a high-performance car and giving you voice commands. You must interpret their intent and control the app interface or provide information.

        **Current Context**:
        - Screen: ${currentRoute}
        - Vehicle Stats: RPM ${vehicleData.rpm.toFixed(0)}, Boost ${vehicleData.turboBoost.toFixed(1)}bar, Temp ${vehicleData.engineTemp.toFixed(0)}°C.
        - Active Alerts: ${alerts.length > 0 ? alerts.map(a => a.message).join(', ') : 'None'}.

        **User Command**: "${command}"

        **Available Routes**:
        - Dashboard: '/'
        - Diagnostics: '/diagnostics'
        - Tuning/Dyno: '/tuning'
        - AI Engine/Predictive: '/ai-engine'
        - AR Assistant: '/ar-assistant'
        - Race Pack/Timing: '/race-pack'
        - Logbook: '/logbook'
        - Settings: '/appearance'

        **Reasoning**:
        Use your advanced reasoning capabilities to determine the best course of action.
        - If the user wants to see a specific screen (e.g., "Show me the dyno", "Go to settings"), set action to 'NAVIGATE' and payload to the route.
        - If the user asks a question about the current data (e.g., "How's my oil pressure?", "Is the engine hot?"), set action to 'SPEAK' and provide the answer based on the context.
        - If the user mentions a problem or asks to check for issues, set action to 'NAVIGATE' to '/ai-engine' or 'SPEAK' about the alerts.
        
        **Thinking Process**:
        1. Analyze the user's intent. Is it navigational or informational?
        2. Check if the command requires switching screens.
        3. Formulate a concise, helpful spoken response.

        **Output**:
        Return a single JSON object.
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-pro-preview",
            contents: prompt,
            config: {
                thinkingConfig: { thinkingBudget: 1024 }, // Thinking budget for reasoning
                responseMimeType: "application/json",
                responseSchema: copilotSchema
            }
        });

        const cleanedText = response.text.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(cleanedText) as CoPilotAction;
    } catch (error) {
        console.error("Error interpreting hands-free command:", error);
        return {
            action: 'SPEAK',
            textToSpeak: "I'm having trouble processing that command. Please try again."
        };
    }
};

export const generateGeminiSpeech = async (text: string): Promise<ArrayBuffer | null> => {
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text: text }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: 'Kore' },
                    },
                },
            },
        });

        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (!base64Audio) return null;

        // Decode base64 to ArrayBuffer
        const binaryString = atob(base64Audio);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes.buffer;
    } catch (error) {
        console.error("Error generating speech:", error);
        return null;
    }
};
