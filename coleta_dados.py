from pathlib import Path
from datetime import datetime
from io import StringIO
from time import sleep

import pandas as pd
import requests


API_KEY = "a979d852962faecc4b6082d3a4da3fe5"
OBSERVATION_START = "2000-01-01"

BASE_DIR = Path(__file__).resolve().parent
PROCESSED_DIR = BASE_DIR / "data" / "processed"
FRED_GRAPH_URL = "https://fred.stlouisfed.org/graph/fredgraph.csv"
FRED_SERIES_URL = "https://api.stlouisfed.org/fred/series"


SERIES_CONFIG = [
    {
        "serie": "MDSP",
        "uso_pagina": "Hipotecas",
        "interpretacao_dashboard": "Percentual da renda comprometida com hipotecas",
    },
    {
        "serie": "DRSFRMACBS",
        "uso_pagina": "Hipotecas",
        "interpretacao_dashboard": "Taxa de inadimplencia das hipotecas",
    },
    {
        "serie": "FIXHAI",
        "uso_pagina": "Hipotecas",
        "interpretacao_dashboard": "Indice de acessibilidade habitacional",
    },
    {
        "serie": "MORTGAGE15US",
        "uso_pagina": "Precos",
        "interpretacao_dashboard": "Taxa de juros de hipotecas de 15 anos",
    },
    {
        "serie": "MORTGAGE30US",
        "uso_pagina": "Precos",
        "interpretacao_dashboard": "Taxa de juros de hipotecas de 30 anos",
    },
    {
        "serie": "RCMFLOORIG",
        "uso_pagina": "Precos",
        "interpretacao_dashboard": "Originacao de novas hipotecas",
    },
    {
        "serie": "USSTHPI",
        "uso_pagina": "Precos",
        "interpretacao_dashboard": "Indice de preco das casas",
    },
    {
        "serie": "CUUR0000SEHA",
        "uso_pagina": "Precos",
        "interpretacao_dashboard": "Indice relacionado a aluguel/habitacao",
    },
    {
        "serie": "HOUSTNSA",
        "uso_pagina": "Novas casas",
        "interpretacao_dashboard": "Novas casas iniciadas - EUA total",
    },
    {
        "serie": "HOUST1FNSA",
        "uso_pagina": "Novas casas",
        "interpretacao_dashboard": "Novas casas iniciadas - 1 familia",
    },
    {
        "serie": "HOUSTSNSA",
        "uso_pagina": "Novas casas",
        "interpretacao_dashboard": "Regiao Sul - total",
    },
    {
        "serie": "HOUSTS1FNSA",
        "uso_pagina": "Novas casas",
        "interpretacao_dashboard": "Regiao Sul - 1 familia",
    },
    {
        "serie": "HOUSTNENSA",
        "uso_pagina": "Novas casas",
        "interpretacao_dashboard": "Regiao Nordeste - total",
    },
    {
        "serie": "HOUSTNE1FNSA",
        "uso_pagina": "Novas casas",
        "interpretacao_dashboard": "Regiao Nordeste - 1 familia",
    },
    {
        "serie": "HOUSTMWNSA",
        "uso_pagina": "Novas casas",
        "interpretacao_dashboard": "Meio-Oeste - total",
    },
    {
        "serie": "HOUSTMW1FNSA",
        "uso_pagina": "Novas casas",
        "interpretacao_dashboard": "Meio-Oeste - 1 familia",
    },
    {
        "serie": "HOUSTWNSA",
        "uso_pagina": "Novas casas",
        "interpretacao_dashboard": "Regiao Oeste - total",
    },
    {
        "serie": "HOUSTW1FNSA",
        "uso_pagina": "Novas casas",
        "interpretacao_dashboard": "Regiao Oeste - 1 familia",
    },
    {
        "serie": "NHFSEPNTS",
        "uso_pagina": "Novas casas",
        "interpretacao_dashboard": "Lancamentos de casas a venda",
    },
    {
        "serie": "NHSDPNSS",
        "uso_pagina": "Novas casas",
        "interpretacao_dashboard": "Lancamentos de casas vendidas",
    },
    {
        "serie": "COMPUTSA",
        "uso_pagina": "Casas concluidas",
        "interpretacao_dashboard": "Obras de casas concluidas",
    },
    {
        "serie": "NHSDPCS",
        "uso_pagina": "Casas concluidas",
        "interpretacao_dashboard": "Casas concluidas vendidas",
    },
    {
        "serie": "NHFSEPCS",
        "uso_pagina": "Casas concluidas",
        "interpretacao_dashboard": "Casas concluidas a venda",
    },
    {
        "serie": "MSACSR",
        "uso_pagina": "Casas concluidas",
        "interpretacao_dashboard": "Oferta de novas casas",
    },
]


