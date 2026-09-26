# Ativação do acesso admin

O cliente não contém a senha. Sete toques na versão em até cinco segundos abrem o formulário. A função `unlockDevTools` valida um Secret do Firebase e emite um token com acesso de uma hora. A sessão fica somente na aba; “Sair do modo DEV” faz sign-out. `?debug=1` não libera produção.

## Implantação pendente

Não há Firebase CLI autenticado disponível nesta máquina. Nenhuma função ou configuração remota foi alterada.

1. Instalar o Firebase CLI e autenticar com a conta responsável pelo projeto `buraco-27cb3`.
2. Habilitar Firebase Authentication no console. Não é necessário criar um login público no jogo.
3. Conferir as regras existentes do Firestore. A coleção `devtoolsSecurity` deve ser inacessível a TODOS os clientes; somente o Admin SDK da função deve acessá-la. Adicionar um `allow read, write: if false` NÃO neutraliza outra regra abrangente que conceda acesso: restringir também essas regras. Não publicar a função enquanto essa coleção não estiver protegida.
4. Instalar dependências com `npm install --prefix functions`.
5. Executar `firebase functions:secrets:set DEVTOOLS_ADMIN_PASSWORD --project buraco-27cb3` e inserir a senha escolhida pelo administrador no prompt seguro. Não colocar o valor no repositório, URL ou comando de shell.
6. Executar `firebase deploy --only functions:unlockDevTools --project buraco-27cb3`. Cloud Functions pode exigir faturamento habilitado; confirmar antes de ativar custos. A conta de serviço precisa de permissão para assinar tokens (IAM Service Account Token Creator, quando necessário).
7. Publicar os arquivos do site pelo processo habitual e testar senha errada, quinta tentativa, senha correta, expiração e saída nas duas telas.

## Limites

São permitidas cinco tentativas por IP a cada 15 minutos. Uma senha de quatro dígitos continua fraca contra tentativas distribuídas; prefira uma senha longa e exclusiva.

Isto protege a entrada da interface DevTools, não substitui autorização das mutações no Firestore. As regras da partida não estão neste repositório e não foram auditadas/alteradas. Para proteger também operações administrativas contra clientes modificados, elas devem ser validadas no servidor com `devtools == true` e `devtoolsUntil` ainda válido, separadas das jogadas normais.

Referências: https://firebase.google.com/docs/functions/callable e https://firebase.google.com/docs/auth/admin/create-custom-tokens.
