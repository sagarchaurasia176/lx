// XR Learning ChatBot controller with hierarchical options
import { Request, Response } from "express";
import axios from "axios";

// Define types for better type safety
interface Option {
  id: string;
  text: string;
  hasSubOptions?: boolean;
}

interface ChatSession {
  sessionId: string;
  userId?: string; // Add userId to session
  currentLevel: number;
  selectedPath: string[];
  lastActivity: Date;
}

// Request body interface
interface ChatRequest {
  userQuery?: string | null;
  optionId?: string | null;
  sessionId: string;
  userId?: string | null;
}

// Store active sessions (in production, use Redis or database)
const activeSessions = new Map<string, ChatSession>();

// Define hierarchical option tree structure
const optionTree: Record<string, Option[]> = {
  initial: [
    { id: 'xr-learning', text: '🥽 XR Learning Experiences', hasSubOptions: true },
    { id: 'tech-courses', text: '💻 Technology Courses', hasSubOptions: true },
    { id: 'career-dev', text: '🚀 Career Development', hasSubOptions: true },
    { id: 'creative-arts', text: '🎨 Creative Arts & Design', hasSubOptions: true }
  ],
  
  'xr-learning': [
    { id: 'students', text: 'XR Learning for Students' },
    { id: 'professionals', text: 'Professional XR Training' },
    { id: 'lifelong-learners', text: 'Lifelong XR Learning' },
    { id: 'immersive-modules', text: 'Interactive 3D Modules' }
  ],
  
  'tech-courses': [
    { id: 'web-development', text: 'Web Development' },
    { id: 'mobile-apps', text: 'Mobile App Development' },
    { id: 'data-science', text: 'Data Science & Analytics' },
    { id: 'cybersecurity', text: 'Cybersecurity Training' }
  ],
  
  'career-dev': [
    { id: 'interview-prep', text: 'Interview Preparation' },
    { id: 'leadership', text: 'Leadership Skills' },
    { id: 'project-management', text: 'Project Management' },
    { id: 'communication', text: 'Communication Skills' }
  ],
  
  'creative-arts': [
    { id: 'digital-art', text: 'Digital Art & Illustration' },
    { id: 'video-editing', text: 'Video Editing & Production' },
    { id: 'graphic-design', text: 'Graphic Design' },
    { id: 'music-production', text: 'Music Production' }
  ]
};

// Define prompts for each final option
const prompts: Record<string, string> = {
  // XR Learning prompts
  'students': "Explain how XR (Extended Reality) learning transforms education for students by creating immersive 3D environments that make complex subjects like science, history, and engineering more engaging and memorable. Describe specific benefits and examples.",
  
  'professionals': "Describe how XR technology provides professional training solutions through realistic simulations and hands-on practice environments. Explain benefits for healthcare, engineering, manufacturing, and other fields.",
  
  'lifelong-learners': "Share how XR platforms support continuous learning for adults by offering flexible, engaging educational experiences that fit busy schedules. Explain how immersive environments make learning more enjoyable.",
  
  'immersive-modules': "Describe the interactive 3D learning modules available in XR environments, including virtual laboratories, historical recreations, architectural walkthroughs, and complex concept visualizations.",
  
  // Tech Courses prompts
  'web-development': "Explain modern web development learning paths, including frontend frameworks like React, backend technologies, and full-stack development. Cover essential skills and project-based learning approaches.",
  
  'mobile-apps': "Describe mobile app development learning, covering both iOS and Android platforms, cross-platform solutions like React Native, UI/UX design principles, and app store deployment.",
  
  'data-science': "Explain data science learning journey, including Python/R programming, machine learning algorithms, data visualization, statistics, and real-world project applications.",
  
  'cybersecurity': "Describe cybersecurity training programs, covering ethical hacking, network security, incident response, compliance frameworks, and hands-on lab exercises.",
  
  // Career Development prompts
  'interview-prep': "Provide comprehensive interview preparation guidance, including technical interview strategies, behavioral questions, salary negotiation, and industry-specific interview formats.",
  
  'leadership': "Explain leadership development programs, covering management styles, team building, conflict resolution, strategic thinking, and emotional intelligence skills.",
  
  'project-management': "Describe project management training, including methodologies like Agile/Scrum, tools like Jira/Trello, risk management, and certification paths like PMP.",
  
  'communication': "Cover communication skills development, including public speaking, presentation skills, written communication, cross-cultural communication, and remote work collaboration.",
  
  // Creative Arts prompts
  'digital-art': "Explain digital art learning, covering software like Photoshop/Procreate, drawing fundamentals, color theory, composition, and building a professional portfolio.",
  
  'video-editing': "Describe video editing and production training, including software like Adobe Premiere/Final Cut Pro, storytelling techniques, color grading, and content creation strategies.",
  
  'graphic-design': "Cover graphic design fundamentals, including design principles, typography, branding, logo design, and working with clients in the design industry.",
  
  'music-production': "Explain music production learning, covering DAW software, mixing and mastering, sound design, music theory, and building a home studio setup."
};

