import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Painel da família | Chá do Lucca",
  description: "Painel privado de confirmações do chá de fraldas do Lucca.",
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}
