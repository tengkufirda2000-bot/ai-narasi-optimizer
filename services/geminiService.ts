import { GoogleGenAI } from "@google/genai";

// ==================================================================================
// PETUNJUK: PENGATURAN API KEY GEMINI
// Ganti nilai string "GANTI_DENGAN_API_KEY_ANDA" dengan API Key Google Gemini Anda.
// Anda bisa mendapatkan API Key dari Google AI Studio.
// ==================================================================================
const GEMINI_API_KEY = "AIzaSyAoY5xmBCac6AocygOb42JqYBa47hJsyF0";


// --- Jangan ubah kode di bawah ini ---
if (GEMINI_API_KEY === "GANTI_DENGAN_API_KEY_ANDA") {
    throw new Error("API Key belum diatur. Buka file 'services/geminiService.ts' dan ganti placeholder GEMINI_API_KEY.");
}

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

/**
 * Optimizes a given text narrative using the Gemini AI model.
 * @param text The user's input text describing an activity.
 * @returns A promise that resolves to the professionally optimized narrative.
 */
export const optimizeNarration = async (text: string): Promise<string> => {
    if (!text.trim()) {
        throw new Error("Input text cannot be empty.");
    }
    
    try {
        const prompt = `Sebagai seorang ahli komunikasi korporat, ringkas dan padatkan deskripsi kegiatan berikut menjadi satu paragraf singkat yang profesional dan jelas untuk keperluan laporan. Fokus pada poin-poin terpenting dan hasil utama dari kegiatan tersebut. Pastikan hasilnya padat dan langsung ke intinya. Berikan hanya hasil ringkasannya tanpa kalimat pembuka atau penutup tambahan.

Deskripsi asli: "${text}"

Ringkasan Profesional:`;
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });

        const optimizedText = response.text;
        
        if (!optimizedText) {
            throw new Error("AI did not return a valid response.");
        }
        
        return optimizedText.trim();

    } catch (error) {
        console.error("Error calling Gemini API:", error);
        throw new Error("Gagal mengoptimalkan narasi karena kesalahan API.");
    }
};