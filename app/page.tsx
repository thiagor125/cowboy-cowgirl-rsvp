"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import {
  doc,
  increment,
  onSnapshot,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";
import confetti from "canvas-confetti";
import { db } from "@/lib/firebase";

const EVENT_DATE = new Date("2026-07-11T17:00:00");
const RSVP_LIMIT = new Date("2026-06-20T23:59:59");

const ENDERECO = "Rua Exemplo, 123 - Cidade/UF";
const GOOGLE_MAPS_URL = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(ENDERECO)}`;
const WAZE_URL = `https://waze.com/ul?q=${encodeURIComponent(ENDERECO)}&navigate=yes`;

const YOUTUBE_MUSIC_URL =
  "https://www.youtube.com/embed/eebLcRDgbBg?autoplay=1&loop=1&playlist=eebLcRDgbBg";

const DIAPER_SIZES = ["RN", "P", "M", "G", "XG"] as const;

type DiaperSize = typeof DIAPER_SIZES[number];

type FraldasStats = Record<DiaperSize, number> & {
  total: number;
};

export default function Home() {
  const [timeLeft, setTimeLeft] = useState({
    dias: "0",
    horas: "0",
    minutos: "0",
    segundos: "0",
  });

  const [fraldasStats, setFraldasStats] = useState<FraldasStats>({
    RN: 0,
    P: 0,
    M: 0,
    G: 0,
    XG: 0,
    total: 0,
  });

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [musicOpen, setMusicOpen] = useState(false);

  const [form, setForm] = useState({
    nome: "",
    telefone: "",
    adultos: "1",
    criancas: "0",
    presenca: "sim",
    fralda: "M",
    quantidadeFraldas: "1",
    mensagem: "",
  });

  const prazoEncerrado = new Date() > RSVP_LIMIT;

  useEffect(() => {
    const timer = setInterval(() => {
      const diff = EVENT_DATE.getTime() - new Date().getTime();

      if (diff <= 0) {
        setTimeLeft({ dias: "0", horas: "0", minutos: "0", segundos: "0" });
        return;
      }

      setTimeLeft({
        dias: String(Math.floor(diff / (1000 * 60 * 60 * 24))),
        horas: String(Math.floor((diff / (1000 * 60 * 60)) % 24)).padStart(2, "0"),
        minutos: String(Math.floor((diff / (1000 * 60)) % 60)).padStart(2, "0"),
        segundos: String(Math.floor((diff / 1000) % 60)).padStart(2, "0"),
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const resumoRef = doc(db, "resumos", "fraldas");

    const unsubscribe = onSnapshot(resumoRef, (snapshot) => {
      const data = snapshot.data();

      setFraldasStats({
        RN: Number(data?.RN || 0),
        P: Number(data?.P || 0),
        M: Number(data?.M || 0),
        G: Number(data?.G || 0),
        XG: Number(data?.XG || 0),
        total: Number(data?.total || 0),
      });
    });

    return () => unsubscribe();
  }, []);

  function fireConfetti() {
    const duration = 3000;
    const end = Date.now() + duration;

    confetti({
      particleCount: 180,
      spread: 120,
      origin: { y: 0.65 },
    });

    const interval = setInterval(() => {
      if (Date.now() > end) {
        clearInterval(interval);
        return;
      }

      confetti({
        particleCount: 12,
        angle: 60,
        spread: 70,
        origin: { x: 0 },
      });

      confetti({
        particleCount: 12,
        angle: 120,
        spread: 70,
        origin: { x: 1 },
      });
    }, 180);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (prazoEncerrado) {
      alert("Prazo encerrado.");
      return;
    }

    const telefoneLimpo = form.telefone.replace(/\D/g, "");

    if (telefoneLimpo.length < 10) {
      alert("Digite um WhatsApp válido.");
      return;
    }

    setLoading(true);

    try {
      await runTransaction(db, async (transaction) => {
        const confirmacaoRef = doc(db, "confirmacoes", telefoneLimpo);
        const resumoRef = doc(db, "resumos", "fraldas");

        const confirmacaoExiste = await transaction.get(confirmacaoRef);

        if (confirmacaoExiste.exists()) {
          throw new Error("duplicado");
        }

        const quantidade =
          form.presenca === "sim" ? Number(form.quantidadeFraldas) : 0;

        transaction.set(confirmacaoRef, {
          ...form,
          telefone: form.telefone,
          telefoneLimpo,
          adultos: Number(form.adultos),
          criancas: Number(form.criancas),
          quantidadeFraldas: quantidade,
          createdAt: serverTimestamp(),
        });

        if (quantidade > 0) {
          transaction.set(
            resumoRef,
            {
              [form.fralda]: increment(quantidade),
              total: increment(quantidade),
              updatedAt: serverTimestamp(),
            },
            { merge: true }
          );
        }
      });

      setSuccess(true);
      fireConfetti();
    } catch (error) {
      console.error(error);
      alert("Este WhatsApp já confirmou presença ou houve erro ao salvar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="site">
      <button type="button" onClick={() => setMusicOpen(!musicOpen)} className="music-btn">
        {musicOpen ? "🔇 Parar música" : "🎵 Tocar música"}
      </button>

      {musicOpen && (
        <div className="music-player">
          <iframe
            src={YOUTUBE_MUSIC_URL}
            title="Música"
            allow="autoplay; encrypted-media"
            allowFullScreen
          />
        </div>
      )}

      <div className="decor decor1">?</div>
      <div className="decor decor2">?</div>
      <div className="decor decor3">?</div>

      <aside className="floating-invite">
        <Image
          src="/convite1.jpg"
          alt="Convite Cowboy ou Cowgirl"
          width={620}
          height={900}
          priority
          className="invite-img"
        />
      </aside>

      <section className="content">
        <section className="hero-section">
          <p className="eyebrow">CHÁ REVELAÇÃO + CHÁ DE FRALDA</p>

          <h1>
            Cowboy <span>ou Cowgirl?</span>
          </h1>

          <p className="subtitle">
            Confirme sua presença e venha descobrir com a gente se é um
            peãozinho ou uma princesinha.
          </p>

          <div className="actions">
            <a href="#confirmar" className="btn pink">Eu vou!</a>
            <a href="#local" className="btn green">Ver local</a>
          </div>

          <div className="event-list">
            <p>📅 11/07/2026 • a partir das 17:00</p>
            <p>⏳ Confirmações até 20/06</p>
            <p>🤠 Tema cowboy/cowgirl — azul, rosa, jeans e chapéu</p>
          </div>

          <div className="countdown">
            <span>Contagem regressiva</span>

            <div className="countdown-grid">
              <TimeBox label="Dias" value={timeLeft.dias} />
              <TimeBox label="Horas" value={timeLeft.horas} />
              <TimeBox label="Min" value={timeLeft.minutos} />
              <TimeBox label="Seg" value={timeLeft.segundos} />
            </div>
          </div>
        </section>

        <section id="local" className="section-card">
          <h2>Localização</h2>
          <p>Coloque aqui o endereço completo do evento para seus convidados.</p>

          <div className="map-box">
            <p>📍 {ENDERECO}</p>

            <div className="map-actions">
              <a href={GOOGLE_MAPS_URL} target="_blank" rel="noopener noreferrer">
                Abrir no Google Maps
              </a>
              <a href={WAZE_URL} target="_blank" rel="noopener noreferrer" className="waze">
                Abrir no Waze
              </a>
            </div>
          </div>
        </section>

        <section className="section-card soft">
          <h2>Mensagem especial</h2>
          <p>
            Oi pessoal! A mamãe e o papai vão fazer um chá revelação para
            comemorar a chegada do nosso bebê. Ficaremos muito felizes com sua
            presença!
          </p>
          <p>
            Quando eu chegar, meus dias serão cheios de muito amor, carinho e
            muita fralda para gastar. 😍
          </p>
        </section>

        <section id="confirmar" className="section-card rsvp">
          <h2>Confirme sua presença</h2>
          <p className="center">Prazo para confirmação: <strong>20/06</strong></p>

          <DiaperSuggestion stats={fraldasStats} />

          {success ? (
            <div className="success-wrap">
              <div className="success">
                <div className="success-icon">🎉</div>
                <h3>Presença confirmada!</h3>
                <p>
                  Obrigado por confirmar. Estamos muito felizes em compartilhar
                  esse momento especial com você.
                </p>
                <strong>Esperamos você no dia 11 de Julho às 17:00 🤠💕</strong>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <input required placeholder="Nome completo" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
              <input required placeholder="WhatsApp" value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} />

              <div className="grid-2">
                <input type="number" min="0" placeholder="Adultos" value={form.adultos} onChange={(e) => setForm({ ...form, adultos: e.target.value })} />
                <input type="number" min="0" placeholder="Crianças" value={form.criancas} onChange={(e) => setForm({ ...form, criancas: e.target.value })} />
              </div>

              <select value={form.presenca} onChange={(e) => setForm({ ...form, presenca: e.target.value })}>
                <option value="sim">Sim, vou comparecer</option>
                <option value="nao">Não poderei comparecer</option>
              </select>

              <div className="grid-2">
                <select value={form.fralda} onChange={(e) => setForm({ ...form, fralda: e.target.value })}>
                  <option value="RN">Fralda RN</option>
                  <option value="P">Fralda P</option>
                  <option value="M">Fralda M</option>
                  <option value="G">Fralda G</option>
                  <option value="XG">Fralda XG</option>
                </select>

                <input type="number" min="0" placeholder="Quantidade de pacotes" value={form.quantidadeFraldas} onChange={(e) => setForm({ ...form, quantidadeFraldas: e.target.value })} />
              </div>

              <textarea placeholder="Mensagem para o bebê/família" value={form.mensagem} onChange={(e) => setForm({ ...form, mensagem: e.target.value })} />

              <button disabled={loading || prazoEncerrado}>
                {prazoEncerrado ? "Prazo encerrado" : loading ? "Enviando..." : "Confirmar presença"}
              </button>
            </form>
          )}
        </section>

        <section className="section-card gifts">
          <h2>Presentes</h2>
          <div className="gift-icon">🎁</div>

          <p>Sua presença já nos deixa muito felizes!</p>
          <p>Caso deseje nos presentear, sugerimos:</p>

          <div className="gift-highlight">
            <strong>👶 Fraldas + Mimo para o Bebê</strong>
            <span>
              Levar fraldas no tamanho escolhido no formulário + um mimo
              especial para o bebê.
            </span>
          </div>
        </section>

        <footer>
          <strong>Esperamos você!</strong>
          <span>Com carinho, família do bebê 🤠💚💕</span>

          <div className="whatsapp-footer">
            <a
              href="https://wa.me/5561998655774?text=Olá%20mamãe!%20Tenho%20uma%20dúvida%20sobre%20o%20chá%20revelação."
              target="_blank"
              rel="noopener noreferrer"
            >
              💚 WhatsApp da Mamãe
            </a>

            <a
              href="https://wa.me/5561996774753?text=Olá%20papai!%20Tenho%20uma%20dúvida%20sobre%20o%20chá%20revelação."
              target="_blank"
              rel="noopener noreferrer"
            >
              🤠 WhatsApp do Papai
            </a>
          </div>
        </footer>
      </section>
    </main>
  );
}

function TimeBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="time-box">
      <strong>{value}</strong>
      <small>{label}</small>
    </div>
  );
}

function DiaperSuggestion({ stats }: { stats: FraldasStats }) {
  const max = Math.max(stats.RN, stats.P, stats.M, stats.G, stats.XG, 1);

  return (
    <div className="diaper-panel">
      <div className="diaper-title">
        <span>🤠</span>
        <div>
          <h3>Sugestão de fraldas</h3>
          <p>Veja os tamanhos já escolhidos e escolha o que achar melhor.</p>
        </div>
      </div>

      <div className="diaper-board">
        {DIAPER_SIZES.map((size, index) => {
          const count = stats[size];
          const filled = Math.max(0, Math.round((count / max) * 10));

          return (
            <div className="diaper-row" key={size}>
              <div className={`diaper-size ${index % 2 === 0 ? "green-size" : "pink-size"}`}>
                {size}
              </div>

              <div className="diaper-icons">
                {Array.from({ length: 10 }).map((_, iconIndex) => (
                  <span
                    key={iconIndex}
                    className={iconIndex < filled ? "diaper-full" : "diaper-empty"}
                  >
                    🍼
                  </span>
                ))}
              </div>

              <div className="diaper-status">
                {count === max && count > 0
                  ? "Mais escolhido ✨"
                  : count === 0
                  ? "Poucas escolhas"
                  : "Em andamento"}
              </div>
            </div>
          );
        })}
      </div>

      <div className="diaper-note">
        <span>🍼 Cada ícone representa a quantidade relativa de pacotes já escolhidos.</span>
        <strong>Leve o tamanho que quiser! Toda ajuda é muito bem-vinda 🤠💕</strong>
      </div>

      <p className="diaper-live">🌿 Atualizado em tempo real conforme as confirmações.</p>
    </div>
  );
}
