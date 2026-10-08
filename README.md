# RBXGarden — Roblox Luau Dev SuperHub

Uma versão organizada do RBXGarden para VS Code e GitHub Pages.

## Estrutura

```text
RBXstudio/
├── index.html
├── css/
│   └── style.css
├── js/
│   ├── data.js
│   └── app.js
├── data/
│   └── README.md
├── assets/
│   ├── icons/
│   │   └── favicon.svg
│   ├── images/
│   └── sounds/
├── .nojekyll
├── .gitignore
└── README.md
```

## Rodar no VS Code

Abra a pasta no VS Code e use uma extensão como Live Server, ou rode qualquer servidor HTTP local. Como o projeto é estático, não precisa de Node.js para funcionar.

## Publicar no GitHub Pages

1. Crie um repositório.
2. Envie todos os arquivos mantendo as pastas.
3. Garanta que `index.html` está na raiz.
4. Ative GitHub Pages usando a branch `main` e a pasta `/ (root)`.

## Dados locais

Scripts, configurações e progresso do usuário continuam sendo salvos no `localStorage` do navegador. O conteúdo de `js/data.js` é o catálogo inicial de módulos e documentação.

## Observação sobre IA

O painel de Code AI suporta o analisador local e também um endpoint externo opcional configurado dentro do site. Nenhuma chave secreta deve ser colocada diretamente no frontend público.
