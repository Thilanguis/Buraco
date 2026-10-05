# Guia da pasta `docs`

Esta pasta guarda **documentação permanente do projeto**. Ela não deve funcionar como histórico de conversa nem como substituta de handoffs entre sessões.

## Regra de fonte de verdade

- **Código atual** é a fonte de verdade executável.
- **Documentação permanente** explica o comportamento aprovado e a arquitetura que deve continuar válida.
- **Handoff de chat** é temporário: registra contexto recente, pendências, regressões e próximos passos para outra sessão. Ele não deve competir com os documentos abaixo como especificação oficial.
- Quando uma decisão do handoff vira regra estável, ela deve ser incorporada ao documento permanente correspondente.

## Documentos atuais

### `DOCUMENTACAO_CHEFE_DA_MESA.md`
Especificação funcional detalhada do modo Chefe da Mesa.

Use para entender:
- fluxo geral da luta;
- dano, fases e condições de vitória/derrota;
- recursos de cada chefe;
- funcionamento detalhado das habilidades;
- interações, exceções, HUD e comportamento esperado;
- regras que precisam sobreviver a refactors.

É o documento principal quando a pergunta é **“como o modo Chefe da Mesa deve funcionar?”**.

### `INVENTARIO_HABILIDADES_CHEFES.md`
Catálogo compacto das habilidades realmente ativas.

Use para consultar rapidamente:
- nome e `id` da habilidade;
- chefe;
- fases;
- peso;
- efeito atual resumido.

É deliberadamente mais curto que a documentação completa. A pergunta que ele responde é **“o que existe hoje na rotação e o que cada habilidade faz em resumo?”**.

### `login-firebase.md`
Documento de arquitetura/operação do login e dos perfis no Firebase: autenticação, dados persistidos, regras, segurança e publicação coordenada.

### `devtools-firebase.md`
Explica a trava do DevTools em produção, suas limitações de segurança e a forma de ativação.

### `historico-perfil.md`
Especificação da área de perfil e histórico de partidas: identidade, persistência, estatísticas, filtros e segurança.

### `confrontos-perfil.md`
Especificação da aba Confrontos e da comparação entre adversários/parceiros usando o histórico privado carregado.

### `importacao-historico-legado.md`
Registro de migração. Documenta uma operação específica de recuperação/importação de partidas antigas, suas regras e limitações. É principalmente histórico técnico e rastreabilidade, não uma especificação viva do jogo.

### `correcao-historico-tempo-real.md`
Registro de uma correção específica no histórico em tempo real e de decisões tomadas naquela alteração. Também é principalmente histórico técnico.

### `CHECKLIST_REGRESSOES_E_ATUALIZACOES.md`
Checklist permanente de prevenção de regressões. Deve ser consultado **antes de alterações em regra, UI, animação, BOT, sincronização, reinício, Service Worker ou assets**.

Registra erros reais já ocorridos e a verificação obrigatória correspondente, incluindo:
- auditoria de dependências antes de substituir uma feature;
- diferença entre alerta, execução e estado persistente;
- sincronização local/remota;
- cuidados com estados nullable/turno 0;
- timers e estados `pending` antes de devolver controle ao BOT;
- matriz de regressão da Dominação/Decreto;
- prevenção de regressões visuais, de layout e de atualização/SW.

## Handoffs

Handoffs como `HANDOFF_...md` servem para transportar contexto entre chats/sessões. Podem ser arquivados fora de `docs` ou em uma área explicitamente marcada como arquivo temporário, mas **não devem ser tratados como documentação oficial do sistema**.

Um handoff normalmente pode conter coisas que não pertencem a `docs`, por exemplo:
- “confirmar visualmente no PC”;
- “upload foi bloqueado pelo conector”;
- “arquivo temporário salvo no My Drive”;
- ordem de trabalho para o próximo chat;
- tentativas que foram revertidas;
- preferências de trabalho da sessão.

Quando algo deixa de ser contexto temporário e vira regra do produto, mover a informação para a documentação permanente apropriada.

## Manutenção recomendada

Antes de qualquer patch relevante, **ler `CHECKLIST_REGRESSOES_E_ATUALIZACOES.md`** e aplicar somente as verificações pertinentes ao escopo.

Ao alterar uma regra estável:
1. alterar o código e os testes;
2. atualizar a documentação permanente correspondente;
3. atualizar o inventário quando a mudança afetar habilidade, fase, peso ou efeito resumido;
4. atualizar o checklist se surgir uma nova classe de regressão que mereça prevenção permanente;
5. usar o handoff apenas para registrar o que ainda está pendente ou precisa ser retomado em outra sessão.


## Regra obrigatória — auditoria de dependências antes de substituir/remover uma feature

Toda alteração que remova, substitua, renomeie ou mude o gatilho de uma feature deve começar por uma **auditoria de tudo que está acoplado a ela** antes de qualquer edição.

Verificar, no mínimo:
- sons/SFX e música interrompida ou retomada pela feature;
- animações, overlays, foco visual, vibração e feedback háptico;
- botões, HUD, mensagens, dicas e acessibilidade (`aria-*`);
- eventos persistidos, `lastAction`, estados salvos e compatibilidade com partidas antigas;
- lógica de BOT/IA e timers/janelas de reação;
- testes e cenários de DEVTOOLS;
- Service Worker/cache e assets associados;
- documentação e inventários relacionados;
- imports, arquivos auxiliares e código que possa ficar órfão.

**Regra de decisão:** se um comportamento acoplado não tiver destino óbvio na nova versão, **não removê-lo nem decidir sozinho**. Parar e avisar o Biel explicitamente, por exemplo: `Esta feature também dispara X/Y/Z. Ao substituí-la, você quer preservar, reaproveitar ou remover esses comportamentos?`

Uma mudança só pode ser considerada pronta para aplicação depois de responder:
1. o que esta feature fazia além da regra principal?;
2. quais efeitos visuais/sonoros e integrações dependem dela?;
3. o que será preservado, migrado ou removido?;
4. existe alguma consequência não solicitada pelo Biel?;

**Não interpretar “substituir a mecânica” como autorização automática para apagar apresentação, som, animação ou integrações que estavam atreladas à mecânica antiga.**
