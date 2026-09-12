import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Painel da família | Chá do Bernardo",
  description: "Painel privado de confirmações do chá de fraldas do Bernardo.",
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}