def requisitar_com_retry(url, params, tentativas=3):
    ultimo_erro = None

    for tentativa in range(1, tentativas + 1):
        try:
            resposta = requests.get(url, params=params, timeout=30)
            resposta.raise_for_status()
            return resposta
        except requests.RequestException as erro:
            ultimo_erro = erro
            if tentativa < tentativas:
                sleep(2 * tentativa)

    raise ultimo_erro


def baixar_observacoes(serie_id):
    resposta = requisitar_com_retry(FRED_GRAPH_URL, {"id": serie_id})
    df = pd.read_csv(StringIO(resposta.text))
    df = df.rename(columns={"observation_date": "data", "DATE": "data", serie_id: "valor"})
    df["data"] = pd.to_datetime(df["data"])
    df["valor"] = pd.to_numeric(df["valor"], errors="coerce")
    df = df[df["data"] >= pd.to_datetime(OBSERVATION_START)]
    return df[["data", "valor"]]


def baixar_metadados(serie_id):
    params = {
        "series_id": serie_id,
        "api_key": API_KEY,
        "file_type": "json",
    }

    try:
        resposta = requisitar_com_retry(FRED_SERIES_URL, params)
        series = resposta.json().get("seriess", [])
        if series:
            return series[0]
    except requests.RequestException as erro:
        print(f"Metadados indisponiveis para {serie_id}: {erro}")
    except ValueError as erro:
        print(f"Resposta de metadados invalida para {serie_id}: {erro}")

    return {}


def coletar_serie(config):
    serie_id = config["serie"]
    info = baixar_metadados(serie_id)
    df = baixar_observacoes(serie_id)
    df["serie"] = serie_id
    df["uso_pagina"] = config["uso_pagina"]
    df["interpretacao_dashboard"] = config["interpretacao_dashboard"]
    df["titulo_fred"] = info.get("title")
    df["unidade"] = info.get("units")
    df["frequencia"] = info.get("frequency")
    df["ajuste_sazonal"] = info.get("seasonal_adjustment")
    df["ultima_atualizacao_fred"] = info.get("last_updated")

    return df


def montar_base():
    frames = []

    for config in SERIES_CONFIG:
        print(f"Coletando {config['serie']}...")
        frames.append(coletar_serie(config))

    base_longa = pd.concat(frames, ignore_index=True)
    base_longa["data"] = pd.to_datetime(base_longa["data"]).dt.date
    base_longa["data_coleta"] = datetime.now().isoformat(timespec="seconds")

    colunas = [
        "data",
        "serie",
        "valor",
        "uso_pagina",
        "interpretacao_dashboard",
        "titulo_fred",
        "unidade",
        "frequencia",
        "ajuste_sazonal",
        "ultima_atualizacao_fred",
        "data_coleta",
    ]
    return base_longa[colunas]


def salvar_bases(base_longa):
    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)

    caminho_longa = PROCESSED_DIR / "fred_housing_series_long.csv"
    caminho_longa_xlsx = PROCESSED_DIR / "fred_housing_series_long.xlsx"
    caminho_larga = PROCESSED_DIR / "fred_housing_series_wide.csv"
    caminho_metadados = PROCESSED_DIR / "fred_housing_series_metadata.csv"

    base_longa.to_csv(caminho_longa, index=False, encoding="utf-8-sig")
    base_longa.to_excel(caminho_longa_xlsx, index=False)

    base_larga = base_longa.pivot_table(
        index="data",
        columns="serie",
        values="valor",
        aggfunc="first",
    ).reset_index()
    base_larga.to_csv(caminho_larga, index=False, encoding="utf-8-sig")

    metadados = (
        base_longa[
            [
                "serie",
                "uso_pagina",
                "interpretacao_dashboard",
                "titulo_fred",
                "unidade",
                "frequencia",
                "ajuste_sazonal",
                "ultima_atualizacao_fred",
                "data_coleta",
            ]
        ]
        .drop_duplicates(subset=["serie"])
        .sort_values(["uso_pagina", "serie"])
    )
    metadados.to_csv(caminho_metadados, index=False, encoding="utf-8-sig")

    return caminho_longa, caminho_longa_xlsx, caminho_larga, caminho_metadados


if __name__ == "__main__":
    base = montar_base()
    arquivos = salvar_bases(base)

    print(f"Linhas geradas: {len(base):,}".replace(",", "."))
    print("Arquivos salvos:")
    for arquivo in arquivos:
        print(f"- {arquivo}")
