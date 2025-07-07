// Importa o 'node-fetch' para fazer requisições a outras APIs.
import fetch from 'node-fetch';

// Esta é a função serverless que a Vercel irá executar.
// O 'export default' é a maneira de exportar a função principal.
export default async function handler(req, res) {
    // A chave da API é injetada pela Vercel a partir das variáveis de ambiente.
    const JAMENDO_CLIENT_ID = process.env.JAMENDO_CLIENT_ID;

    // Verifica se a chave da API foi configurada no ambiente da Vercel.
    if (!JAMENDO_CLIENT_ID) {
        return res.status(500).json({ error: 'A variável de ambiente do servidor (JAMENDO_CLIENT_ID) não foi configurada.' });
    }

    // Pega as tags de gênero da requisição do frontend (ex: ?tags=lofi+ambient).
    // Em uma função serverless, acessamos os parâmetros da URL através de 'req.query'.
    const { tags } = req.query;

    if (!tags) {
        return res.status(400).json({ error: 'O parâmetro "tags" é obrigatório.' });
    }

    // Monta a URL da API do Jamendo.
    const jamendoUrl = `https://api.jamendo.com/v3.0/tracks/?client_id=${JAMENDO_CLIENT_ID}&format=jsonpretty&limit=50&tags=${tags}&audioformat=mp32`;

    try {
        // Faz a requisição para a API do Jamendo.
        const jamendoResponse = await fetch(jamendoUrl);
        if (!jamendoResponse.ok) {
            // Se a resposta do Jamendo não for bem-sucedida, lança um erro.
            throw new Error(`Erro na API do Jamendo: ${jamendoResponse.statusText}`);
        }
        
        // Converte a resposta do Jamendo para JSON.
        const data = await jamendoResponse.json();
        
        // Define o cabeçalho para indicar que a resposta é JSON e envia os dados.
        res.status(200).json(data);

    } catch (error) {
        // Em caso de erro, envia uma mensagem de erro para o frontend.
        console.error('Erro no proxy para o Jamendo:', error);
        res.status(500).json({ error: 'Falha ao buscar dados do Jamendo.' });
    }
}
