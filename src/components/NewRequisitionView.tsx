import React, { useState } from 'react';
import { Mic, MicOff, Send, Sparkles, CheckCircle2, ShieldCheck, ArrowRight } from 'lucide-react';

interface NewRequisitionViewProps {
  onSubmitIntake: (rawText: string) => Promise<void>;
  isProcessing: boolean;
  onViewOrders: () => void;
}

export const NewRequisitionView: React.FC<NewRequisitionViewProps> = ({
  onSubmitIntake,
  isProcessing,
  onViewOrders,
}) => {
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [lastSubmittedOrder, setLastSubmittedOrder] = useState<string | null>(null);

  // Web Speech API Voice Dictation
  const toggleVoiceRecording = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser. Please use text input or standard Chrome.');
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => setIsListening(true);
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputText(transcript);
        setIsListening(false);
      };
      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);
      recognition.start();
    } catch (err) {
      setIsListening(false);
    }
  };

  const handlePreset = (text: string) => {
    setInputText(text);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    const submitted = inputText.trim();
    await onSubmitIntake(submitted);
    setLastSubmittedOrder(submitted);
    setInputText('');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs">
        <h2 className="text-base font-bold text-slate-900">
          Create Procurement Requisition
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Type or speak naturally. The AI Intake Agent extracts commodity specifications, evaluates the autonomous approval limit ($2,500), and dispatches the PO immediately.
        </p>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div className="relative">
            <textarea
              rows={4}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder='e.g. "Need 500 bags of Sona Masoori Rice delivered to Central Dock by Friday 5:00 PM"'
              disabled={isProcessing}
              className="w-full p-4 pr-12 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all font-sans leading-relaxed"
            />

            <button
              type="button"
              onClick={toggleVoiceRecording}
              title={isListening ? 'Stop microphone' : 'Speak order (Voice Input)'}
              className={`absolute right-3.5 top-3.5 p-2 rounded-lg transition-colors cursor-pointer ${
                isListening
                  ? 'bg-red-500 text-white animate-pulse'
                  : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900 shadow-2xs'
              }`}
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
            {/* Quick Fill Templates */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] text-slate-400 font-semibold mr-1">Test Scenarios:</span>
              <button
                type="button"
                onClick={() => handlePreset('Need 500 bags of standard sona masoori rice by Friday ($1,750)')}
                className="px-2.5 py-1 text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-md cursor-pointer transition-colors font-medium"
              >
                1. Below Threshold ($1,750 Auto-Approve)
              </button>
              <button
                type="button"
                onClick={() => handlePreset('Urgent requisition: 2,500 bags of premium basmati rice for next Monday ($8,750)')}
                className="px-2.5 py-1 text-xs bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 rounded-md cursor-pointer transition-colors font-medium"
              >
                2. Above Threshold ($8,750 Manager Exception)
              </button>
              <button
                type="button"
                onClick={() => handlePreset('Need 400 bags of parboiled rice for delivery tomorrow ($1,400) - test dock receiving defect')}
                className="px-2.5 py-1 text-xs bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-md cursor-pointer transition-colors font-medium"
              >
                3. Damaged Cargo Test
              </button>
              <button
                type="button"
                onClick={() => handlePreset('Order 800 sacks of grain ($2,400) - test supplier stock capacity rejection')}
                className="px-2.5 py-1 text-xs bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 rounded-md cursor-pointer transition-colors font-medium"
              >
                4. Supplier Reject Test
              </button>
            </div>

            <button
              type="submit"
              disabled={isProcessing || !inputText.trim()}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer shrink-0"
            >
              <Send className="w-4 h-4" />
              <span>{isProcessing ? 'Processing Order...' : 'Submit Requisition'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Confirmation Card if just submitted */}
      {lastSubmittedOrder && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 shadow-2xs text-xs flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <strong className="text-emerald-950 font-semibold block text-sm">
                Requisition Submitted to Autopilot
              </strong>
              <p className="text-emerald-800 mt-0.5">
                "{lastSubmittedOrder}" was parsed and evaluated.
              </p>
            </div>
          </div>

          <button
            onClick={onViewOrders}
            className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-semibold flex items-center gap-1.5 cursor-pointer shrink-0 shadow-xs"
          >
            <span>View in Orders</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Architecture Guidance Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
          <div className="font-bold text-slate-900 mb-1">1. Intelligent Extraction</div>
          <p className="text-slate-500 leading-relaxed">
            Gemini parses free-form voice or text into quantity, commodity, estimated contract value, and SLA deadline.
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
          <div className="font-bold text-slate-900 mb-1">2. Auto-Approval Policy</div>
          <p className="text-slate-500 leading-relaxed">
            Requisitions under $2,500 with qualified suppliers bypass human review and are dispatched in under 2 seconds.
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
          <div className="font-bold text-slate-900 mb-1">3. Automated Dispatch</div>
          <p className="text-slate-500 leading-relaxed">
            Dynamic routing evaluates vendor ratings and generates formal purchase order documentation with email tracking.
          </p>
        </div>
      </div>
    </div>
  );
};
