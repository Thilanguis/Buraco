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

Ao alterar uma regra estável:
1. alterar o código e os testes;
2. atualizar a documentação permanente correspondente;
3. atualizar o inventário quando a mudança afetar habilidade, fase, peso ou efeito resumido;
4. usar o handoff apenas para registrar o que ainda está pendente ou precisa ser retomado em outra sessão.
