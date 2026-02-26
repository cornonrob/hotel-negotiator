"use client";
import { useState, useRef, useEffect } from "react";

const HOTEL_CONTEXT = `You are Victoria, a personal reservations concierge for The Ritz London. You are warm, gracious, subtly persuasive, and impeccably professional — the embodiment of luxury hospitality.

You have the following pricing matrix and negotiating authority:

ROOM TYPES (base nightly rates):
- Classic Room: £800/night
- Deluxe Room: £1,100/night  
- Junior Suite: £1,800/night
- State Suite: £3,500/night
- Royal Suite: £8,500/night

SUPPLEMENTS & ADD-ONS (you can offer these as concessions or upsells):
- Breakfast (per person): £65
- Half Board (breakfast + dinner): £185/person
- Full Board: £280/person
- Late checkout to 4pm: £150 (you can offer FREE as a concession)
- Late checkout to 6pm: £350 (you can offer 50% off as a concession)
- Additional bed: £200/night
- Welcome champagne: £120 (you can offer FREE as a gesture for bookings over 3 nights)
- Spa day pass (per person): £280
- Airport transfer: £180 each way
- Butler service: £400/night

YOUR NEGOTIATION STRATEGY:
1. Always anchor to the rack rate first
2. Understand the customer's party (ages, occasion, preferences) before making an offer
3. Make concessions in order: soft amenities first (welcome champagne, late checkout), then meal plan discounts, then room upgrades, and only as a last resort, room rate reductions (max 15% off rack rate)
4. Frame every concession as a gift, not a discount
5. If they're celebrating something, lean into it emotionally
6. Never reveal your margin floor. You cannot go below 30% off rack rate on room price.
7. Keep offers specific and time-limited
8. Speak in a warm, refined, unhurried tone. Use "of course", "naturally", "absolutely" often.
9. IMPORTANT: When responding via voice, keep responses concise and conversational — no bullet points or long lists. Speak naturally as if on a phone call.

CURRENT OFFER STATE: Track what's been offered and accepted in the conversation. Build toward a final confirmed booking summary.`;

const initialMessages = [
  {
    role: "assistant",
    content: "Good afternoon, and welcome to The Ritz London. I'm Victoria, your personal reservations concierge. It would be my absolute pleasure to help you plan something truly memorable.\n\nMay I ask — what brings you to London? And who will be joining you?",
  },
];

const suggestedReplies = [
  "Anniversary trip for 2",
  "Family holiday with kids",
  "Business trip, just me",
  "Birthday celebration",
];

