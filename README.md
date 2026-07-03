# Acadêmico

Agenda acadêmica simples, rápida e sem conta para organizar tarefas, provas, estudos, aulas e prazos. O projeto é um app estático feito com HTML, CSS e JavaScript puro, pronto para publicar em Cloudflare Pages, GitHub Pages ou qualquer hospedagem de arquivos estáticos.

## Recursos

- Calendário mensal, semanal, agenda e linha do tempo.
- Criação, edição, duplicação, exclusão e conclusão de tarefas.
- Filtros por prioridade, status e tipo.
- Busca por título, descrição, disciplina ou tipo.
- Tema claro e escuro.
- Inputs personalizados para select, data e horário.
- Importação e exportação de dados em JSON.
- Dados salvos localmente no navegador com `localStorage`.

## Privacidade e dados

O app não usa login, banco de dados ou servidor próprio. Cada pessoa que acessa a aplicação tem seus dados salvos apenas no navegador em que está usando.

Isso significa:

- usuários diferentes não compartilham dados entre si;
- publicar o projeto não publica sua agenda pessoal;
- seus dados locais continuam no seu navegador;
- para levar dados para outro navegador ou domínio, use `Exportar` e depois `Importar`.

O arquivo `data/agenda.json` é tratado como dado local/inicial e fica ignorado pelo Git para evitar subir informações pessoais ao repositório.

## Estrutura

```txt
.
├── assets/
│   └── images/
├── data/
│   └── agenda.json        # ignorado pelo Git
├── index.html
├── script.js
├── style.css
└── README.md
```

## Rodando localmente

Como o projeto é estático, basta abrir o `index.html` no navegador. Se preferir rodar com servidor local:

```bash
python -m http.server 5173
```

Depois acesse:

```txt
http://127.0.0.1:5173
```

## Deploy na Cloudflare Pages

Use Cloudflare Pages, não Workers.

Configuração recomendada:

```txt
Framework preset: None
Build command: vazio
Build output directory: /
Root directory: vazio
```

Se a Cloudflare não aceitar `/` como output directory, use:

```txt
Build output directory: .
```

## Desenvolvimento

Não há etapa de build. Os arquivos principais são:

- `index.html`: estrutura da interface.
- `style.css`: tema, responsividade e componentes visuais.
- `script.js`: estado, calendário, tarefas, filtros, importação/exportação e persistência local.

Antes de publicar alterações no JavaScript, você pode validar a sintaxe com:

```bash
node --check script.js
```

## Licença

Projeto pessoal para organização acadêmica.
