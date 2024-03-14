const express = require('express');
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path'); // Módulo para lidar com caminhos de arquivos
const querystring = require('querystring'); // Módulo para manipular query strings
const app = express();
const port = 80;

// Middleware para fazer o parsing do JSON no corpo da requisição
app.use(express.json());

app.post('/gerar-pdf', async (req, res) => {
    // Recebe os parâmetros como JSON no corpo da requisição
    const { url_page, landscape, scale, margin, filename, fields } = req.body;

    // Verifica se a URL foi fornecida
    if (!url_page) {
        return res.status(400).send('URL não fornecida');
    }

    try {
        // Define as opções de PDF com os parâmetros fornecidos ou os valores padrão
        const pdfOptions = {
            format: 'A4',
            landscape: landscape !== undefined ? landscape : false,
            printBackground: true,
            scale: scale !== undefined ? scale : 1.215,
            margin: margin !== undefined ? margin : {
                top: '0px',
                right: '0px',
                bottom: '0px',
                left: '0px',
            },
        };

        // Inicializa o puppeteer e abre uma nova página
        const browser = await puppeteer.launch({
          executablePath: '/usr/bin/google-chrome', // Caminho para o executável do Chrome
          args: ['--no-sandbox', '--disable-setuid-sandbox'],
        });
        const page = await browser.newPage();

        // Constrói a URL com os parâmetros de consulta adicionados
        let urlWithQueryParams = url_page;
        if (fields) {
            const queryParams = querystring.stringify(fields);
            urlWithQueryParams += `?${queryParams}`;
        }

        // Acessa a URL fornecida
        await page.goto(urlWithQueryParams, {
            waitUntil: 'networkidle2' // Espera até que a rede esteja inativa (sem requisições por pelo menos 500ms)
        });

        // Gera o PDF da página
        const pdf = await page.pdf(pdfOptions);

        // Fecha o navegador
        await browser.close();

        // Define o nome do arquivo PDF com base no parâmetro fornecido ou um nome padrão
        const pdfFilename = filename || 'pdfexemplo.pdf';

        // Define o caminho completo do arquivo onde será salvo
        const filePath = path.join(__dirname, 'files', pdfFilename);

        // Salva o PDF no servidor no caminho especificado
        fs.writeFileSync(filePath, pdf);

        // URLs locais e públicas
        const localUrl = `http://localhost:${port}/files/${pdfFilename}`;
        const publicUrl = `https://contabo.omatheusdev.com/files/${pdfFilename}`;

        // Resposta com URLs locais e públicas
        res.send({
            message: `PDF gerado com sucesso e salvo como ${pdfFilename} na pasta /files.`,
            url_local: localUrl,
            url_pdf: publicUrl
        });
    } catch (error) {
        console.error('Erro ao gerar o PDF:', error);
        res.status(500).send('Erro ao gerar o PDF');
    }
});

app.get('/files/:filename', (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, 'files', filename);

    res.download(filePath, filename, (err) => {
        if (err) {
            // Handle error, but don't leak to the client
            console.error(err);
            res.status(404).send('Arquivo não encontrado ou erro ao baixar.');
        }
    });
});

app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
});
