# Case Imobiliario EUA

Pagina editorial interativa para o Observatorio FIESC sobre monitoramento do setor imobiliario dos Estados Unidos como insumo de inteligencia economica.

## Estrutura

```text
case-imobiliario-eua/
  backend/
    main.py
    services/
      __init__.py
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
      formatters.js
      main.js
```

## Criar ambiente virtual

```powershell
cd C:\Users\bruno.haeming\Desktop\cases_portal\case-imobiliario-eua\backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

## Instalar dependencias

```powershell
python -m pip install -r requirements.txt
```

## Configurar FRED_API_KEY

A chave do FRED e opcional para a pagina rodar quando houver cache local. Ela enriquece metadados pela API oficial.

```powershell
Copy-Item .env.example .env
```

Edite `.env`:

```text
FRED_API_KEY=sua_chave
```

## Rodar localmente

```powershell
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

Acesse:

```text
http://127.0.0.1:8000
```

## Cache e dados

A aplicacao busca as series no CSV publico do FRED e salva um cache local por serie em:

```text
backend/cache/fred/{code}.parquet
```

Se a coleta online falhar, o backend tenta usar o parquet ja existente. Se ainda nao houver parquet, tenta usar a base processada em:

```text
data/processed/fred_housing_series_long.csv
```

Series obrigatorias da narrativa:

- `MORTGAGE30US`
- `RCMFLOORIG`
- `HOUSTNSA`
- `HOUST1FNSA`
- `COMPUTSA`
- `MSACSR`

## Atualizar dados

Na interface, use o botao `Atualizar dados`. Ele chama os endpoints com `refresh=true` e regrava os parquets disponiveis.

Tambem e possivel atualizar via URL:

```text
GET /api/story-data?refresh=true
GET /api/summary?refresh=true
GET /api/series/MORTGAGE30US?refresh=true
```

## Endpoints

- `GET /`: serve a pagina editorial.
- `GET /api/health`: status da aplicacao e series mapeadas.
- `GET /api/series/{code}`: retorna uma serie individual.
- `GET /api/story-data`: retorna as series usadas na narrativa.
- `GET /api/summary`: retorna ultimos valores e variacoes interanuais.

## Embutir no portal

Para embutir no portal do Observatorio FIESC, ha duas alternativas:

1. Servir `case-imobiliario-eua/backend` como aplicacao FastAPI e apontar o portal para a URL publica da pagina.
2. Incorporar o conteudo de `frontend/` no pipeline estatico do portal e manter os endpoints `/api/*` servidos pelo backend.

O MVP usa HTML, CSS e JavaScript vanilla no frontend, FastAPI no backend e Apache ECharts via CDN para os graficos.
