"""
===============================================================================
SERVICE DE LECTURE, VALIDATION & IMPORTATION EXCEL POUR BACKEND PYTHON (FastAPI)
===============================================================================
À copier/coller dans votre backend Python (ex: `gestion-d-assurance-v1/app/services/excel_import.py`
ou directement dans `main.py`).

Dépendances requises dans requirements.txt :
  pandas>=2.0.0
  openpyxl>=3.1.0
  fastapi
===============================================================================
"""

import io
import re
import pandas as pd
from typing import Dict, List, Any, Optional
from fastapi import APIRouter, UploadFile, File, HTTPException, status
from pydantic import BaseModel

# ─── SCHÉMAS ET CHAMPS REQUIS PAR ENTITÉ ─────────────────────────────────────

REQUIRED_SCHEMAS = {
    "prospects": {
        "label": "Prospects",
        "required": [
            {"key": "full_name", "label": "Nom complet", "aliases": ["nom", "nom complet", "name", "full_name", "prospect"]},
            {"key": "phone", "label": "Numéro de Téléphone", "aliases": ["telephone", "téléphone", "phone", "mobile", "tel"]}
        ],
        "optional": [
            {"key": "cni_number", "label": "Numéro CNI", "aliases": ["cni", "n° cni", "cni_number"]},
            {"key": "power_cv", "label": "Puissance (CV)", "aliases": ["puissance", "power_cv", "cv"]},
            {"key": "fuel", "label": "Carburant", "aliases": ["carburant", "fuel", "energie"]}
        ]
    },
    "clients": {
        "label": "Clients",
        "required": [
            {"key": "full_name", "label": "Nom complet", "aliases": ["nom", "nom complet", "name", "full_name", "client"]},
            {"key": "phone", "label": "Numéro de Téléphone", "aliases": ["telephone", "téléphone", "phone", "mobile", "tel"]}
        ],
        "optional": [
            {"key": "email", "label": "Email", "aliases": ["email", "e-mail", "courriel"]},
            {"key": "address", "label": "Adresse", "aliases": ["adresse", "address", "ville", "quartier"]},
            {"key": "cni_number", "label": "Numéro CNI", "aliases": ["cni", "n° cni", "cni_number"]},
            {"key": "profession", "label": "Profession", "aliases": ["profession", "metier"]}
        ]
    },
    "contracts": {
        "label": "Contrats",
        "required": [
            {"key": "client_identifier", "label": "Client (Téléphone / CNI / ID)", "aliases": ["client", "client_id", "téléphone client", "cni client", "phone client"]},
            {"key": "product_line", "label": "Branche (AUTO/SANTE/VOYAGE)", "aliases": ["branche", "product_line", "produit", "type"]}
        ],
        "optional": [
            {"key": "product_type", "label": "Type Produit", "aliases": ["code produit", "product_type", "categorie"]},
            {"key": "date_effet", "label": "Date effet", "aliases": ["date d'effet", "date_effet", "date debut"]},
            {"key": "duree_jours", "label": "Durée (jours)", "aliases": ["durée", "duree", "duree_jours", "jours"]}
        ]
    },
    "sinistres": {
        "label": "Sinistres",
        "required": [
            {"key": "vehicle_identifier", "label": "Véhicule (Immatriculation / Châssis)", "aliases": ["immatriculation", "chassis", "chassis_num", "vehicule", "police"]},
            {"key": "date_sinistre", "label": "Date du Sinistre", "aliases": ["date", "date_sinistre", "date incident"]},
            {"key": "description", "label": "Description des dégâts", "aliases": ["description", "dégats", "degats", "motif", "nature"]}
        ],
        "optional": [
            {"key": "lieu", "label": "Lieu de l'accident", "aliases": ["lieu", "location", "ville"]},
            {"key": "montant_estime", "label": "Montant Estimé (FCFA)", "aliases": ["montant", "montant_estime", "estimation"]}
        ]
    },
    "objectives": {
        "label": "Objectifs Commercial",
        "required": [
            {"key": "agent_identifier", "label": "Agent (Code / Email / ID)", "aliases": ["agent", "agent_id", "code agent", "email agent", "agent_email"]},
            {"key": "objective_prospects", "label": "Objectif Prospects", "aliases": ["prospects", "objective_prospects", "cible prospects", "nb prospects"]}
        ],
        "optional": [
            {"key": "objective_clients", "label": "Objectif Clients", "aliases": ["clients", "objective_clients", "cible clients", "nb clients"]}
        ]
    }
}


