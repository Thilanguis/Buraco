# Contas e preenchimento de jogador

## Implementado

- Entrada bloqueada até Firebase Authentication validar a sessão e carregar o perfil.
- Cadastro por e-mail/senha, nome e chave Pix; recuperação de senha por e-mail e saída da conta no menu.
- Senhas ficam exclusivamente no Authentication. `userProfiles/{uid}` contém apenas `name` e `pixKey`.
- Perfil ausente ou cadastro parcialmente salvo: pedir nome/Pix novamente, sem criar outra conta.
- Escolher cadeira ou restaurar a cadeira salva preenche nome/Pix usando transação, preservando os outros jogadores e sem alterar uma partida já iniciada.
- No 1×1, Pix separado para cada jogador. Nas duplas, 1/3 compartilham o time 1 e 2/4 o time 2; parceiros adicionais não sobrescrevem uma chave existente. No 1×2/1×3, todos os adversários pertencem ao time 2. No cooperativo, ambos pertencem ao time 1.
- A sessão permanece no mecanismo padrão do Firebase Auth. Nenhuma senha é gravada em localStorage ou Firestore.

## Estado do Firebase e publicação — 26/09/2026

O provedor E-mail/senha foi habilitado e confirmado. Não foi ativado Blaze, Identity Platform nem Cloud Functions.

**Já publicado no banco:** regras de transição que tornam `userProfiles/{uid}` privado, negam listagem de perfis e impedem campos adicionais (inclusive senha). A configuração visual do DevTools continua legível, mas não pode mais ser escrita por clientes.

**Ainda não publicado:** o site atualizado e a exigência de login para acessar salas. As salas `buracoGames` mantêm temporariamente o acesso anterior para não interromper o site antigo. Portanto, o Pix copiado para uma sala ainda NÃO está protegido por login durante essa transição, apesar de o perfil individual já estar privado.

Publicar em uma janela coordenada:

1. Publicar os arquivos do site, incluindo `js/bootstrap.js`, os módulos de conta, CSS e service-worker v198.
2. Publicar imediatamente as regras finais versionadas: `firebase deploy --only firestore:rules --project buraco-27cb3` (ou colar `firestore.rules` no console). Não deixar só o novo site publicado com as permissões antigas de salas.
3. Recarregar clientes antigos e validar cadastro/login/Pix com uma conta de teste escolhida pelo responsável.

As regras finais exigem conta autenticada para ler/escrever uma sala pelo seu ID e negam listagem geral. Não implementam propriedade exclusiva de cadeira nem autorização por participante: quem possui conta e o link da sala tem acesso aos dados compartilhados nela, inclusive Pix. O mascaramento visual do Pix adversário não é sigilo em nível de banco.

O login por e-mail/senha está disponível no plano Spark, sujeito aos limites do serviço. Firestore também continua sujeito às cotas do plano; não há garantia de uso ilimitado.

## Verificação

- `node --test tests/account-profile.test.mjs tests/dev-menu-shortcuts.test.mjs tests/devtools-auth-server.test.mjs`
- `node tests/account-auth.browser.mjs` — interface com Firebase em memória, 3 tamanhos de tela.
- `node tests/account-lobby.browser.mjs` — inicialização completa, sessão restaurada e preenchimento da cadeira 2 com Firebase em memória; não inicia partida.
- Playwright precisa estar instalado ou configurado via `PLAYWRIGHT_PATH`.
- Compilação das regras finais e 9 casos de autorização passaram no serviço de testes de regras, sem criar documentos/contas reais.

Referências: https://firebase.google.com/docs/auth/web/password-auth e https://firebase.google.com/pricing
