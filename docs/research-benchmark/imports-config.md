---
sidebar_position: 1
title: Imports and Configuration
---

# Imports and Environment Configuration

The script begins by setting up the Python environment, ensuring required libraries are present, and configuring hardware acceleration.

```python
# ======================================================================================
# IMPORTS AND CONFIGURATION
# ======================================================================================

import os
import sys
import time
import html
import re
import warnings
import numpy as np
import pandas as pd
import torch
import torch.nn as nn
import random

# Auto‑install missing libraries (only if needed)
try:
    import google.protobuf
    from sentence_transformers import SentenceTransformer
except ImportError:
    print("Fixing Libraries...")
    os.system("pip install --upgrade --force-reinstall transformers sentence-transformers accelerate")
    print("Libraries updated. RESTART RUNTIME if you see errors.")

from sklearn.metrics import f1_score, accuracy_score, pairwise_distances
from sklearn.utils.class_weight import compute_class_weight
from transformers import (
    AutoTokenizer, AutoModelForSequenceClassification,
    DataCollatorWithPadding, logging as hf_logging
)
from datasets import load_dataset
from torchmetrics.classification import CalibrationError
from torch.utils.data import Dataset, DataLoader
from huggingface_hub import login
```

:::danger[Architectural Rationale]
**Hugging Face Integration (`transformers`, `datasets`)**
Hugging Face standardizes the data loading and tokenization process across our 10 diverse datasets. Constructing native PyTorch `DataLoader` objects for raw text requires developing custom, dataset-specific tokenization, truncation, and batch-padding logic. By abstracting this to Hugging Face pipelines, we strictly isolate and benchmark the Active Learning algorithm itself, empirically proving that performance gains are algorithmic rather than artifacts of custom data ingestion pipelines.
:::

```python
warnings.filterwarnings("ignore")
hf_logging.set_verbosity_error()

DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")
print(f"CAL-LOG RESEARCH BENCHMARK | Device: {DEVICE}")

try:
    login(token="hf_REDACTED_TOKEN_FOR_SECURITY")
    print("Logged into Hugging Face.")
except Exception:
    pass
```

:::danger[Architectural Rationale]
**Warning Suppression (`filterwarnings`, `set_verbosity_error`)**
The Transformers library is inherently verbose during `AutoModel` initialization. Executing 30 active learning rounds across 8 strategies and 10 datasets results in thousands of initializations. Allowing these warnings to print to standard output would cause severe blocking I/O bottlenecks on the main execution thread, unnecessarily extending the 48-hour continuous compute time and polluting empirical metric traces.
:::
