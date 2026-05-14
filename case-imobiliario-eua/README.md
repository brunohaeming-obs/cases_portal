# Case Imobiliario EUA

Pagina editorial interativa para o Observatorio FIESC sobre monitoramento do setor imobiliario dos Estados Unidos como insumo de inteligencia economica.

## Estrutura

```text
case-imobiliario-eua/
  backend/
    main.py
    services/
      fred_service.py
      transform_service.py
    cache/
      fred/
    requirements.txt
    .env.example
  frontend/
    index.html
    css/
      tokens.css
      layout.css
      components.css
      story.css
    js/
      api.js
      charts.js
      main.js
      formatters.js
```

## Instalar dependencias

```powershell
cd C:\Users\bruno.haeming\Desktop\cases_portal\case-imobiliario-eua\backend
C:\Users\bruno.haeming\AppData\Local\Programs\Python\Python313\python.exe -m pip install -r requirements.txt
```

## Configurar FRED_API_KEY

Copie `.env.example` para `.env` e informe a chave, se quiser enriquecer metadados pela API oficial:

```text
FRED_API_KEY=sua_chave
```

A coleta principal usa o CSV publico do FRED e tambem tem fallback para `data/processed/fred_housing_series_long.csv`, ja gerado no projeto.

## Rodar localmente

```powershell
cd C:\Users\bruno.haeming\Desktop\cases_portal\case-imobiliario-eua\backend
C:\Users\bruno.haeming\AppData\Local\Programs\Python\Python313\python.exe -m uvicorn main:app --reload --host 127.0.0.1 --port 8010
```

Acesse:

```text
http://127.0.0.1:8010/
```

## Atualizar dados

Na interface, use o botao `Atualizar dados`. Ele chama `/api/story-data?refresh=true` e regrava o cache em:

```text
backend/cache/fred/{code}.parquet
```

Tambem e possivel atualizar via endpoint:

```text
GET /api/story-data?refresh=true
GET /api/summary?refresh=true
```

## Endpoints

- `GET /`: serve a pagina.
- `GET /api/health`: status simples.
- `GET /api/series/{code}`: retorna uma serie individual.
- `GET /api/story-data`: retorna todas as series usadas na narrativa.
- `GET /api/summary`: retorna ultimos valores e variacoes.

## Embutir no portal

Para embutir no portal do Observatorio FIESC, ha duas alternativas:

1. Servir a pasta `case-imobiliario-eua/backend` como aplicacao FastAPI e apontar o portal para a URL publica da pagina.
2. Incorporar o conteudo de `frontend/` no pipeline estatico do portal e manter os endpoints `/api/*` servidos pelo backend.

O MVP nao usa React. O frontend e HTML, CSS e JavaScript modular com Apache ECharts via CDN.
