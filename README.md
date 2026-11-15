# GestiBoat

Aplicação privada de gestão operacional de frota marítima.

## Stack
- React 19
- Vite 8
- Supabase Auth, PostgreSQL e Storage
- Vercel

## Desenvolvimento
1. Instalar dependências: npm install
2. Copiar .env.example para .env e configurar as variáveis.
3. Iniciar: npm run dev
4. Compilar: npm run build

## Variáveis
- VITE_SUPABASE_URL
- VITE_SUPABASE_PUBLISHABLE_KEY

A chave publishable é apropriada para utilização no cliente. Nunca colocar uma service_role ou secret key no frontend.

## Módulos
- Visão geral
- Embarcações
- Motores (associados às embarcações)
- Documentos, manutenção, equipamentos, tripulações, inspecções, ocorrências, abastecimentos e despesas (a desenvolver)

## Segurança
A autorização efectiva é aplicada pelas políticas RLS do Supabase. A interface não substitui as políticas da base de dados.
