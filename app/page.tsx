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
8. Speak in a warm, refined, unhurried tone. Use "of course", "naturally", "absolutely" often.`;

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
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (text?: string) => {
    const userText = text || input.trim();
    if (!userText) return;
    setInput("");
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
    } catch (e) {
      setMessages(prev => [...prev, { role: "assistant", content: "My sincerest apologies — there seems to be a brief technical difficulty. Please do try again." }]);
    }
    setLoading(false);
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  return (
    <div style={{ minHeight:"100vh", background:"#0c0a08", fontFamily:"'Cormorant Garamond','Georgia',serif", display:"flex", flexDirection:"column", alignItems:"center", position:"relative", overflow:"hidden" }}>
      <div style={{ position:"fixed", inset:0, zIndex:0, background:"radial-gradient(ellipse at 20% 50%, #1a1208 0%, #0c0a08 60%)" }} />
      <div style={{ position:"fixed", top:0, left:0, right:0, zIndex:10, padding:"20px 40px", borderBottom:"1px solid rgba(201,168,76,0.15)", background:"rgba(12,10,8,0.95)", backdropFilter:"blur(20px)", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div style={{ display:"flex", alignItems:"center", gap:"16px" }}>
          <div style={{ width:"36px", height:"36px", border:"1px solid #c9a84c", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"14px", color:"#c9a84c", fontWeight:"700" }}>R</div>
          <div>
            <div style={{ color:"#c9a84c", fontSize:"11px", letterSpacing:"4px", textTransform:"uppercase", fontFamily:"system-ui" }}>The Ritz London</div>
            <div style={{ color:"#6b5d45", fontSize:"10px", letterSpacing:"2px", textTransform:"uppercase", fontFamily:"system-ui", marginTop:"2px" }}>Private Reservations</div>
          </div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
          <div style={{ width:"6px", height:"6px", borderRadius:"50%", background:"#4ade80" }} />
          <span style={{ color:"#6b5d45", fontSize:"10px", letterSpacing:"2px", textTransform:"uppercase", fontFamily:"system-ui" }}>Victoria • Online</span>
        </div>
      </div>

      <div style={{ position:"relative", zIndex:1, width:"100%", maxWidth:"780px", height:"100vh", display:"flex", flexDirection:"column", paddingTop:"80px" }}>
        <div style={{ flex:1, overflowY:"auto", padding:"32px 24px 20px", display:"flex", flexDirection:"column", gap:"24px" }}>
          {messages.map((msg, i) => (
            <div key={i} style={{ display:"flex", flexDirection:msg.role==="user"?"row-reverse":"row", gap:"12px", alignItems:"flex-start" }}>
              {msg.role==="assistant" && (
                <div style={{ width:"32px", height:"32px", flexShrink:0, background:"linear-gradient(135deg,#c9a84c,#a07830)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"12px", color:"#0c0a08", fontWeight:"700" }}>V</div>
              )}
              <div style={{ maxWidth:"78%", background:msg.role==="assistant"?"rgba(201,168,76,0.05)":"rgba(255,255,255,0.05)", border:msg.role==="assistant"?"1px solid rgba(201,168,76,0.15)":"1px solid rgba(255,255,255,0.08)", padding:"16px 20px", color:msg.role==="assistant"?"#e8dcc8":"#c4b89a", fontSize:"15px", lineHeight:"1.75", whiteSpace:"pre-wrap" }}>
                {msg.content}
              </div>
            </div>
          ))}
          {loading && (
            <div style={{ display:"flex", gap:"12px", alignItems:"flex-start" }}>
              <div style={{ width:"32px", height:"32px", background:"linear-gradient(135deg,#c9a84c,#a07830)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"12px", color:"#0c0a08", fontWeight:"700" }}>V</div>
              <div style={{ padding:"16px 20px", border:"1px solid rgba(201,168,76,0.15)", display:"flex", gap:"6px" }}>
                {[0,1,2].map(j=><div key={j} style={{ width:"5px", height:"5px", borderRadius:"50%", background:"#c9a84c", opacity:0.5 }}/>)}
              </div>
            </div>
          )}
          <div ref={bottomRef}/>
        </div>

        {messages.length <= 2 && !loading && (
          <div style={{ padding:"0 24px 16px", display:"flex", gap:"8px", flexWrap:"wrap" }}>
            {suggestedReplies.map(r=>(
              <button key={r} onClick={()=>sendMessage(r)} style={{ background:"transparent", border:"1px solid rgba(201,168,76,0.3)", color:"#c9a84c", padding:"8px 16px", fontSize:"11px", letterSpacing:"1.5px", textTransform:"uppercase", fontFamily:"system-ui", cursor:"pointer" }}>{r}</button>
            ))}
          </div>
        )}

        <div style={{ padding:"16px 24px 32px", borderTop:"1px solid rgba(201,168,76,0.1)", background:"rgba(12,10,8,0.8)", display:"flex", gap:"12px", alignItems:"flex-end" }}>
          <textarea value={input} onChange={e=>setInput(e.target.value)} onKeyDown={handleKey} placeholder="Tell Victoria about your stay…" rows={1} style={{ flex:1, background:"rgba(255,255,255,0.03)", border:"1px solid rgba(201,168,76,0.2)", color:"#e8dcc8", padding:"14px 18px", fontFamily:"'Cormorant Garamond',serif", fontSize:"15px", resize:"none", outline:"none", lineHeight:"1.5" }} onInput={e=>{e.target.style.height="auto";e.target.style.height=Math.min(e.target.scrollHeight,120)+"px";}}/>
          <button onClick={()=>sendMessage()} disabled={!input.trim()||loading} style={{ width:"48px", height:"48px", background:input.trim()&&!loading?"linear-gradient(135deg,#c9a84c,#a07830)":"rgba(201,168,76,0.1)", border:"none", cursor:"pointer", color:input.trim()&&!loading?"#0c0a08":"#4a3d28", fontSize:"18px" }}>→</button>
        </div>
      </div>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500&display=swap'); *{box-sizing:border-box;margin:0;padding:0;} textarea::placeholder{color:#4a3d28;}`}</style>
    </div>
  );
}