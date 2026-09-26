"use client"

import React, { useState } from "react"
import { MessageSquare, X, Send, ShieldCheck, Headphones } from "lucide-react"

export function FloatingSupportChat() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Array<{ sender: "bot" | "user"; text: string }>>([
    {
      sender: "bot",
      text: "Hello! Welcome to Prime Vault Bank Concierge. How can we assist with your account today?",
    },
  ])
  const [inputVal, setInputVal] = useState("")

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputVal.trim()) return

    const userText = inputVal.trim()
    setMessages((prev) => [...prev, { sender: "user", text: userText }])
    setInputVal("")

    setTimeout(() => {
      let reply = "Our client operations team has logged your inquiry. To complete your account activation, please ensure your KYC identity verification is submitted."
      if (userText.toLowerCase().includes("kyc") || userText.toLowerCase().includes("verify")) {
        reply = "You can submit your identity document and a live facial selfie on our Verification page. Verification typically processes within minutes."
      } else if (userText.toLowerCase().includes("deposit") || userText.toLowerCase().includes("money")) {
        reply = "Once your account is verified from Non-Active to Active, you can deposit via Wire or Internal Transfer."
      }
      setMessages((prev) => [...prev, { sender: "bot", text: reply }])
    }, 600)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-40 flex size-14 items-center justify-center rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-xl shadow-blue-600/25 hover:scale-105 active:scale-95 transition-all"
        aria-label="PrimeVault Support Concierge"
      >
        <MessageSquare className="size-6 fill-current" />
      </button>

      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl text-slate-800 animate-in slide-in-from-bottom-5 duration-200">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="flex size-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <Headphones className="size-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">PrimeVault Concierge</h4>
                <span className="flex items-center gap-1 text-[11px] text-emerald-600 font-semibold">
                  <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" /> Available 24/7
                </span>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-slate-600 p-1 transition-colors"
            >
              <X className="size-4" />
            </button>
          </div>

          <div className="my-3 max-h-64 overflow-y-auto space-y-2.5 pr-1 text-xs">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex ${m.sender === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-xl px-3 py-2 ${
                    m.sender === "user"
                      ? "bg-blue-600 text-white font-medium shadow-sm"
                      : "bg-slate-100 text-slate-800 border border-slate-200/80"
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}
          </div>

          <form onSubmit={handleSend} className="flex items-center gap-1.5 pt-2 border-t border-slate-100">
            <input
              type="text"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              placeholder="Ask about KYC, deposits, limits…"
              className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 placeholder-slate-400 outline-none focus:border-blue-600 focus:bg-white transition-all"
            />
            <button
              type="submit"
              className="flex size-8 items-center justify-center rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-sm"
            >
              <Send className="size-3.5" />
            </button>
          </form>
        </div>
      )}
    </>
  )
}
