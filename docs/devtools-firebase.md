# Trava simples do DevTools

Implementação atual: sete toques na versão abrem um formulário que lê do servidor o documento `appConfig/devtools`, comparando o campo string `password`. `enabled: false` impede novos acessos. Não usa Cloud Functions, Authentication nem Blaze. A liberação dura uma hora na aba; sair apaga a sessão. Localhost continua como antes.

É apenas uma trava de interface aceita pelo administrador, não uma proteção segura: a senha pode ser lida pelo cliente e as regras públicas permitem alterar o documento. Não foram alteradas regras ou faturamento. A antiga configuração de Functions foi removida e pode ser recuperada pelo Git.

A senha escolhida foi cadastrada no Firestore. O código atualizado do site precisa ser publicado pelo processo habitual. Nenhuma função ou alteração de faturamento é necessária.
