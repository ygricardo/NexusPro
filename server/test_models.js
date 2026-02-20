import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';
dotenv.config();

const key = process.env.GEMINI_API_KEY;
console.log("Using API Key:", key ? key.substring(0, 10) + "..." : "UNDEFINED");

const genAI = new GoogleGenerativeAI(key);

async function run() {
    try {
        // For some versions of the SDK, listing models might require a direct fetch if not exposed
        // But let's try a simple generation with a very standard model first, or generic 'gemini-pro'
        console.log("Attempting to generate with gemini-pro to check connection...");
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });
        const result = await model.generateContent("Hello");
        console.log("gemini-pro works! Response:", result.response.text());
    } catch (error) {
        console.error("gemini-pro failed:", error.message);
    }

    try {
        console.log("Attempting to generate with gemini-1.5-flash...");
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent("Hello");
        console.log("gemini-1.5-flash works! Response:", result.response.text());
    } catch (error) {
        console.error("gemini-1.5-flash failed:", error.message);
    }

    try {
        console.log("Attempting to generate with gemini-1.5-flash-001...");
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-001" });
        const result = await model.generateContent("Hello");
        console.log("gemini-1.5-flash-001 works! Response:", result.response.text());
    } catch (error) {
        console.error("gemini-1.5-flash-001 failed:", error.message);
    }

    try {
        console.log("Attempting to generate with gemini-1.0-pro...");
        const model = genAI.getGenerativeModel({ model: "gemini-1.0-pro" });
        const result = await model.generateContent("Hello");
        console.log("gemini-1.0-pro works! Response:", result.response.text());
    } catch (error) {
        console.error("gemini-1.0-pro failed:", error.message);
    }
}

run();
