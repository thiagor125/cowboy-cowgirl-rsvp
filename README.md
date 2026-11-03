This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Acesso ao painel da família

O `/admin` usa usuário e senha próprios do convite. O login `lucca` é associado
internamente a uma conta dedicada do Firebase Authentication, sem usar a conta
pessoal do proprietário. Mantenha o provedor **E-mail/senha** habilitado.

Para provisionar o acesso:

1. Crie a conta dedicada indicada em `lib/admin-auth.ts` no Firebase Authentication.
   O responsável define a senha diretamente no Firebase; não grave senhas no Git.
2. Preencha `ADMIN_ACCOUNT.uid` com o UID da conta criada.
3. Autorize esse UID nas regras do Firestore para consultar `confirmacoes`.
   O UID vazio bloqueia o acesso. A validação no navegador não substitui as regras.

Não há cadastro público ou recuperação por uma caixa de e-mail pessoal.
Trocas de senha são feitas pelo responsável no Firebase Authentication.
Cada novo cliente precisa de acesso e dados separados antes da entrega.

Execute `npm test` (Node.js 24), `npm run lint` e `npm run build` para validar.
