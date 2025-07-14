// Importa a biblioteca web-push
const webpush = require('web-push');

// Configura as chaves VAPID (vamos obtê-las mais tarde)
// A Vercel usará as variáveis de ambiente que configuraremos no painel.
webpush.setVapidDetails(
  'mailto:jonatas.rocha@outlook.es', // IMPORTANTE: Substitua pelo seu e-mail
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

// Esta é a função principal que a Vercel executará.
// Ela é chamada de "Serverless Function".
export default function handler(req, res) {
  // Verifica se o método da requisição é POST. Só aceitamos POST.
  if (req.method === 'POST') {
    // Pega o objeto 'subscription' do corpo da requisição.
    // O frontend (index.html) enviará este objeto.
    const { subscription } = req.body;

    // Prepara o conteúdo (payload) da notificação.
    const payload = JSON.stringify({
      title: 'Foco Total ⏰',
      body: 'A sua sessão de foco terminou. Hora de fazer uma pausa!',
    });

    // Envia a notificação.
    webpush.sendNotification(subscription, payload)
      .then(() => {
        // Se o envio for bem-sucedido, responde com status 200 (OK).
        res.status(200).json({ success: true });
      })
      .catch(error => {
        // Se houver um erro, loga o erro no console do servidor e responde com 500.
        console.error("Erro ao enviar notificação:", error);
        res.status(500).json({ error: 'Erro ao enviar notificação' });
      });
  } else {
    // Se o método não for POST, responde com 405 (Método não permitido).
    res.setHeader('Allow', ['POST']);
    res.status(405).json({ error: `Método ${req.method} não permitido` });
  }
}
