import React, { useState, useCallback, useRef, useEffect } from 'react';
import { optimizeNarration } from './services/geminiService';
import { Icon } from './components/icons';
import Spinner from './components/Spinner';

// ==================================================================================
// PETUNJUK: PENGATURAN GOOGLE SPREADSHEET
// Ganti nilai string "GANTI_DENGAN_URL_WEB_APP_ANDA" dengan URL Web App
// yang Anda dapatkan setelah men-deploy Google Apps Script di Spreadsheet Anda.
// ==================================================================================
const SPREADSHEET_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbx_77eBvrK_kloUy583TSb6mY1DvKyEnscU2NtuErLn73F29HARN4HWxRH1lkemwzow/exec";


// Type definitions for the Web Speech API
interface SpeechRecognition extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: (event: SpeechRecognitionEvent) => void;
  onend: () => void;
  onerror: (event: any) => void; 
  start: () => void;
  stop: () => void;
}

interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

const App: React.FC = () => {
    const [userInput, setUserInput] = useState<string>('');
    const [optimizedText, setOptimizedText] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
    const [isRecording, setIsRecording] = useState<boolean>(false);
    const [isSpeechSupported, setIsSpeechSupported] = useState<boolean>(false);
    
    const optimizedTextRef = useRef<HTMLTextAreaElement>(null);
    const recognitionRef = useRef<SpeechRecognition | null>(null);

    useEffect(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
            setIsSpeechSupported(true);
            const recognition = new SpeechRecognition();
            recognition.lang = 'id-ID';
            recognition.continuous = true;
            recognition.interimResults = true;

            // Disempurnakan untuk kejelasan dan keandalan
            recognition.onresult = (event: SpeechRecognitionEvent) => {
                let finalTranscript = '';
                // Iterasi melalui semua hasil yang diterima sejak 'resultIndex' terakhir
                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    // Jika hasilnya final, tambahkan ke transkrip
                    if (event.results[i].isFinal) {
                        finalTranscript += event.results[i][0].transcript;
                    }
                }
                // Tambahkan transkrip final yang baru ke input yang ada
                if (finalTranscript) {
                    setUserInput(prev => (prev ? prev + ' ' : '') + finalTranscript.trim());
                }
            };
            
            recognition.onend = () => {
                setIsRecording(false);
            };

            recognition.onerror = (event) => {
                console.error('Speech recognition error:', event.error);
                setError('Terjadi kesalahan saat merekam suara.');
                setIsRecording(false);
            };

            recognitionRef.current = recognition;
        } else {
            setIsSpeechSupported(false);
            console.warn("Browser tidak mendukung Speech Recognition.");
        }
    }, []);
    
    const handleToggleRecording = () => {
        const recognition = recognitionRef.current;
        if (!recognition || !isSpeechSupported) {
            setError("Fitur input suara tidak didukung di browser ini.");
            return;
        }

        if (isRecording) {
            recognition.stop();
        } else {
            recognition.start();
        }
        setIsRecording(!isRecording);
    };


    const handleOptimize = useCallback(async () => {
        if (!userInput.trim()) {
            setError("Mohon masukkan uraian kegiatan terlebih dahulu.");
            return;
        }
        setIsLoading(true);
        setError(null);
        setOptimizedText('');
        setIsSubmitted(false);

        try {
            const result = await optimizeNarration(userInput);
            setOptimizedText(result);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Terjadi kesalahan yang tidak diketahui.");
        } finally {
            setIsLoading(false);
        }
    }, [userInput]);

    useEffect(() => {
        if (optimizedTextRef.current && optimizedText) {
            let i = 0;
            optimizedTextRef.current.value = "";
            const interval = setInterval(() => {
                if (i < optimizedText.length) {
                    optimizedTextRef.current!.value += optimizedText.charAt(i);
                    i++;
                } else {
                    clearInterval(interval);
                }
            }, 20);
            return () => clearInterval(interval);
        }
    }, [optimizedText]);


    const handleSubmit = async () => {
        if (!optimizedText) {
            setError("Tidak ada narasi yang dioptimalkan untuk dikirim.");
            return;
        }
        if (SPREADSHEET_WEB_APP_URL === "GANTI_DENGAN_URL_WEB_APP_ANDA") {
            setError("URL Spreadsheet belum diatur. Buka file 'App.tsx' dan perbarui placeholder SPREADSHEET_WEB_APP_URL.");
            return;
        }

        setIsSubmitting(true);
        setError(null);
        setIsSubmitted(false);

        try {
            await fetch(SPREADSHEET_WEB_APP_URL, {
                method: 'POST',
                mode: 'no-cors', // Penting untuk Apps Script agar tidak diblokir CORS
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    original: userInput,
                    optimized: optimizedText
                }),
            });
            
            // Karena mode 'no-cors', kita tidak bisa membaca respons,
            // jadi kita anggap berhasil jika tidak ada error jaringan.
            setIsSubmitted(true);
            setUserInput('');
            setOptimizedText('');
            // Sembunyikan pesan sukses setelah 3 detik
            setTimeout(() => setIsSubmitted(false), 3000);

        } catch (err) {
            console.error("Gagal mengirim data ke spreadsheet:", err);
            setError("Gagal mengirim data. Periksa koneksi internet atau URL Apps Script Anda.");
        } finally {
            setIsSubmitting(false);
        }
    };
    
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 to-gray-900 flex items-center justify-center p-4 font-sans text-slate-200">
            <div className="w-full max-w-2xl bg-slate-800/50 backdrop-blur-lg border border-slate-700 rounded-2xl shadow-2xl shadow-violet-900/20 p-8 space-y-8 transition-all duration-500">
                <header className="text-center">
                    <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-violet-400 to-indigo-400 pb-2">
                        Optimalisasi Narasi AI
                    </h1>
                    <p className="text-slate-400">Ubah deskripsi panjang menjadi ringkasan profesional secara instan.</p>
                </header>

                <div className="space-y-4">
                    <label htmlFor="userInput" className="block text-sm font-medium text-slate-300">
                        Uraian Kegiatan Anda
                    </label>
                    <div className="relative w-full">
                        <textarea
                            id="userInput"
                            rows={5}
                            value={userInput}
                            onChange={(e) => setUserInput(e.target.value)}
                            placeholder="Ketik atau klik ikon mikrofon untuk mendiktekan kegiatan Anda..."
                            className="w-full p-3 pr-12 bg-slate-900/80 border border-slate-600 rounded-lg text-slate-100 placeholder-slate-500 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition duration-150 ease-in-out"
                            aria-label="Uraian Kegiatan Anda"
                        />
                        <button
                            onClick={handleToggleRecording}
                            disabled={!isSpeechSupported}
                            title={!isSpeechSupported ? 'Fitur input suara tidak didukung oleh browser Anda.' : (isRecording ? 'Berhenti Merekam' : 'Mulai Merekam')}
                            className={`absolute bottom-3 right-3 p-2 rounded-full transition-colors duration-200 ${isRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'} disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed`}
                            aria-label={!isSpeechSupported ? 'Input suara tidak didukung' : (isRecording ? 'Berhenti Merekam' : 'Mulai Merekam')}
                        >
                            <Icon name="microphone" className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                <div className="flex justify-center">
                    <button
                        onClick={handleOptimize}
                        disabled={isLoading || isSubmitting || !userInput}
                        className="flex items-center justify-center gap-3 w-full sm:w-auto px-8 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-semibold rounded-lg shadow-lg hover:shadow-violet-500/50 disabled:from-slate-600 disabled:to-slate-600 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none transform hover:-translate-y-1 transition-all duration-300"
                        aria-live="polite"
                    >
                        {isLoading ? <Spinner className="w-5 h-5" /> : <Icon name="sparkles" className="w-5 h-5" />}
                        <span>{isLoading ? 'Sedang Memproses...' : 'Buat Ringkasan AI'}</span>
                    </button>
                </div>
                
                {error && (
                    <div className="bg-red-900/50 border border-red-500/50 text-red-300 px-4 py-3 rounded-lg" role="alert">
                        <strong className="font-bold">Gagal: </strong>
                        <span>{error}</span>
                    </div>
                )}
                
                <div className="space-y-4 pt-4 border-t border-slate-700">
                    <label htmlFor="optimizedText" className="block text-sm font-medium text-slate-300">
                        Hasil Ringkasan AI
                    </label>
                    <textarea
                        id="optimizedText"
                        ref={optimizedTextRef}
                        rows={5}
                        readOnly
                        placeholder="Ringkasan profesional dari AI akan muncul di sini..."
                        className="w-full p-3 bg-slate-900/80 border border-slate-600 rounded-lg text-slate-100 placeholder-slate-500 transition duration-150 ease-in-out"
                        aria-label="Hasil Ringkasan AI"
                    />
                    <div className="flex justify-end items-center gap-4">
                         {isSubmitted && (
                            <p className="text-sm text-green-400 transition-opacity duration-300" role="status">
                                Berhasil dikirim!
                            </p>
                        )}
                        <button
                            onClick={handleSubmit}
                            disabled={!optimizedText || isLoading || isSubmitting}
                            className="flex items-center justify-center gap-2 w-28 px-6 py-2 bg-emerald-600 text-white font-semibold rounded-lg shadow-md hover:bg-emerald-700 disabled:bg-slate-600 disabled:cursor-not-allowed transform hover:scale-105 transition-all duration-200"
                            aria-label="Kirim hasil optimasi"
                        >
                            {isSubmitting ? <Spinner className="w-5 h-5" /> : <Icon name="send" className="w-5 h-5" />}
                            <span>{isSubmitting ? 'Mengirim...' : 'Kirim'}</span>
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default App;