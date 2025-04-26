# %%
import pandas as pd
from sqlalchemy import create_engine

# %% [markdown]
# ### AHA Data

# %%
# core + capabilities
keep = [
    'ID',        # hospital_id
    'MNAME',     # name
    'MLOCADDR',  # address
    'MLOCCITY',  # city
    'MSTATE',    # state
    'MLOCZIP',   # zip
    'LAT',       # latitude
    'LONG',      # longitude
    'EMDEPHOS',  # ED present?
    'TRAUMHOS',  # trauma center?
    'TRAUML90',  # trauma level
    'HOSPBD',    # total beds
    'YEAR',      # year 
    # new capability columns:
    'CTSCNHOS',  # CT scanners
    'MSCTHOS',   # multislice CT <64
    'MSCTGHOS',  # multislice CT ≥64
    'MRIHOS',    # MRI units
    'PETCTHOS',  # PET/CT units
    'SPECTHOS',  # SPECT units
    'ULTSNHOS',  # ultrasound units
    'BRNBD',     # burn care beds
    'MSICBD',    # med/surg ICU beds
    'NICBD',     # neonatal ICU beds
    'PEDICBD'    # pediatric ICU beds
]

# %%
# Load the CSV file into a pandas DataFrame
aha_df = pd.read_csv('data/raw/albert_aha.csv', usecols=keep, encoding='latin1')

# Only keep year 2023
aha_df = aha_df[aha_df['YEAR'] == 2023]

# push to MySQL
engine = create_engine("mysql+pymysql://root:pass@localhost:3306/hospitals")
aha_df.to_sql('AHA_Hospitals', engine, if_exists='replace', index=False)


