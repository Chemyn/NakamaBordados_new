'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Message {
  role: 'bot' | 'user';
  text: string;
}

export default function WhatsAppButton() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'bot', text: '¡Oi, Nakama! 🍖 Soy Luffy, el guardián de este barco. ¡No pierdas tiempo escribiendo, mejor pícale a los botones para encontrar tu tesoro! 🏴‍☠️' }
  ]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const quickButtons = [
    "🔥 Ver Todo el Catálogo",
    "🪡 Ver Bordados",
    "👕 Ver Estampados",
    "✨ Edición Especial",
    "📐 Guía de Tallas",
    "🔍 Rastreo de Pedido",
    "❓ Preguntas Frecuentes",
    "📄 Aviso de Privacidad",
    "🏴‍☠️ Hablar con Tripulación"
  ];

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleQuickAction = (btn: string) => {
    // Add user message for visual feedback
    const userMsg: Message = { role: 'user', text: btn };
    setMessages(prev => [...prev, userMsg]);

    setTimeout(() => {
      if (btn.includes("Todo el Catálogo")) {
        router.push('/store');
        setIsOpen(false);
      } else if (btn.includes("Bordados")) {
        router.push('/store?category=bordados');
        setIsOpen(false);
      } else if (btn.includes("Estampados")) {
        router.push('/store?category=estampados');
        setIsOpen(false);
      } else if (btn.includes("Edición Especial")) {
        router.push('/store?category=edicion-especial');
        setIsOpen(false);
      } else if (btn.includes("Tallas")) {
        router.push('/guia-de-tallas');
        setIsOpen(false);
      } else if (btn.includes("Rastreo")) {
        router.push('/mi-cuenta');
        setIsOpen(false);
      } else if (btn.includes("Preguntas")) {
        router.push('/faq');
        setIsOpen(false);
      } else if (btn.includes("Privacidad")) {
        router.push('/aviso-de-privacidad');
        setIsOpen(false);
      } else if (btn.includes("Tripulación")) {
        window.open("https://wa.me/526622455087", "_blank");
      }
    }, 600);
  };

  return (
    <>
      {/* Botón Flotante */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="nk-whatsapp-btn"
        style={{ 
          background: isOpen ? 'var(--nk-primary)' : '#25D366',
          border: 'none',
          cursor: 'pointer',
          zIndex: 10000
        }}
        title="Hablar con Luffy"
      >
        <span className="material-icons-outlined" style={{ fontSize: '32px' }}>
          {isOpen ? 'close' : 'smart_toy'}
        </span>
      </button>

      {/* Chat Interface */}
      {isOpen && (
        <div className="nk-chatbot-window nk-manga-border">
          {/* Header */}
          <div className="nk-chatbot-header">
            <div className="nk-chatbot-avatar">
              <Image 
                src="https://nakamabordados.com/wp-content/uploads/2025/11/LOGO-NAKAMA-scaled-2048x926.png" 
                alt="Luffy" 
                width={40} 
                height={20} 
                style={{ objectFit: 'contain', marginTop: '10px' }}
              />
            </div>
            <div className="nk-chatbot-header-text">
              <h4>Luffy (Nakama-Bot)</h4>
              <span className="nk-status-tag">● NAVEGANDO POR EL MENÚ</span>
            </div>
          </div>

          {/* Body */}
          <div className="nk-chatbot-body">
            {messages.map((msg, i) => (
              <div key={i} className={`nk-chat-bubble ${msg.role}`}>
                {msg.text}
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          {/* New Button-Only Navigation Area */}
          <div className="nk-chatbot-navigation">
            <p className="nk-nav-hint">¿A dónde zarpamos, Nakama?</p>
            <div className="nk-chatbot-grid">
              {quickButtons.map((btn, i) => (
                <button 
                  key={i} 
                  onClick={() => handleQuickAction(btn)}
                  className="nk-chatbot-nav-btn nk-manga-border"
                >
                  {btn}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .nk-chatbot-window {
          position: fixed;
          bottom: 100px;
          right: 24px;
          width: 380px;
          height: 650px;
          max-height: calc(100dvh - 120px);
          background: var(--nk-bg-card);
          z-index: 9999;
          display: flex;
          flex-direction: column;
          box-shadow: var(--nk-manga-shadow-lg);
          animation: nkFadeIn 0.3s cubic-bezier(0.19, 1, 0.22, 1);
          overflow: hidden;
        }

        .nk-chatbot-header {
          background: var(--nk-navy);
          padding: 15px 20px;
          display: flex;
          align-items: center;
          gap: 12px;
          border-bottom: 3px solid var(--nk-primary);
          flex-shrink: 0;
        }

        .nk-chatbot-avatar {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: #fff;
          overflow: hidden;
          border: 2px solid var(--nk-primary);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .nk-chatbot-header-text h4 {
          color: #fff;
          margin: 0;
          font-family: 'Teko', sans-serif;
          font-size: 1.4rem;
          line-height: 1;
          letter-spacing: 1px;
        }

        .nk-status-tag {
          color: #25D366;
          font-size: 0.7rem;
          font-weight: 800;
          letter-spacing: 0.5px;
        }

        .nk-chatbot-body {
          flex: 1;
          overflow-y: auto;
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          background: var(--nk-bg-wrapper);
          scroll-behavior: smooth;
          border-bottom: 2px solid var(--nk-border);
        }

        .nk-chat-bubble {
          max-width: 85%;
          padding: 12px 16px;
          font-size: 0.95rem;
          font-weight: 600;
          line-height: 1.5;
          position: relative;
        }

        .nk-chat-bubble.bot {
          align-self: flex-start;
          background: var(--nk-bg-card);
          color: var(--nk-text-main);
          border: 2px solid var(--nk-border);
          box-shadow: 3px 3px 0px var(--nk-border);
          border-radius: 0 16px 16px 16px;
        }

        .nk-chat-bubble.user {
          align-self: flex-end;
          background: var(--nk-primary);
          color: #fff;
          border-radius: 16px 16px 0 16px;
          box-shadow: 3px 3px 0px rgba(0,0,0,0.15);
        }

        .nk-chatbot-navigation {
          padding: 20px;
          background: var(--nk-bg-card);
          flex-shrink: 0;
        }

        .nk-nav-hint {
          font-family: 'Teko', sans-serif;
          font-size: 1.1rem;
          font-weight: 800;
          margin-bottom: 15px;
          color: var(--nk-primary);
          text-transform: uppercase;
          text-align: center;
        }

        .nk-chatbot-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }

        .nk-chatbot-nav-btn {
          background: var(--nk-bg-wrapper);
          border: 2px solid var(--nk-border);
          padding: 10px;
          font-size: 0.75rem;
          font-weight: 800;
          cursor: pointer;
          transition: all 0.2s;
          color: var(--nk-text-main);
          text-transform: uppercase;
          text-align: center;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 44px;
        }

        .nk-chatbot-nav-btn:hover {
          background: var(--nk-primary);
          color: #fff;
          border-color: #000;
          transform: translate(-2px, -2px);
          box-shadow: 4px 4px 0px #000;
        }

        .nk-chatbot-nav-btn:active {
          transform: translate(0, 0);
          box-shadow: 0px 0px 0px #000;
        }

        /* Large buttons occupy full width */
        .nk-chatbot-nav-btn:first-child,
        .nk-chatbot-nav-btn:last-child {
          grid-column: span 2;
        }

        /* Responsive adjustments */
        @media (max-width: 768px) {
          .nk-chatbot-window {
            right: 0;
            bottom: 0;
            width: 100%;
            height: 85vh;
            max-height: 85vh;
            border-right: none;
            border-left: none;
            border-bottom: none;
          }
        }

        @keyframes nkFadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  );
}
