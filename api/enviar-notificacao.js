// Importa a biblioteca web-push
const webpush = require('web-push');

// Configura as chaves VAPID
webpush.setVapidDetails(
  'mailto:seu-email@exemplo.com', // Lembre-se de manter o seu e-mail aqui
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

export default function handler(req, res) {
  if (req.method === 'POST') {
    // Pega a inscrição e um payload (conteúdo) customizado do corpo da requisição
    const { subscription, payload: customPayload } = req.body;

    // Se a inscrição não for enviada, retorna um erro.
    if (!subscription) {
      return res.status(400).json({ error: 'Inscrição (subscription) é obrigatória.' });
    }

    // Define um conteúdo padrão para a notificação de fim de ciclo
    const defaultPayload = {
      title: 'Foco Total ⏰',
      body: 'A sua sessão de foco terminou. Hora de fazer uma pausa!',
    };

    // Usa o conteúdo customizado se ele foi enviado, senão, usa o padrão.
    const payloadToSend = JSON.stringify(customPayload || defaultPayload);

    // Envia a notificação
    webpush.sendNotification(subscription, payloadToSend)
      .then(() => {
        res.status(200).json({ success: true });
      })
      .catch(error => {
        console.error("Erro ao enviar notificação:", error);
        // Retorna o erro para o frontend saber que algo falhou
        res.status(500).json({ error: 'Erro interno do servidor ao enviar notificação.', details: error.message });
      });
  } else {
    // Se o método não for POST, responde com 405 (Método não permitido).
    res.setHeader('Allow', ['POST']);
    res.status(405).json({ error: `Método ${req.method} não permitido` });
  }
}
