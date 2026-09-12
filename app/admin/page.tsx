"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut, User } from "firebase/auth";
import { collection, onSnapshot } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import "./admin.css";

type Confirmacao = {
  id: string;
  nome: string;
  telefone: string;
  presenca: "sim" | "nao";
  adultos: number;
  criancas: number;
  fralda: "M" | "G" | "-";
  quantidadeFraldas: number;
  mensagem: string;
  atualizadoEm: number;
};

const numero = (valor: unknown) => Math.max(0, Number(valor) || 0);
const ADMIN_EMAILS = ["thiagor402@gmail.com", "amandarincon2002@gmail.com"];
const linkWhatsApp = (telefone: string) => {
  const digitos = telefone.replace(/\D/g, "");
  return `https://wa.me/${digitos.startsWith("55") ? digitos : `55${digitos}`}`;
};

export default function AdminPage() {
  const [usuario, setUsuario] = useState<User | null>(null);
  const [carregandoAuth, setCarregandoAuth] = useState(true);
  const [erroLogin, setErroLogin] = useState("");
  const [entrando, setEntrando] = useState(false);
  const [confirmacoes, setConfirmacoes] = useState<Confirmacao[]>([]);
  const [erroDados, setErroDados] = useState("");
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<"todos" | "sim" | "nao">("todos");

  useEffect(() => onAuthStateChanged(auth, async (user) => {
    const emailUsuario = user?.email?.toLowerCase();
    if (user && (!emailUsuario || !ADMIN_EMAILS.includes(emailUsuario))) {
      setErroLogin("Este e-mail não está autorizado a acessar o painel.");
      await signOut(auth);
      setUsuario(null);
    } else {
      setUsuario(user);
    }
    setCarregandoAuth(false);
  }), []);

  useEffect(() => {
    if (!usuario) {
      return;
    }

    return onSnapshot(
      collection(db, "confirmacoes"),
      (snapshot) => {
        const itens = snapshot.docs.map((documento) => {
          const data = documento.data();
          const atualizado = data.updatedAt?.toDate?.();

          return {
            id: documento.id,
            nome: String(data.nome || "Convidado"),
            telefone: String(data.telefone || data.telefoneLimpo || ""),
            presenca: data.presenca === "nao" ? "nao" as const : "sim" as const,
            adultos: numero(data.adultos),
            criancas: numero(data.criancas),
            fralda: data.presenca === "nao" ? "-" as const : data.fralda === "G" ? "G" as const : "M" as const,
            quantidadeFraldas: data.presenca === "nao" ? 0 : numero(data.quantidadeFraldas),
            mensagem: String(data.mensagem || "").trim(),
            atualizadoEm: atualizado instanceof Date ? atualizado.getTime() : 0,
          };
        });

        itens.sort((a, b) => b.atualizadoEm - a.atualizadoEm || a.nome.localeCompare(b.nome));
        setConfirmacoes(itens);
        setErroDados("");
      },
      () => setErroDados("Seu usuário ainda não tem permissão para ler as confirmações no Firestore.")
    );
  }, [usuario]);

  const resumo = useMemo(() => confirmacoes.reduce((total, item) => {
    if (item.presenca === "sim") {
      total.confirmados += 1;
      total.adultos += item.adultos;
      total.criancas += item.criancas;
      total.pessoas += item.adultos + item.criancas;
      total.fraldas += item.quantidadeFraldas;
      if (item.fralda === "M") total.fraldasM += item.quantidadeFraldas;
      if (item.fralda === "G") total.fraldasG += item.quantidadeFraldas;
    } else {
      total.ausentes += 1;
    }
    return total;
  }, { confirmados: 0, ausentes: 0, pessoas: 0, adultos: 0, criancas: 0, fraldas: 0, fraldasM: 0, fraldasG: 0 }), [confirmacoes]);

  const lista = useMemo(() => {
    const termo = busca.trim().toLocaleLowerCase("pt-BR");
    return confirmacoes.filter((item) => {
      const correspondeFiltro = filtro === "todos" || item.presenca === filtro;
      const correspondeBusca = !termo || `${item.nome} ${item.telefone}`.toLocaleLowerCase("pt-BR").includes(termo);
      return correspondeFiltro && correspondeBusca;
    });
  }, [busca, confirmacoes, filtro]);

  async function entrarComGoogle() {
    setEntrando(true);
    setErroLogin("");
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      await signInWithPopup(auth, provider);
    } catch {
      setErroLogin("Não foi possível entrar com o Google. Tente novamente.");
    } finally {
      setEntrando(false);
    }
  }

  function exportarCsv() {
    const cabecalho = ["Nome", "WhatsApp", "Resposta", "Adultos", "Crianças", "Total", "Fralda", "Pacotes", "Mensagem"];
    const linhas = lista.map((item) => [
      item.nome, item.telefone, item.presenca === "sim" ? "Confirmado" : "Não vai",
      item.adultos, item.criancas, item.adultos + item.criancas,
      item.fralda, item.quantidadeFraldas, item.mensagem,
    ]);
    const escapar = (valor: string | number) => `"${String(valor).replaceAll('"', '""')}"`;
    const csv = [cabecalho, ...linhas].map((linha) => linha.map(escapar).join(";")).join("\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" }));
    link.download = `confirmacoes-bernardo-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  if (carregandoAuth) return <main className="admin-loading">Carregando painel…</main>;

  if (!usuario) {
    return <main className="admin-login-page">
      <section className="admin-login-card">
        <div className="admin-brand"><span>🦁</span><div><small>CHÁ DO BERNARDO</small><h1>Painel da família</h1></div></div>
        <p>Acesso reservado para acompanhar as confirmações dos convidados.</p>
        <div className="admin-login-form">
          {erroLogin && <p className="admin-error" role="alert">{erroLogin}</p>}
          <button type="button" onClick={entrarComGoogle} disabled={entrando}>{entrando ? "Entrando…" : "Entrar com Google"}</button>
          <small>Acesso permitido somente para os e-mails cadastrados da família.</small>
        </div>
        <Link href="/">← Voltar para o convite</Link>
      </section>
    </main>;
  }

  return <main className="admin-page">
    <header className="admin-header">
      <div><small>🦁 CHÁ DE FRALDAS DO BERNARDO</small><h1>Confirmações</h1><p>Visão geral da lista de convidados, acompanhantes e fraldas.</p></div>
      <div className="admin-user"><span>{usuario.email}</span><button onClick={() => signOut(auth)}>Sair</button></div>
    </header>

    <section className="admin-stats" aria-label="Resumo das confirmações">
      <Stat icon="✅" label="Confirmados" value={resumo.confirmados} />
      <Stat icon="👥" label="Total de pessoas" value={resumo.pessoas} detail={`${resumo.adultos} adultos · ${resumo.criancas} crianças`} />
      <Stat icon="🍼" label="Pacotes de fraldas" value={resumo.fraldas} detail={`${resumo.fraldasM} M · ${resumo.fraldasG} G`} />
      <Stat icon="💌" label="Não poderão ir" value={resumo.ausentes} />
    </section>

    <section className="admin-panel">
      <div className="admin-toolbar">
        <div><h2>Lista de convidados</h2><span>{lista.length} resposta{lista.length === 1 ? "" : "s"}</span></div>
        <div className="admin-actions">
          <label className="admin-search"><span>⌕</span><input aria-label="Buscar convidado" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar nome ou telefone" /></label>
          <select aria-label="Filtrar respostas" value={filtro} onChange={(e) => setFiltro(e.target.value as typeof filtro)}>
            <option value="todos">Todos</option><option value="sim">Confirmados</option><option value="nao">Não irão</option>
          </select>
          <button onClick={exportarCsv} disabled={!lista.length}>↓ Exportar CSV</button>
        </div>
      </div>

      {erroDados ? <div className="admin-empty admin-error" role="alert">{erroDados}</div> : lista.length === 0 ? <div className="admin-empty">Nenhuma confirmação encontrada.</div> : <div className="admin-table-wrap">
        <table><thead><tr><th>Convidado</th><th>Resposta</th><th>Pessoas</th><th>Fraldas</th><th>Recadinho</th></tr></thead>
          <tbody>{lista.map((item) => <tr key={item.id}>
            <td><strong>{item.nome}</strong><a href={linkWhatsApp(item.telefone)} target="_blank" rel="noreferrer">{item.telefone || "Sem telefone"}</a></td>
            <td><span className={`admin-status ${item.presenca}`}>{item.presenca === "sim" ? "Confirmado" : "Não vai"}</span></td>
            <td><strong>{item.adultos + item.criancas}</strong><small>{item.adultos} adultos · {item.criancas} crianças</small></td>
            <td>{item.presenca === "sim" ? <><strong>{item.quantidadeFraldas} pacote{item.quantidadeFraldas === 1 ? "" : "s"}</strong><small>Tamanho {item.fralda}</small></> : <span>—</span>}</td>
            <td className="admin-message">{item.mensagem || <span>Sem recadinho</span>}</td>
          </tr>)}</tbody>
        </table>
      </div>}
    </section>
    <footer className="admin-footer"><Link href="/">← Ver convite</Link><span>Dados atualizados em tempo real pelo Firebase</span></footer>
  </main>;
}

function Stat({ icon, label, value, detail }: { icon: string; label: string; value: number; detail?: string }) {
  return <article className="admin-stat"><span>{icon}</span><div><small>{label}</small><strong>{value}</strong>{detail && <p>{detail}</p>}</div></article>;
}
