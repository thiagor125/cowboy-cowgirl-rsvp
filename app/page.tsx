"use client";

import Image from "next/image";
import { FirebaseError } from "firebase/app";
import { useEffect, useState } from "react";
import {
  addDoc,
  collection,
  doc,
  increment,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import confetti from "canvas-confetti";
import { db } from "@/lib/firebase";

const EVENT_DATE = new Date("2026-12-12T15:00:00-03:00");

const ENDERECO = "Salão de Festas Débora — QSC 19 Gleba L., Taguatinga - DF";
const GOOGLE_MAPS_URL =
  "https://www.google.com/maps/place/Sal%C3%A3o+de+festas+D%C3%A9bora/@-15.8546872,-48.0554569,959m/data=!3m2!1e3!4b1!4m6!3m5!1s0x935a336072fb292b:0xe2ad8d5f7aa58ac3!8m2!3d-15.8546872!4d-48.0554569!16s%2Fg%2F11qn0kwcd7?hl=pt-br&entry=ttu&g_ep=EgoyMDI2MDkwNi4wIKXMDSoASAFQAw%3D%3D";
const WAZE_URL =
  "https://www.waze.com/live-map/directions/salao-de-festas-debora-qsc-19-gleba-l.-taguatinga?to=place.w.204408425.2044346399.15980226";

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
  const [recadoNaoPublicado, setRecadoNaoPublicado] = useState(false);
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

  useEffect(() => {
    const updateCountdown = () => {
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
    };

    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);

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
    const recadinhosQuery = query(
      collection(db, "recadinhos"),
      orderBy("createdAt", "desc"),
      limit(24)
    );

    const unsubscribe = onSnapshot(
      recadinhosQuery,
      (snapshot) => {
        setRecadinhos(
          snapshot.docs
            .map((item) => {
              const data = item.data();
              const createdAt = data.createdAt?.toDate?.();

              return {
                id: item.id,
                nome: String(data.nome || "Convidado"),
                mensagem: String(data.mensagem || "").trim(),
                likes: Number(data.likes || 0),
                updatedAtMs:
                  createdAt instanceof Date ? createdAt.getTime() : 0,
              };
            })
            .filter((item) => item.mensagem.length > 0)
        );
      },
      (error) => {
        console.error("Erro ao carregar recadinhos:", error);
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

    if (!form.nome.trim() || form.nome.trim().length > 120 || form.mensagem.trim().length > 1000) {
      alert("Informe seu nome (até 120 caracteres) e um recado de até 1000 caracteres.");
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

      batch.set(confirmacaoRef, {
        ...form,
        telefone: form.telefone,
        telefoneLimpo,
        adultos,
        criancas,
        quantidadeFraldas: quantidade,
        updatedAt: serverTimestamp(),
      });

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

      const mensagemLimpa = form.mensagem.trim();

      if (mensagemLimpa) {
        try {
          await addDoc(collection(db, "recadinhos"), {
            nome: form.nome.trim(),
            mensagem: mensagemLimpa,
            likes: 0,
            createdAt: serverTimestamp(),
          });
        } catch (recadinhoError) {
          setRecadoNaoPublicado(true);
          console.error(
            "Presença confirmada, mas o recadinho não foi publicado:",
            recadinhoError
          );
        }
      }

      setSuccess(true);
      fireConfetti();
    } catch (error) {
      console.error(error);
      alert(
        error instanceof FirebaseError && error.code === "permission-denied"
          ? "Não foi possível registrar a confirmação. Se você já confirmou com este WhatsApp, envie seu recado na seção Recadinhos para o Lucca, sem confirmar novamente."
          : "Não foi possível confirmar agora. Verifique sua conexão e tente novamente."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="site">
      <PrinceScenery />

      <header className="site-header">
        <a className="family-mark" href="#inicio" aria-label="Chá do Lucca, início">
          <span aria-hidden="true">L</span><span>Chá do Lucca<small>Um pequeno príncipe. Muito amor.</small></span>
        </a>
        <nav aria-label="Navegação do convite">
          <a href="#local">O encontro</a>
          <a href="#presentes">Presentes</a>
          <a href="#confirmar" className="nav-rsvp">Confirmar presença <span aria-hidden="true">↗</span></a>
        </nav>
      </header>

      <aside className="floating-invite">
        <Image
          src="/convite-lucca.png"
          alt="Convite para o chá de fraldas do Lucca"
          width={1188}
          height={1670}
          sizes="(max-width: 980px) 92vw, 33vw"
          priority
          className="invite-img"
        />
      </aside>

      <section className="content">
        <section id="inicio" className="hero-section">
          <p className="eyebrow"><span aria-hidden="true">✦</span> UM NOVO AMOR ESTÁ CHEGANDO</p>

          <h1>
            <span className="hero-occasion">Chá de fraldas do</span>
            <span className="hero-name">Lucca<span className="name-star" aria-hidden="true">✧</span></span>
          </h1>

          <p className="subtitle">
            Um pequeno príncipe, um mundo de amor.
            Venha celebrar com a gente esse novo capítulo da nossa família.
          </p>

          <div className="actions">
            <a href="#confirmar" className="btn primary">Confirmar minha presença <span aria-hidden="true">↗</span></a>
            <a href="#local" className="btn secondary">Como chegar</a>
          </div>

          <div className="event-list">
            <div><small>GUARDE ESSA DATA</small><strong>12 de dezembro</strong><span>2026 · sábado</span></div>
            <div><small>NOSSO ENCONTRO</small><strong>Às 15 horas</strong><span>Uma tarde para celebrar</span></div>
          </div>

          <div className="countdown">
            <span>Falta pouco para esse abraço</span>

            <div className="countdown-grid">
              <TimeBox label="Dias" value={timeLeft.dias} />
              <TimeBox label="Horas" value={timeLeft.horas} />
              <TimeBox label="Min" value={timeLeft.minutos} />
              <TimeBox label="Seg" value={timeLeft.segundos} />
            </div>
          </div>
        </section>

        <section id="local" className="section-card location-card">
          <span className="section-kicker">01 / O ENCONTRO</span>
          <h2>Um lugar para celebrar</h2>
          <p>Toque no aplicativo que você prefere e abra a rota até o salão.</p>

          <div className="map-box">
            <div className="location-address">
              <span aria-hidden="true">📍</span>
              <address>{ENDERECO}</address>
            </div>
            <div className="map-actions">
              <a href={GOOGLE_MAPS_URL} target="_blank" rel="noreferrer" className="btn primary">
                🗺️ Google Maps
              </a>
              <a href={WAZE_URL} target="_blank" rel="noreferrer" className="btn waze">
                🚙 Waze
              </a>
            </div>
          </div>
        </section>

        <section className="section-card soft">
          <span className="section-kicker">COM AMOR, MAMÃE E PAPAI</span>
          <h2>A espera mais bonita</h2>
          <p>
            Estamos preparando o coração para receber o Lucca. E queremos
            dividir a alegria dessa espera com as pessoas que fazem parte da
            nossa história.
          </p>
          <p>
            Venha passar uma tarde com a gente, entre abraços, boas conversas
            e muito carinho pelo nosso pequeno príncipe.
          </p>
        </section>

        <section id="confirmar" className="section-card rsvp">
          <span className="section-kicker">02 / VOCÊ FAZ PARTE</span>
          <h2>Vamos celebrar juntos?</h2>
          <p>Preencha os dados abaixo para prepararmos tudo com carinho.</p>

          <p className="center">
            Já confirmou? <a href="#novo-recado">Envie apenas um recadinho aqui.</a>
          </p>
          <DiaperSuggestion stats={fraldasStats} />

          {success ? (
            <div className="success-wrap">
              <div className="success">
                <div className="success-icon">🎉</div>
                <h3>Presença confirmada!</h3>
                {recadoNaoPublicado && (
                  <p role="alert">
                    Seu recado não foi publicado. Copie a mensagem abaixo e tente
                    enviá-la na <a href="#novo-recado">seção de recadinhos</a>.
                    <span style={{ display: "block", whiteSpace: "pre-wrap" }}>{form.mensagem}</span>
                  </p>
                )}
                <p>
                  Obrigado por confirmar. Estamos muito felizes em compartilhar
                  esse momento especial do Lucca com você.
                </p>
                <strong>Esperamos você no dia 12 de dezembro às 15h 🧸🤎</strong>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <label className="form-field">
                <span>Nome completo</span>
                <input required maxLength={120} autoComplete="name" placeholder="Seu nome" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
              </label>
              <label className="form-field">
                <span>WhatsApp</span>
                <input required type="tel" inputMode="tel" autoComplete="tel" placeholder="(61) 99999-9999" value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} />
              </label>

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

              <label className="form-field">
                <span>Você poderá comparecer?</span>
                <select value={form.presenca} onChange={(e) => setForm({ ...form, presenca: e.target.value })}>
                  <option value="sim">Sim, vou comparecer</option>
                  <option value="nao">Não poderei comparecer</option>
                </select>
              </label>

              {form.presenca === "sim" && <div className="grid-2">
                <label className="form-field">
                  <span>Tamanho da fralda</span>
                  <select value={form.fralda} onChange={(e) => setForm({ ...form, fralda: e.target.value })}>
                    <option value="M">Fralda M</option>
                    <option value="G">Fralda G</option>
                  </select>
                </label>

                <label className="form-field">
                  <span>Quantidade de pacotes</span>
                  <input type="number" min="1" value={form.quantidadeFraldas} onChange={(e) => setForm({ ...form, quantidadeFraldas: e.target.value })} />
                </label>
              </div>}

              <label className="form-field">
                <span>Recadinho para o Lucca (opcional)</span>
                <textarea maxLength={1000} placeholder="Escreva uma mensagem carinhosa" value={form.mensagem} onChange={(e) => setForm({ ...form, mensagem: e.target.value })} />
              </label>

              <button disabled={loading}>
                {loading ? "Enviando..." : "Confirmar presença"}
              </button>
            </form>
          )}
        </section>

        <section id="presentes" className="section-card gifts">
          <span className="section-kicker">03 / PEQUENOS CARINHOS</span>
          <h2>O melhor presente é você</h2>

          <p>Sua presença já nos deixa muito felizes!</p>
          <p>Para quem quiser contribuir com o enxoval, sugerimos fraldas M ou G.</p>

          <div className="gift-highlight">
            <strong>Fraldas M ou G</strong>
            <span>
              Se quiser trazer um mimo, produtos de higiene para o Lucca serão
              muito bem-vindos. É opcional — sua presença é o mais importante!
            </span>
          </div>
        </section>

        <RecadinhosSection recadinhos={recadinhos} />

        <footer>
          <strong>Esperamos você!</strong>
          <span>Com carinho, família do Lucca 🧸✨</span>

          <div className="whatsapp-footer">
            <a
              href="https://wa.me/5561999949835?text=Olá%20mamãe!%20Tenho%20uma%20dúvida%20sobre%20o%20chá%20de%20fraldas%20do%20Lucca."
              target="_blank"
              rel="noopener noreferrer"
            >
              🤎 Mamãe Letícia · WhatsApp
            </a>

            <a
              href="https://wa.me/5561985166969?text=Olá%20papai!%20Tenho%20uma%20dúvida%20sobre%20o%20chá%20de%20fraldas%20do%20Lucca."
              target="_blank"
              rel="noopener noreferrer"
            >
              🧸 Papai Lorenzo · WhatsApp
            </a>
          </div>
        </footer>
      </section>
    </main>
  );
}

function PrinceScenery() {
  return (
    <div className="prince-scenery" aria-hidden="true">
      <span className="scenery-star star-one">✧</span>
      <span className="scenery-star star-two">✦</span>
      <span className="scenery-star star-three">♡</span>
    </div>
  );
}

function RecadinhosSection({ recadinhos }: { recadinhos: Recadinho[] }) {
  const [ordem, setOrdem] = useState<"recentes" | "queridos">("recentes");
  const [curtidos, setCurtidos] = useState<string[]>([]);
  const [curtindo, setCurtindo] = useState<string | null>(null);

  useEffect(() => {
    try {
      const salvos = JSON.parse(
        window.localStorage.getItem("lucca-recadinhos-curtidos") || "[]"
      );

      if (Array.isArray(salvos)) {
        queueMicrotask(() => setCurtidos(salvos.map(String)));
      }
    } catch {
      queueMicrotask(() => setCurtidos([]));
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
      await updateDoc(doc(db, "recadinhos", id), {
        likes: increment(1),
      });

      const novosCurtidos = [...curtidos, id];
      setCurtidos(novosCurtidos);
      window.localStorage.setItem(
        "lucca-recadinhos-curtidos",
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
          <span className="section-kicker">04 / PALAVRAS QUE ABRAÇAM</span>
          <h2>Recadinhos para o Lucca</h2>
          <p>
            Mensagens deixadas pela família e pelos amigos para o nosso pequeno
            príncipe.
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

      <RecadinhoForm />

      {recadinhos.length === 0 ? (
        <div className="recadinhos-empty">
          <span>🧸💌</span>
          <strong>Ainda não há recadinhos para mostrar.</strong>
          <p>
            As mensagens preenchidas no formulário de confirmação aparecerão
            aqui automaticamente.
          </p>
          <a href="#novo-recado">Deixar um recadinho</a>
        </div>
      ) : (
        <>
          {destaque && (
            <article className="recadinho-card recadinho-destaque">
              <div className="recadinho-top">
                <div className="recadinho-avatar">
                  {iniciais(destaque.nome) || "🤎"}
                </div>
                <div>
                  <strong>{destaque.nome}</strong>
                  <span>⭐ Recadinho em destaque</span>
                </div>
                <time>{dataRecadinho(destaque.updatedAtMs)}</time>
              </div>

              <blockquote>“{destaque.mensagem}”</blockquote>

              <div className="recadinho-bottom">
                <span>✨ 🧸 ✨</span>
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
                      {iniciais(recadinho.nome) || "🤎"}
                    </div>
                    <div>
                      <strong>{recadinho.nome}</strong>
                      <span>Recadinho com carinho</span>
                    </div>
                    <time>{dataRecadinho(recadinho.updatedAtMs)}</time>
                  </div>

                  <blockquote>“{recadinho.mensagem}”</blockquote>

                  <div className="recadinho-bottom">
                    <span>✨ ♥ ✨</span>
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
        <div>
          <h3>Uma ajudinha para o enxoval</h3>
          <p>Fraldas M ou G: escolha o tamanho que preferir.</p>
        </div>
      </div>
      <div className="diaper-options">
        {DIAPER_SIZES.map((size) => (
          <div className="diaper-option" key={size}>
            <div><span className="diaper-letter">{size}</span><span><strong>Fralda {size}</strong><small>{stats[size]} pacotes escolhidos</small></span></div>
            <progress value={stats[size]} max={max} aria-label={`Pacotes de fraldas ${size} já escolhidos`} />
          </div>
        ))}
      </div>
      <p className="diaper-live">Atualizado com carinho a cada confirmação.</p>
    </div>
  );
}

function RecadinhoForm() {
  const [nome, setNome] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const [enviado, setEnviado] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (enviando) return;
    setErro("");
    setEnviado(false);

    const nomeLimpo = nome.trim();
    const mensagemLimpa = mensagem.trim();
    if (!nomeLimpo || nomeLimpo.length > 120 || !mensagemLimpa || mensagemLimpa.length > 1000) {
      setErro("Preencha seu nome (até 120 caracteres) e o recado (até 1000 caracteres).");
      return;
    }

    setEnviando(true);
    try {
      await addDoc(collection(db, "recadinhos"), {
        nome: nomeLimpo,
        mensagem: mensagemLimpa,
        likes: 0,
        createdAt: serverTimestamp(),
      });
      setMensagem("");
      setEnviado(true);
    } catch (error) {
      console.error("Erro ao publicar recadinho:", error);
      setErro("Não foi possível publicar seu recado. Sua mensagem foi mantida; tente novamente.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form id="novo-recado" className="rsvp" onSubmit={enviar}>
      <h3>Deixe um recadinho</h3>
      <p>Você pode enviar uma mensagem mesmo se já confirmou sua presença. O nome e o recado aparecerão neste mural público.</p>
      <label className="form-field">
        <span>Seu nome</span>
        <input required maxLength={120} autoComplete="name" value={nome} onChange={(e) => setNome(e.target.value)} disabled={enviando} />
      </label>
      <label className="form-field">
        <span>Recadinho para o Lucca</span>
        <textarea required maxLength={1000} value={mensagem} onChange={(e) => setMensagem(e.target.value)} disabled={enviando} />
      </label>
      {erro && <p role="alert">{erro}</p>}
      {enviado && <p role="status">Recadinho publicado com carinho! 🤎</p>}
      <button type="submit" disabled={enviando}>{enviando ? "Enviando..." : "Enviar recadinho"}</button>
    </form>
  );
}
