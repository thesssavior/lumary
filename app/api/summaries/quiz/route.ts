import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({});

// Placeholder for your OpenAI model, e.g., "gpt-3.5-turbo" or "gpt-4.1-mini"
const model = "gemini-2.5-flash"; 

interface QuizItem {
  question: string;
  answer: string;
}

export async function POST(req: NextRequest) {
  try {
    const { summaryText, locale, contentLanguage, title } = await req.json();

    if (!summaryText) {
      return NextResponse.json({ error: 'Summary text is required' }, { status: 400 });
    }
    if (!locale) {
      return NextResponse.json({ error: 'Locale is required' }, { status: 400 });
    }

    const systemInstruction = `
        You are an AI assistant tasked with generating a quiz from a video summary.
        Create 5 distinct question and answer pairs that test understanding of the core ideas in the summary.
        
        CRITICAL: You must return a valid JSON object with a "quiz" property containing an array of 5 objects.
        Each object in the array must have exactly these two properties: "question" (string) and "answer" (string).
        
        Expected JSON format:
        {
          "quiz": [
            {"question": "Question 1?", "answer": "Answer 1"},
            {"question": "Question 2?", "answer": "Answer 2"},
            {"question": "Question 3?", "answer": "Answer 3"},
            {"question": "Question 4?", "answer": "Answer 4"},
            {"question": "Question 5?", "answer": "Answer 5"}
          ]
        }
        
        Ensure the questions are thought-provoking and the answers are concise and accurate.
        IMPORTANT: Generate the quiz in ${contentLanguage} language.
        The summary is for a video possibly titled: "${title}".
        `;

    const userPrompt = `
        Video Summary:
        ---
        ${summaryText}
        ---

        JSON Output (array of question-answer objects) in ${contentLanguage} language:
        `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: userPrompt,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.5,
      },
    });

    const resultJsonString = response.text;

    if (!resultJsonString) {
      console.error("Gemini response was empty for quiz generation.");
      return NextResponse.json({ error: 'Failed to generate quiz from Gemini: Empty response' }, { status: 500 });
    }

    try {
      console.log("Gemini response:", resultJsonString);
      // Clean up the response - remove markdown code blocks if present
      let cleanedResponse = resultJsonString.trim();
      
      // Remove markdown code blocks (```json ... ``` or ``` ... ```)
      cleanedResponse = cleanedResponse.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
      
      // Try to find JSON within the response if it's wrapped in other text
      const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleanedResponse = jsonMatch[0];
      }
      
      console.log("Cleaned Gemini response:", cleanedResponse);
      
      const parsedResult = JSON.parse(cleanedResponse);

      // The prompt asks for an array directly, but sometimes models wrap it in a root key.
      // Check if the result is an array, or if it has a common root key like "quiz" or "questions".
      let quizData: QuizItem[];

      if (Array.isArray(parsedResult)) {
        quizData = parsedResult;
      } else if (parsedResult.quiz && Array.isArray(parsedResult.quiz)) {
        quizData = parsedResult.quiz;
      } else if (parsedResult.questions && Array.isArray(parsedResult.questions)) {
        quizData = parsedResult.questions;
      } else if (parsedResult.result && Array.isArray(parsedResult.result)) {
        quizData = parsedResult.result;
      } else {
        console.error("Gemini response for quiz was not in the expected array format:", parsedResult);
        return NextResponse.json({ error: 'Invalid quiz structure from Gemini: Expected an array of questions or an object with a "quiz", "questions", or "result" array.' }, { status: 500 });
      }
      
      // Further validation of items in the array
      if (!quizData.every(item => typeof item.question === 'string' && typeof item.answer === 'string')) {
        console.error("Invalid item structure in quiz data from Gemini:", quizData);
        return NextResponse.json({ error: 'Invalid item structure in quiz data: Each item must have a question and answer string.' }, { status: 500 });
      }

      return NextResponse.json({ quiz: quizData }, { status: 200 });
    } catch (parseError) {
      console.error("Failed to parse Gemini quiz response:", parseError, "Raw response:", resultJsonString);
      return NextResponse.json({ error: 'Failed to parse quiz data from Gemini' }, { status: 500 });
    }

  } catch (error: any) {
    console.error('Error generating quiz:', error);
    return NextResponse.json({ error: error.message || 'Internal server error generating quiz' }, { status: 500 });
  }
} 