// Helper function to check if a key exists in prompts
function isPromptKey(key: string): key is keyof typeof prompts {
  return key in prompts;
}

// Session management functions
function getSession(sessionId: string): ChatSession | null {
  return activeSessions.get(sessionId) || null;
}

function createSession(sessionId: string, userId?: string): ChatSession {
  const session: ChatSession = {
    sessionId,
    userId,
    currentLevel: 0,
    selectedPath: [],
    lastActivity: new Date()
  };
  activeSessions.set(sessionId, session);
  return session;
}

function updateSession(sessionId: string, updates: Partial<ChatSession>): void {
  const session = activeSessions.get(sessionId);
  if (session) {
    Object.assign(session, updates, { lastActivity: new Date() });
  }
}

export const StudentQueryResolver = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // Extract and validate request data
    const { userQuery, optionId, sessionId, userId }: ChatRequest = req.body;
  
    // Validate required fields
    if (!sessionId) {
      res.status(400).json({ 
        success: false, 
        error: "Session ID is required" 
      });
      return;
    }
  
    // Initialize or get session
    let session = getSession(sessionId);
    if (!session) {
      session = createSession(sessionId, userId || undefined);
    }
    
    // Handle option selection
    if (optionId) {
      
      if (optionId === 'initial' || optionId === 'restart') {
        // Reset session and show initial options
        updateSession(sessionId, {
          currentLevel: 0,
          selectedPath: []
        });
        
        const response = {
          success: true,
          type: 'options',
          options: optionTree.initial,
          message: "🚀 Welcome to LearnInXR! Choose your learning path:",
          showBackButton: false
        };
        
        res.status(200).json(response);
        return;
      }
      
      // Handle back navigation
      if (optionId === 'back') {
        if (session.selectedPath.length > 0) {
          const newPath = session.selectedPath.slice(0, -1);
          const parentOption = newPath.length > 0 ? newPath[newPath.length - 1] : 'initial';
          
          updateSession(sessionId, {
            currentLevel: Math.max(0, session.currentLevel - 1),
            selectedPath: newPath
          });
          
          const options = parentOption === 'initial' ? optionTree.initial : optionTree[parentOption];
          const message = parentOption === 'initial' 
            ? "🚀 Welcome back! Choose your learning path:"
            : "Choose a specific area:";
          
          const response = {
            success: true,
            type: 'options',
            options: options,
            message: message,
            showBackButton: parentOption !== 'initial',
            currentPath: newPath
          };
          
          res.status(200).json(response);
          return;
        } else {
          // Already at root, show initial options
          const response = {
            success: true,
            type: 'options',
            options: optionTree.initial,
            message: "🚀 Welcome to LearnInXR! Choose your learning path:",
            showBackButton: false
          };
          res.status(200).json(response);
          return;
        }
      }
      
      // Check if option has sub-options
      if (optionTree[optionId]) {
        // Update session with selected path
        const newPath = [...session.selectedPath, optionId];
        updateSession(sessionId, {
          currentLevel: session.currentLevel + 1,
          selectedPath: newPath
        });
        
        const response = {
          success: true,
          type: 'options',
          options: optionTree[optionId],
          message: `Great choice! Now select a specific area:`,
          showBackButton: true,
          currentPath: newPath
        };
        
        res.status(200).json(response);
        return;
      }
      
      // Final option selected - generate AI response
      if (isPromptKey(optionId)) {
        
        const enhancedQuery = `
          You're an expert learning consultant helping people understand modern education and training.
          Focus on practical, engaging learning experiences and real-world applications.
          Give a comprehensive but engaging answer (under 150 words) using enthusiastic yet professional language.
          Highlight the benefits and practical applications.
          ${prompts[optionId]}
        `;
        
        try {
          const aiResponse = await generateAIResponse(enhancedQuery);
          
          // Update session
          const newPath = [...session.selectedPath, optionId];
          updateSession(sessionId, {
            selectedPath: newPath
          });
          
          const response = {
            success: true,
            type: 'response',
            response: aiResponse,
            showNewConversation: true,
            showBackButton: true,
            currentPath: newPath
          };
          
          res.status(200).json(response);
          return;
        } catch (aiError) {
          res.status(500).json({
            success: false,
            error: "Failed to generate AI response",
            message: "Sorry, I couldn't generate a response right now. Please try again."
          });
          return;
        }
      }
      
      // Invalid option ID
      res.status(400).json({ 
        success: false, 
        error: "Invalid option ID",
        message: "The selected option is not valid. Please try again."
      });
      return;
    }
    
    // Handle direct text query
    if (userQuery && userQuery.trim()) {
      
      const enhancedQuery = `
        You're an expert learning consultant. Answer questions about education, training, and skill development.
        Give a short (under 80 words), clear, and helpful answer.
        Question: ${userQuery.trim()}
      `;
      
      try {
        const aiResponse = await generateAIResponse(enhancedQuery);
        
        const response = {
          success: true,
          type: 'response',
          response: aiResponse,
          showNewConversation: true
        };
        
        res.status(200).json(response);
        return;
      } catch (aiError) {
        res.status(500).json({
          success: false,
          error: "Failed to generate AI response",
          message: "Sorry, I couldn't generate a response right now. Please try again."
        });
        return;
      }
    }
    
    // No valid input provided
    res.status(400).json({ 
      success: false, 
      error: "No valid input provided",
      message: "Please provide either a text query or select an option."
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Internal Server Error",
      message: "An unexpected error occurred. Please try again."
    });
  }
};