export default function HotelNegotiator() {
  const [messages, setMessages] = useState(initialMessages);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceMode, setVoiceMode] = useState(false);
  const [transcript, setTranscript] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    synthRef.current = window.speechSynthesis;
    // Speak Victoria's opening line on first load
    speakText(initialMessages[0].content);
  }, []);

  const speakText = (text: string) => {
    if (!synthRef.current) return;
    synthRef.current.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    // Find a good English voice
    const voices = synthRef.current.getVoices();
    const preferred = voices.find(v =>
      v.name.includes("Samantha") || v.name.includes("Karen") ||
      v.name.includes("Daniel") || v.name.includes("English") ||
      (v.lang.startsWith("en") && v.name.toLowerCase().includes("female"))
    ) || voices.find(v => v.lang.startsWith("en")) || voices[0];
    if (preferred) utterance.voice = preferred;
    utterance.rate = 0.88;
    utterance.pitch = 1.05;
    utterance.volume = 1;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    synthRef.current.speak(utterance);
  };

  const stopSpeaking = () => {
    synthRef.current?.cancel();
    setIsSpeaking(false);
  };

  const startListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice input isn't supported in this browser. Please use Chrome.");
      return;
    }
    stopSpeaking();
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-GB";
    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (e: any) => {
      const t = Array.from(e.results).map((r: any) => r[0].transcript).join("");
      setTranscript(t);
      if (e.results[e.results.length - 1].isFinal) {
        setTranscript("");
        setIsListening(false);
        sendMessage(t, true);
      }
    };
    recognition.onerror = () => { setIsListening(false); setTranscript(""); };
    recognition.onend = () => { setIsListening(false); };
    recognitionRef.current = recognition;
    recognition.start();
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    setIsListening(false);
  };

  const sendMessage = async (text?: string, fromVoice = false) => {
    const userText = text || input.trim();
    if (!userText) return;
    setInput("");
    setTranscript("");
    const newMessages = [...messages, { role: "user", content: userText }];
    setMessages(newMessages);
    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: HOTEL_CONTEXT,
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await response.json();
      const reply = data.content?.[0]?.text || "I do apologise — could you repeat that?";
      setMessages(prev => [...prev, { role: "assistant", content: reply }]);
      if (fromVoice || voiceMode) speakText(reply);
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "My sincerest apologies — there seems to be a brief technical difficulty. Please do try again." }]);
    }
    setLoading(false);
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const micButtonStyle = {
    width: "52px", height: "52px", flexShrink: 0,
    borderRadius: "50%",
    background: isListening
      ? "linear-gradient(135deg, #ef4444, #dc2626)"
      : "linear-gradient(135deg, #c9a84c, #a07830)",
    border: "none",
    cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: "20px",
    transition: "all 0.2s",
    boxShadow: isListening ? "0 0 20px rgba(239,68,68,0.4)" : "0 0 12px rgba(201,168,76,0.2)",
    animation: isListening ? "micPulse 1s infinite" : "none",
  } as React.CSSProperties;

  return (
    <div style={{ minHeight:"100vh", background:"#0c0a08", fontFamily:"'Cormorant Garamond','Georgia',serif", display:"flex", flexDirection:"column", alignItems:"center", position:"relative", overflow:"hidden" }}>
      <div style={{ position:"fixed", inset:0, zIndex:0, background:"radial-gradient(ellipse at 20% 50%, #1a1208 0%, #0c0a08 60%), radial-gradient(ellipse at 80% 20%, #150f05 0%, transparent 50%)" }} />
      <div style={{ position:"fixed", inset:0, zIndex:0, opacity:0.03, backgroundImage:"repeating-linear-gradient(0deg, transparent, transparent 40px, #c9a84c 40px, #c9a84c 41px), repeating-linear-gradient(90deg, transparent, transparent 40px, #c9a84c 40px, #c9a84c 41px)" }} />

      {/* Header */}
      <div style={{ position:"fixed", top:0, left:0, right:0, zIndex:10, padding:"20px 40px", borderBottom:"1px solid rgba(201,168,76,0.15)", background:"rgba(12,10,8,0.95)", backdropFilter:"blur(20px)", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div style={{ display:"flex", alignItems:"center", gap:"16px" }}>
          <div style={{ width:"36px", height:"36px", border:"1px solid #c9a84c", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"14px", color:"#c9a84c", fontWeight:"700" }}>R</div>
          <div>
            <div style={{ color:"#c9a84c", fontSize:"11px", letterSpacing:"4px", textTransform:"uppercase", fontFamily:"system-ui" }}>The Ritz London</div>
            <div style={{ color:"#6b5d45", fontSize:"10px", letterSpacing:"2px", textTransform:"uppercase", fontFamily:"system-ui", marginTop:"2px" }}>Private Reservations</div>
          </div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:"16px" }}>
          {/* Voice mode toggle */}
          <button onClick={() => { setVoiceMode(v => !v); stopSpeaking(); }} style={{ background:"transparent", border:`1px solid ${voiceMode ? "#c9a84c" : "rgba(201,168,76,0.3)"}`, color: voiceMode ? "#c9a84c" : "#6b5d45", padding:"6px 14px", fontSize:"10px", letterSpacing:"2px", textTransform:"uppercase", fontFamily:"system-ui", cursor:"pointer", transition:"all 0.2s" }}>
            {voiceMode ? "🔊 Voice On" : "🔇 Voice Off"}
          </button>
          <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
            <div style={{ width:"6px", height:"6px", borderRadius:"50%", background: isSpeaking ? "#c9a84c" : "#4ade80", animation: isSpeaking ? "micPulse 0.8s infinite" : "pulse 2s infinite" }} />
            <span style={{ color:"#6b5d45", fontSize:"10px", letterSpacing:"2px", textTransform:"uppercase", fontFamily:"system-ui" }}>{isSpeaking ? "Victoria speaking…" : "Victoria • Online"}</span>
          </div>
        </div>
      </div>

      {/* Chat container */}
      <div style={{ position:"relative", zIndex:1, width:"100%", maxWidth:"780px", height:"100vh", display:"flex", flexDirection:"column", paddingTop:"80px" }}>
        <div style={{ flex:1, overflowY:"auto", padding:"32px 24px 20px", display:"flex", flexDirection:"column", gap:"24px", scrollbarWidth:"thin", scrollbarColor:"#2a2015 transparent" }}>
          {messages.map((msg, i) => (
            <div key={i} style={{ display:"flex", flexDirection:msg.role==="user"?"row-reverse":"row", gap:"12px", alignItems:"flex-start", animation:"fadeSlideIn 0.4s ease both" }}>
              {msg.role==="assistant" && (
                <div style={{ width:"32px", height:"32px", flexShrink:0, background:"linear-gradient(135deg,#c9a84c,#a07830)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"12px", color:"#0c0a08", fontWeight:"700" }}>V</div>
              )}
              <div style={{ maxWidth:"78%", background:msg.role==="assistant"?"rgba(201,168,76,0.05)":"rgba(255,255,255,0.05)", border:msg.role==="assistant"?"1px solid rgba(201,168,76,0.15)":"1px solid rgba(255,255,255,0.08)", padding:"16px 20px", color:msg.role==="assistant"?"#e8dcc8":"#c4b89a", fontSize:"15px", lineHeight:"1.75", whiteSpace:"pre-wrap", position:"relative" }}>
                {msg.content}
                {msg.role==="assistant" && (
                  <button onClick={() => speakText(msg.content)} style={{ position:"absolute", bottom:"8px", right:"8px", background:"transparent", border:"none", color:"rgba(201,168,76,0.4)", cursor:"pointer", fontSize:"12px", padding:"2px 6px" }} title="Read aloud">🔊</button>
                )}
              </div>
            </div>
          ))}

          {/* Live transcript while listening */}
          {transcript && (
            <div style={{ display:"flex", flexDirection:"row-reverse", gap:"12px", alignItems:"flex-start", opacity:0.6 }}>
              <div style={{ maxWidth:"78%", border:"1px dashed rgba(255,255,255,0.1)", padding:"16px 20px", color:"#c4b89a", fontSize:"15px", lineHeight:"1.75", fontStyle:"italic" }}>
                {transcript}…
              </div>
            </div>
          )}

          {loading && (
            <div style={{ display:"flex", gap:"12px", alignItems:"flex-start" }}>
              <div style={{ width:"32px", height:"32px", background:"linear-gradient(135deg,#c9a84c,#a07830)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"12px", color:"#0c0a08", fontWeight:"700" }}>V</div>
              <div style={{ padding:"16px 20px", border:"1px solid rgba(201,168,76,0.15)", display:"flex", gap:"6px", alignItems:"center" }}>
                {[0,1,2].map(j=><div key={j} style={{ width:"5px", height:"5px", borderRadius:"50%", background:"#c9a84c", opacity:0.5, animation:`bounce 1.2s ${j*0.2}s infinite ease-in-out` }}/>)}
              </div>
            </div>
          )}
          <div ref={bottomRef}/>
        </div>

        {/* Suggested replies */}
        {messages.length <= 2 && !loading && (
          <div style={{ padding:"0 24px 16px", display:"flex", gap:"8px", flexWrap:"wrap" }}>
            {suggestedReplies.map(r=>(
              <button key={r} onClick={()=>sendMessage(r)} style={{ background:"transparent", border:"1px solid rgba(201,168,76,0.3)", color:"#c9a84c", padding:"8px 16px", fontSize:"11px", letterSpacing:"1.5px", textTransform:"uppercase", fontFamily:"system-ui", cursor:"pointer" }}>{r}</button>
            ))}
          </div>
        )}

        {/* Input bar */}
        <div style={{ padding:"16px 24px 32px", borderTop:"1px solid rgba(201,168,76,0.1)", background:"rgba(12,10,8,0.8)", backdropFilter:"blur(20px)", display:"flex", gap:"12px", alignItems:"flex-end" }}>
          <textarea
            value={input}
            onChange={e=>setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder={isListening ? "Listening…" : "Tell Victoria about your stay, or use the mic…"}
            rows={1}
            disabled={isListening}
            style={{ flex:1, background:"rgba(255,255,255,0.03)", border:"1px solid rgba(201,168,76,0.2)", color:"#e8dcc8", padding:"14px 18px", fontFamily:"'Cormorant Garamond',serif", fontSize:"15px", resize:"none", outline:"none", lineHeight:"1.5", opacity: isListening ? 0.5 : 1 }}
            onInput={(e)=>{const t=e.target as HTMLTextAreaElement;t.style.height="auto";t.style.height=Math.min(t.scrollHeight,120)+"px";}}
          />

          {/* Mic button */}
          <button
            onClick={isListening ? stopListening : startListening}
            disabled={loading}
            style={micButtonStyle}
            title={isListening ? "Click to stop" : "Click to speak"}
          >
            {isListening ? "⏹" : "🎙"}
          </button>

          {/* Send button */}
          <button
            onClick={()=>sendMessage()}
            disabled={!input.trim()||loading}
            style={{ width:"48px", height:"48px", flexShrink:0, background:input.trim()&&!loading?"linear-gradient(135deg,#c9a84c,#a07830)":"rgba(201,168,76,0.1)", border:"none", cursor:"pointer", color:input.trim()&&!loading?"#0c0a08":"#4a3d28", fontSize:"18px" }}
          >→</button>
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes fadeSlideIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
        @keyframes bounce { 0%,100% { transform:translateY(0); opacity:0.5; } 50% { transform:translateY(-5px); opacity:1; } }
        @keyframes micPulse { 0%,100% { transform:scale(1); } 50% { transform:scale(1.08); } }
        textarea::placeholder { color:#4a3d28; }
        ::-webkit-scrollbar { width:4px; }
        ::-webkit-scrollbar-track { background:transparent; }
        ::-webkit-scrollbar-thumb { background:#2a2015; border-radius:2px; }
      `}</style>
    </div>
  );
}
