# TODO

- [ ] **Diretório do shadcn.** Abrir PR em `shadcn-ui/ui` adicionando `@beacon-tip` em `apps/v4/registry/directory.json`
  (ordem alfabética, entre `@audiocn-solid` e `@blobz`). Campos: `name`, `homepage`, `url`
  (`https://tautorn.github.io/beacon-tip/r/{name}.json`), `description`, `author`, `logo` (SVG inline). Inserir no arquivo
  atual do upstream, nunca sobrescrever com uma cópia antiga. Título no padrão
  `feat(registry): add @beacon-tip to the registry directory`. Depois do merge, instalar fica
  `npx shadcn add @beacon-tip/beacon-tip` e o README deve mostrar esse comando.
- [ ] **Personal-platform usando o beacon-tip.** Trocar `src/components/tips` pelo componente, com `storage` lendo e
  gravando `prefs.seenTips` e `labels` em português. Até lá, o componente do app ainda rouba o foco quando a dica abre
  sozinha (corrigido aqui em 5a59400).
- [ ] **README: aviso sobre `cn`.** O registry oficial do shadcn está entregando `popover` e `button` com
  `import { cn } from "cn"` e instala o pacote `cn` do npm. Quem não tem esses componentes precisa trocar o import para
  `@/lib/utils`. Tirar o aviso quando o upstream corrigir.

## Regravar o GIF

`scripts/record-demo-gif.mjs` grava `docs/demo.gif` a partir da demo rodando. As dependências não estão no projeto:

```bash
npm run dev -- --port 5180
# em outra pasta: npm i playwright gifenc pngjs && npx playwright install chromium
node scripts/record-demo-gif.mjs http://localhost:5180/beacon-tip/ docs/demo.gif
```