const generateAIResponse = async (enhancedQuery: string): Promise<string> => {
  const apiKey = process.env.GEMINI_API_KEY;
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

  if (!apiKey) {
    throw new Error("API key not configured");
  }

  if (!apiUrl) {
    throw new Error("API URL not configured");
  }

  const postData = {
    contents: [
      {
        parts: [
          {
            text: enhancedQuery,
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.7,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 400,
    },
  };

  try {
    const responseData = await axios.post(apiUrl, postData, {
      headers: {
        "Content-Type": "application/json",
      },
      timeout: 30000 // 30 second timeout
    });

    const response = responseData.data;
    if (response && response.candidates && response.candidates.length > 0) {
      let answer = response.candidates[0].content.parts[0].text;

      // Clean up the response formatting
      answer = answer
        .replace(/\*\*\*/g, "")
        .replace(/\*\*/g, "")
        .replace(/\*/g, "")
        .replace(/#{1,6}\s*/g, "")
        .replace(/\n{3,}/g, "\n\n")
        .trim();

      return answer;
    } else {
      throw new Error("No answer found in AI response");
    }
  } catch (apiError: any) {
    throw new Error(`AI API error: ${apiError.message}`);
  }
};

// Cleanup function to remove old sessions (run periodically)
export const cleanupSessions = (): void => {
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  
  let cleanedCount = 0;
  for (const [sessionId, session] of activeSessions.entries()) {
    if (session.lastActivity < oneHourAgo) {
      activeSessions.delete(sessionId);
      cleanedCount++;
    }
  }
};

// Export session count for monitoring
export const getActiveSessionCount = (): number => {
  return activeSessions.size;
};