def normalize_string(s: str) -> str:
    """Normalise un nom de colonne en minuscules sans accents ni ponctuation."""
    if not isinstance(s, str):
        s = str(s)
    s = s.lower().strip()
    s = re.sub(r'[àáâãäå]', 'a', s)
    s = re.sub(r'[èéêë]', 'e', s)
    s = re.sub(r'[ìíîï]', 'i', s)
    s = re.sub(r'[òóôõö]', 'o', s)
    s = re.sub(r'[ùúûü]', 'u', s)
    s = re.sub(r'[^a-z0-9]', '_', s)
    return re.sub(r'_+', '_', s).strip('_')


def read_and_validate_excel(file_bytes: bytes, filename: str, entity_type: str) -> List[Dict[str, Any]]:
    """
    Lit un fichier Excel/CSV et vérifie la présence de TOUS les champs obligatoires.
    En cas de champ manquant, lève une HTTPException (422) contenant la liste détaillée.
    """
    if entity_type not in REQUIRED_SCHEMAS:
        raise HTTPException(
            status_code=status.HTTP400_BAD_REQUEST,
            detail=f"Type d'entité '{entity_type}' inconnu."
        )

    schema = REQUIRED_SCHEMAS[entity_type]

    # 1. Lecture du fichier selon l'extension
    try:
        if filename.endswith('.csv'):
            df = pd.read_csv(io.BytesIO(file_bytes))
        else:
            df = pd.read_excel(io.BytesIO(file_bytes))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP400_BAD_REQUEST,
            detail=f"Impossible de lire le fichier Excel/CSV : {str(e)}"
        )

    if df.empty:
        raise HTTPException(
            status_code=status.HTTP400_BAD_REQUEST,
            detail="Le fichier téléversé est vide."
        )

    # 2. Mappage et vérification des en-têtes
    raw_columns = list(df.columns)
    norm_columns = {col: normalize_string(col) for col in raw_columns}

    column_mapping = {}
    found_required = set()

    # Vérification des champs requis
    for req_field in schema["required"]:
        field_key = req_field["key"]
        alias_norms = [normalize_string(a) for a in req_field["aliases"]]

        matched_col = None
        for orig_col, norm_col in norm_columns.items():
            if norm_col in alias_norms:
                matched_col = orig_col
                break

        if matched_col:
            column_mapping[matched_col] = field_key
            found_required.add(field_key)

    # Vérification des champs optionnels
    for opt_field in schema["optional"]:
        field_key = opt_field["key"]
        alias_norms = [normalize_string(a) for a in opt_field["aliases"]]

        for orig_col, norm_col in norm_columns.items():
            if norm_col in alias_norms and orig_col not in column_mapping:
                column_mapping[orig_col] = field_key

    # 3. Détection des champs obligatoires manquants
    missing_fields = []
    missing_labels = []

    for req_field in schema["required"]:
        if req_field["key"] not in found_required:
            missing_fields.append(req_field["key"])
            missing_labels.append(f"{req_field['label']} ({req_field['key']})")

    if missing_fields:
        required_summary = [
            {"key": f["key"], "label": f["label"], "required": True}
            for f in schema["required"]
        ] + [
            {"key": f["key"], "label": f["label"], "required": False}
            for f in schema["optional"]
        ]

        raise HTTPException(
            status_code=status.HTTP422_UNPROCESSABLE_ENTITY,
            detail={
                "status": 422,
                "error": "MISSING_REQUIRED_FIELDS",
                "message": f"Le fichier Excel ne contient pas toutes les informations obligatoires pour {schema['label']}.",
                "missing_fields": missing_labels,
                "required_fields": required_summary,
                "instruction": f"Veuillez fournir un autre fichier Excel contenant la liste des champs suivants : {', '.join(missing_labels)}."
            }
        )

    # 4. Renommage et extraction des lignes valides
    df_filtered = df[list(column_mapping.keys())].rename(columns=column_mapping)
    rows = df_filtered.to_dict(orient="records")
    return rows


# ─── ROUTER FASTAPI À INCLURE DANS APPS ──────────────────────────────────────

excel_router = APIRouter(prefix="/api", tags=["Excel Import"])


@excel_router.post("/{entity_type}/import-excel")
async def import_excel_endpoint(entity_type: str, file: UploadFile = File(...)):
    """
    Endpoint universel d'importation Excel pour Prospects, Clients, Contrats, Sinistres, Objectifs.
    """
    contents = await file.read()
    rows = read_and_validate_excel(contents, file.filename, entity_type)

    # Ici, effectuez la sauvegarde en Base de Données (ex: ORM SQLAlchemy, SQL, etc.)
    # Ex: db.bulk_insert_mappings(Prospect, rows)

    return {
        "status": 200,
        "message": f"Importation réussie de {len(rows)} {entity_type}.",
        "imported_count": len(rows),
        "data": rows[:5]  # aperçu des 5 premières lignes
    }
