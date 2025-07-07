// Importa os módulos necessários.
import express from 'express';
import fetch from 'node-fetch';
// Importa e configura o 'dotenv' para carregar as variáveis do arquivo .env
import 'dotenv/config';

const app = express();
const PORT = 3000;

// ATUALIZADO: A chave da API agora é lida de uma variável de ambiente.
// O valor de 'JAMENDO_CLIENT_ID' virá do seu arquivo .env localmente,
// ou das configurações do seu servidor de produção.
const JAMENDO_CLIENT_ID = process.env.JAMENDO_CLIENT_ID;

// Verifica se a chave da API foi carregada corretamente.
if (!JAMENDO_CLIENT_ID) {
    console.error('Erro: A variável de ambiente JAMENDO_CLIENT_ID não foi definida.');
    process.exit(1); // Encerra o processo se a chave não for encontrada.
}

app.get('/api/music', async (req, res) => {
    const { tags } = req.query;

    if (!tags) {
        return res.status(400).json({ error: 'O parâmetro "tags" é obrigatório.' });
    }

    // A URL agora usa a variável de ambiente segura.
    const jamendoUrl = `https://api.jamendo.com/v3.0/tracks/?client_id=${JAMENDO_CLIENT_ID}&format=jsonpretty&limit=50&tags=${tags}&audioformat=mp32`;

    try {
        const jamendoResponse = await fetch(jamendoUrl);
        if (!jamendoResponse.ok) {
            throw new Error(`Erro na API do Jamendo: ${jamendoResponse.statusText}`);
        }
        
        const data = await jamendoResponse.json();
        
        res.json(data);

    } catch (error) {
        console.error('Erro no proxy para o Jamendo:', error);
        res.status(500).json({ error: 'Falha ao buscar dados do Jamendo.' });
    }
});

app.listen(PORT, () => {
    console.log(`Servidor proxy rodando em http://localhost:${PORT}`);
});
