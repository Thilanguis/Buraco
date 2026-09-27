try {
  const { requireAccount, installAccountMenu } = await import('./account-auth.js');
  const account = await requireAccount({ deferReveal: true });
  await import('../app.js');
  installAccountMenu(account);
  document.body.classList.remove('account-pending');
} catch (error) {
  // Falha fechada: não carregar a partida se o login estiver indisponível.
  document.body.classList.add('account-pending');
  document.getElementById('accountGate')?.remove();
  const gate = document.createElement('section');
  gate.id = 'accountGate';
  gate.innerHTML = '<div class="account-card"><h1>Não foi possível abrir o jogo</h1><p>Confira sua conexão e tente novamente. Se persistir, confira a configuração do Firebase.</p><button type="button">Tentar novamente</button></div>';
  gate.querySelector('button').onclick = () => location.reload();
  document.body.append(gate);
  console.error('Falha na inicialização:', error.code || error.name);
}
