"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

const EVENT_DATE = new Date("2026-07-11T17:00:00");
const RSVP_LIMIT = new Date("2026-06-20T23:59:59");

export default function Home() {
  const [timeLeft, setTimeLeft] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

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
        setTimeLeft("É hoje!");
        return;
      }

      const d = Math.floor(diff / (1000 * 60 * 60 * 24));
      const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const m = Math.floor((diff / (1000 * 60)) % 60);
      const s = Math.floor((diff / 1000) % 60);

      setTimeLeft(`${d} dias • ${h}h • ${m}m • ${s}s`);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (prazoEncerrado) {
      alert("Prazo encerrado.");
      return;
    }

    setLoading(true);

    try {
      await addDoc(collection(db, "confirmacoes"), {
        ...form,
        adultos: Number(form.adultos),
        criancas: Number(form.criancas),
        quantidadeFraldas: Number(form.quantidadeFraldas),
        createdAt: serverTimestamp(),
      });

      setSuccess(true);
    } catch (error) {
      console.error(error);
      alert("Erro ao salvar. Verifique as regras do Firebase.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="site">
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
            <strong>{timeLeft}</strong>
          </div>
        </section>

        <section id="local" className="section-card">
          <h2>Localização</h2>
          <p>
            Coloque aqui o endereço completo do evento para seus convidados.
          </p>

          <div className="map-box">
            <p>📍 Rua Exemplo, 123 - Cidade/UF</p>
            <a href="https://maps.google.com" target="_blank">
              Abrir no Google Maps
            </a>
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
          <p className="center">
            Prazo para confirmação: <strong>20/06</strong>
          </p>

          {success ? (
            <div className="success-wrap">
              <div className="confetti">
                <span>💕</span>
                <span>💙</span>
                <span>🤠</span>
                <span>⭐</span>
                <span>🎁</span>
                <span>👶</span>
              </div>

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
              <input
                required
                placeholder="Nome completo"
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
              />

              <input
                required
                placeholder="WhatsApp"
                value={form.telefone}
                onChange={(e) => setForm({ ...form, telefone: e.target.value })}
              />

              <div className="grid-2">
                <input
                  type="number"
                  min="0"
                  placeholder="Adultos"
                  value={form.adultos}
                  onChange={(e) => setForm({ ...form, adultos: e.target.value })}
                />

                <input
                  type="number"
                  min="0"
                  placeholder="Crianças"
                  value={form.criancas}
                  onChange={(e) => setForm({ ...form, criancas: e.target.value })}
                />
              </div>

              <select
                value={form.presenca}
                onChange={(e) => setForm({ ...form, presenca: e.target.value })}
              >
                <option value="sim">Sim, vou comparecer</option>
                <option value="nao">Não poderei comparecer</option>
              </select>

              <div className="grid-2">
                <select
                  value={form.fralda}
                  onChange={(e) => setForm({ ...form, fralda: e.target.value })}
                >
                  <option value="RN">Fralda RN</option>
                  <option value="P">Fralda P</option>
                  <option value="M">Fralda M</option>
                  <option value="G">Fralda G</option>
                  <option value="XG">Fralda XG</option>
                </select>

                <input
                  type="number"
                  min="0"
                  placeholder="Quantidade de pacotes"
                  value={form.quantidadeFraldas}
                  onChange={(e) =>
                    setForm({ ...form, quantidadeFraldas: e.target.value })
                  }
                />
              </div>

              <textarea
                placeholder="Mensagem para o bebê/família"
                value={form.mensagem}
                onChange={(e) => setForm({ ...form, mensagem: e.target.value })}
              />

              <button disabled={loading || prazoEncerrado}>
                {prazoEncerrado
                  ? "Prazo encerrado"
                  : loading
                  ? "Enviando..."
                  : "Confirmar presença"}
              </button>
            </form>
          )}
        </section>

        <section className="section-card gifts">
          <h2>Presentes</h2>
          <div className="gift-icon">🎁</div>

          <p>
            Sua presença já nos deixa muito felizes!
          </p>

          <p>
            Caso deseje nos presentear, sugerimos:
          </p>

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
          <span>Com carinho, família do bebê 💙💕</span>
        </footer>
      </section>
    </main>
  );
}
