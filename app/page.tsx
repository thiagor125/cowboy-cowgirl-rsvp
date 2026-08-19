"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import {
  collection,
  doc,
  increment,
  onSnapshot,
  serverTimestamp,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import confetti from "canvas-confetti";
import { db } from "@/lib/firebase";

const EVENT_DATE = new Date("2026-10-24T12:00:00");
const RSVP_LIMIT = new Date("2026-09-17T23:59:59");

const ENDERECO = "";

const YOUTUBE_MUSIC_URL =
  "https://www.youtube.com/embed/eebLcRDgbBg?autoplay=1&loop=1&playlist=eebLcRDgbBg";

const DIAPER_SIZES = ["M", "G"] as const;

type DiaperSize = typeof DIAPER_SIZES[number];

type FraldasStats = Record<DiaperSize, number> & {
  total: number;
};

type Recadinho = {
  id: string;
  nome: string;
  mensagem: string;
  likes: number;
  updatedAtMs: number;
};

export default function Home() {
  const [timeLeft, setTimeLeft] = useState({
    dias: "0",
    horas: "0",
    minutos: "0",
    segundos: "0",
  });

  const [fraldasStats, setFraldasStats] = useState<FraldasStats>({
    M: 0,
    G: 0,
    total: 0,
  });

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [musicOpen, setMusicOpen] = useState(false);
  const [recadinhos, setRecadinhos] = useState<Recadinho[]>([]);

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
        M: Number(data?.M || 0),
        G: Number(data?.G || 0),
        total: Number(data?.total || 0),
      });
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const confirmacoesRef = collection(db, "confirmacoes");

    const unsubscribe = onSnapshot(
      confirmacoesRef,
      (snapshot) => {
        setRecadinhos(
          snapshot.docs
            .map((item) => {
              const data = item.data();
              const updatedAt = data.updatedAt?.toDate?.();
              const createdAt = data.createdAt?.toDate?.();
              const dataRecadinho =
                updatedAt instanceof Date
                  ? updatedAt
                  : createdAt instanceof Date
                  ? createdAt
                  : null;

              return {
                id: item.id,
                nome: String(data.nome || "Convidado"),
                mensagem: String(data.mensagem || "").trim(),
                likes: Number(data.likes || 0),
                updatedAtMs: dataRecadinho ? dataRecadinho.getTime() : 0,
              };
            })
            .filter((item) => item.mensagem.length > 0)
        );
      },
      (error) => {
        console.error("Erro ao carregar mensagens das confirmações:", error);
      }
    );

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
    const adultos = Number(form.adultos);
    const criancas = Number(form.criancas);
    const quantidade =
      form.presenca === "sim" ? Number(form.quantidadeFraldas) : 0;

    if (telefoneLimpo.length < 10) {
      alert("Digite um WhatsApp válido.");
      return;
    }

    if (form.presenca === "sim" && adultos + criancas < 1) {
      alert("Informe pelo menos uma pessoa para confirmar a presença.");
      return;
    }

    if (form.presenca === "sim" && quantidade < 1) {
      alert("Informe pelo menos um pacote de fraldas.");
      return;
    }

    setLoading(true);

    try {
      const batch = writeBatch(db);
      const confirmacaoRef = doc(db, "confirmacoes", telefoneLimpo);
      const resumoRef = doc(db, "resumos", "fraldas");

      batch.set(
        confirmacaoRef,
        {
          ...form,
          telefone: form.telefone,
          telefoneLimpo,
          adultos,
          criancas,
          quantidadeFraldas: quantidade,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      if (quantidade > 0) {
        batch.set(
          resumoRef,
          {
            [form.fralda]: increment(quantidade),
            total: increment(quantidade),
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      }

      await batch.commit();

      setSuccess(true);
      fireConfetti();
    } catch (error) {
      console.error(error);
      alert("Erro ao confirmar presença. Verifique o Firebase ou tente novamente.");
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

      <aside className="floating-invite">
        <Image
          src="/convite-bernardo-safari.png"
          alt="Convite para o chá de fraldas do Bernardo"
          width={620}
          height={900}
          priority
          className="invite-img"
        />
      </aside>

      <section className="content">
        <section className="hero-section">
          <p className="eyebrow">NOSSO PEQUENO EXPLORADOR ESTÁ CHEGANDO</p>

          <h1>
            Chá de Fraldas <span>do Bernardo</span>
          </h1>

          <p className="subtitle">
            Confirme sua presença e venha celebrar com a gente a chegada do
            nosso pequeno explorador.
          </p>

          <div className="actions">
            <a href="#confirmar" className="btn primary">Eu vou!</a>
            <a href="#local" className="btn green">Ver local</a>
          </div>

          <div className="event-list">
            <p>📅 24/10/2026 • a partir das 12h</p>
            <p>⏳ Confirmações até 17/09</p>
            <p>🦁 Tema safari</p>
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
          <p>O endereço será informado em breve.</p>

          <div className="map-box">
            <p>📍 {ENDERECO || "Localização em breve"}</p>
          </div>
        </section>

        <section className="section-card soft">
          <h2>Mensagem especial</h2>
          <p>
            Oi, pessoal! A mamãe e o papai vão fazer o chá de fraldas do
            Bernardo para celebrar a chegada do nosso pequeno explorador.
            Ficaremos muito felizes com sua presença!
          </p>
          <p>
            Quando eu chegar, meus dias serão cheios de amor, carinho e muitas
            fraldas para usar. 😍
          </p>
        </section>

        <section id="confirmar" className="section-card rsvp">
          <h2>Confirme sua presença</h2>
          <p className="center">Prazo para confirmação: <strong>17/09</strong></p>

          <DiaperSuggestion stats={fraldasStats} />

          {success ? (
            <div className="success-wrap">
              <div className="success">
                <div className="success-icon">🎉</div>
                <h3>Presença confirmada!</h3>
                <p>
                  Obrigado por confirmar. Estamos muito felizes em compartilhar
                  esse momento especial do Bernardo com você.
                </p>
                <strong>Esperamos você no dia 24 de outubro às 12h 🦁💚</strong>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <input required placeholder="Nome completo" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
              <input required placeholder="WhatsApp" value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} />

              <div className="grid-2">
                <label className="form-field">
                  <span>Adultos</span>
                  <input
                    type="number"
                    min="0"
                    value={form.adultos}
                    onChange={(e) =>
                      setForm({ ...form, adultos: e.target.value })
                    }
                  />
                </label>

                <label className="form-field">
                  <span>Crianças</span>
                  <input
                    type="number"
                    min="0"
                    value={form.criancas}
                    onChange={(e) =>
                      setForm({ ...form, criancas: e.target.value })
                    }
                  />
                </label>
              </div>

              <select value={form.presenca} onChange={(e) => setForm({ ...form, presenca: e.target.value })}>
                <option value="sim">Sim, vou comparecer</option>
                <option value="nao">Não poderei comparecer</option>
              </select>

              <div className="grid-2">
                <select value={form.fralda} onChange={(e) => setForm({ ...form, fralda: e.target.value })}>
                  <option value="M">Fralda M</option>
                  <option value="G">Fralda G</option>
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
          <p>Para quem quiser contribuir com o enxoval:</p>

          <div className="gift-highlight">
            <strong>👶 Fraldas M ou G para o Bernardo</strong>
            <span>
              + um mimo para o nosso pequeno explorador 💚
            </span>
          </div>
        </section>

        <RecadinhosSection recadinhos={recadinhos} />

        <footer>
          <strong>Esperamos você!</strong>
          <span>Com carinho, família do Bernardo 🦁🌿</span>

          <div className="whatsapp-footer">
            <a
              href="https://wa.me/5561998655774?text=Olá%20mamãe!%20Tenho%20uma%20dúvida%20sobre%20o%20chá%20de%20fraldas%20do%20Bernardo."
              target="_blank"
              rel="noopener noreferrer"
            >
              💚 WhatsApp da Mamãe
            </a>

            <a
              href="https://wa.me/5561996774753?text=Olá%20papai!%20Tenho%20uma%20dúvida%20sobre%20o%20chá%20de%20fraldas%20do%20Bernardo."
              target="_blank"
              rel="noopener noreferrer"
            >
              🦁 WhatsApp do Papai
            </a>
          </div>
        </footer>
      </section>
    </main>
  );
}

function RecadinhosSection({ recadinhos }: { recadinhos: Recadinho[] }) {
  const [ordem, setOrdem] = useState<"recentes" | "queridos">("recentes");
  const [curtidos, setCurtidos] = useState<string[]>([]);
  const [curtindo, setCurtindo] = useState<string | null>(null);

  useEffect(() => {
    try {
      const salvos = JSON.parse(
        window.localStorage.getItem("bernardo-recadinhos-curtidos") || "[]"
      );

      if (Array.isArray(salvos)) {
        setCurtidos(salvos.map(String));
      }
    } catch {
      setCurtidos([]);
    }
  }, []);

  const ordenados = [...recadinhos].sort((a, b) => {
    if (ordem === "queridos") {
      return b.likes - a.likes || b.updatedAtMs - a.updatedAtMs;
    }

    return b.updatedAtMs - a.updatedAtMs;
  });

  const destaque = ordenados[0];
  const demais = ordenados.slice(1);

  async function curtir(id: string) {
    if (curtidos.includes(id) || curtindo === id) {
      return;
    }

    setCurtindo(id);

    try {
      await updateDoc(doc(db, "confirmacoes", id), {
        likes: increment(1),
      });

      const novosCurtidos = [...curtidos, id];
      setCurtidos(novosCurtidos);
      window.localStorage.setItem(
        "bernardo-recadinhos-curtidos",
        JSON.stringify(novosCurtidos)
      );
    } catch (error) {
      console.error("Erro ao curtir recadinho:", error);
      alert("Não foi possível enviar o coração agora. Tente novamente.");
    } finally {
      setCurtindo(null);
    }
  }

  function dataRecadinho(timestamp: number) {
    if (!timestamp) {
      return "Recadinho especial";
    }

    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "short",
    })
      .format(new Date(timestamp))
      .replace(".", "");
  }

  function iniciais(nome: string) {
    return nome
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((parte) => parte[0]?.toUpperCase())
      .join("");
  }

  return (
    <section id="recadinhos" className="section-card recadinhos-section">
      <div className="recadinhos-heading">
        <div>
          <span className="recadinhos-kicker">💚 CARINHO QUE FICA GUARDADO</span>
          <h2>Recadinhos para o Bernardo</h2>
          <p>
            Mensagens deixadas pela família e pelos amigos para o nosso pequeno
            explorador.
          </p>
        </div>

        <div className="recadinhos-tabs" aria-label="Ordenar recadinhos">
          <button
            type="button"
            className={ordem === "recentes" ? "active" : ""}
            onClick={() => setOrdem("recentes")}
          >
            Mais recentes
          </button>
          <button
            type="button"
            className={ordem === "queridos" ? "active" : ""}
            onClick={() => setOrdem("queridos")}
          >
            ❤️ Mais queridos
          </button>
        </div>
      </div>

      {recadinhos.length === 0 ? (
        <div className="recadinhos-empty">
          <span>🦁💌</span>
          <strong>Ainda não há recadinhos para mostrar.</strong>
          <p>
            As mensagens preenchidas no formulário de confirmação aparecerão
            aqui automaticamente.
          </p>
          <a href="#confirmar">Deixar um recadinho</a>
        </div>
      ) : (
        <>
          {destaque && (
            <article className="recadinho-card recadinho-destaque">
              <div className="recadinho-top">
                <div className="recadinho-avatar">
                  {iniciais(destaque.nome) || "💚"}
                </div>
                <div>
                  <strong>{destaque.nome}</strong>
                  <span>⭐ Recadinho em destaque</span>
                </div>
                <time>{dataRecadinho(destaque.updatedAtMs)}</time>
              </div>

              <blockquote>“{destaque.mensagem}”</blockquote>

              <div className="recadinho-bottom">
                <span>🌿 🦁 🌿</span>
                <button
                  type="button"
                  className={curtidos.includes(destaque.id) ? "liked" : ""}
                  onClick={() => curtir(destaque.id)}
                  disabled={curtindo === destaque.id}
                  aria-label={`Deixar um coração no recadinho de ${destaque.nome}`}
                >
                  {curtidos.includes(destaque.id) ? "♥" : "♡"}{" "}
                  {destaque.likes}
                </button>
              </div>
            </article>
          )}

          {demais.length > 0 && (
            <div className="recadinhos-grid">
              {demais.map((recadinho) => (
                <article className="recadinho-card" key={recadinho.id}>
                  <div className="recadinho-top">
                    <div className="recadinho-avatar">
                      {iniciais(recadinho.nome) || "💚"}
                    </div>
                    <div>
                      <strong>{recadinho.nome}</strong>
                      <span>Recadinho com carinho</span>
                    </div>
                    <time>{dataRecadinho(recadinho.updatedAtMs)}</time>
                  </div>

                  <blockquote>“{recadinho.mensagem}”</blockquote>

                  <div className="recadinho-bottom">
                    <span>🌿 ♥ 🌿</span>
                    <button
                      type="button"
                      className={curtidos.includes(recadinho.id) ? "liked" : ""}
                      onClick={() => curtir(recadinho.id)}
                      disabled={curtindo === recadinho.id}
                      aria-label={`Deixar um coração no recadinho de ${recadinho.nome}`}
                    >
                      {curtidos.includes(recadinho.id) ? "♥" : "♡"}{" "}
                      {recadinho.likes}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </>
      )}
    </section>
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
  const max = Math.max(stats.M, stats.G, 1);

  return (
    <div className="diaper-panel">
      <div className="diaper-title">
        <span>🍼</span>
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
              <div className={`diaper-size ${index % 2 === 0 ? "green-size" : "brown-size"}`}>
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
        <strong>Escolha entre M ou G. Toda ajuda é muito bem-vinda 🦁🌿</strong>
      </div>

      <p className="diaper-live">🌿 Atualizado em tempo real conforme as confirmações.</p>
    </div>
  );
}
