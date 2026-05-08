---
sidebar_position: 1
title: 1. Imports and Configuration
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

:::danger Architectural Rationale
**Hugging Face Integration**: Hugging Face standardizes the loading process across our 10 diverse datasets. Using native PyTorch `DataLoader` for raw text requires custom tokenization and batch padding logic for every single dataset format. The goal of this benchmark is to test the Active Learning algorithm, not to build custom data ingestion pipelines.

**Warning Suppression (`filterwarnings`)**: The Transformers library is extremely verbose regarding model initialization. Over 30 active learning rounds across 10 datasets, this would flood the console, causing severe I/O bottlenecks and making it impossible to monitor the actual cost and F1 metrics in real-time.
:::
