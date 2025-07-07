// Importa os módulos necessários
import express from 'express';
import fetch from 'node-fetch';

// Cria a aplicação Express
const app = express();

// A chave da API é injetada pela Vercel a partir das variáveis de ambiente
const JAMENDO_CLIENT_ID = process.env.JAMENDO_CLIENT_ID;

// O manipulador da função serverless
// A Vercel irá direcionar pedidos para /api/music para esta função
app.get('/api/music', async (req, res) => {
    // Verifica se a chave da API foi configurada no ambiente da Vercel
    if (!JAMENDO_CLIENT_ID) {
        return res.status(500).json({ error: 'A variável de ambiente do servidor (JAMENDO_CLIENT_ID) não foi configurada.' });
    }

    // Pega as tags de gênero da requisição do frontend (ex: ?tags=lofi+ambient)
    const { tags } = req.query;

    if (!tags) {
        return res.status(400).json({ error: 'O parâmetro "tags" é obrigatório.' });
    }

    // Monta a URL da API do Jamendo
    const jamendoUrl = `https://api.jamendo.com/v3.0/tracks/?client_id=${JAMENDO_CLIENT_ID}&format=jsonpretty&limit=50&tags=${tags}&audioformat=mp32`;

    try {
        // Faz a requisição para a API do Jamendo
        const jamendoResponse = await fetch(jamendoUrl);
        if (!jamendoResponse.ok) {
            // Se a resposta do Jamendo não for bem-sucedida, lança um erro
            throw new Error(`Erro na API do Jamendo: ${jamendoResponse.statusText}`);
        }
        
        // Converte a resposta do Jamendo para JSON
        const data = await jamendoResponse.json();
        
        // Envia os dados recebidos do Jamendo de volta para o seu frontend
        res.json(data);

    } catch (error) {
        // Em caso de erro, envia uma mensagem de erro para o frontend
        console.error('Erro no proxy para o Jamendo:', error);
        res.status(500).json({ error: 'Falha ao buscar dados do Jamendo.' });
    }
});

// Exporta a aplicação para a Vercel.
// A Vercel irá gerir o servidor, não precisamos de app.listen().
export default app;
