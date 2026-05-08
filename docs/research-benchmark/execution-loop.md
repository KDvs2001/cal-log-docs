---
sidebar_position: 6
title: 6. Execution Loop
---

# Execution Loop & Study Benchmarking

The final orchestrator that runs the cross-product of datasets and strategies, ensuring completely deterministic behavior.

```python
# ======================================================================================
# EXECUTION LOOP
# ======================================================================================

def run_study():
    SEED = 42
    random.seed(SEED)
    np.random.seed(SEED)
    torch.manual_seed(SEED)
    if torch.cuda.is_available(): torch.cuda.manual_seed_all(SEED)

    datasets = [
        ("tweet_eval", "stance_climate"), ("rotten_tomatoes", "default"),
        ("dair-ai/emotion", "split"), ("ag_news", "default"),
        ("stanfordnlp/imdb", "plain_text"), ("yelp_polarity", "plain_text"),
        ("amazon_polarity", "amazon_polarity"), ("dbpedia_14", "dbpedia_14"),
        ("yahoo_answers_topics", "yahoo_answers_topics"), ("SetFit/20_newsgroups", "default")
    ]

    strategies = ["Random", "Entropy", "LeastConfidence", "Margin", "CoreSet", "BADGE", "CAL-Linear", "CAL-Log"]
    all_res = []

    print("STARTING FULL-SCALE BENCHMARK (10 Datasets, 30 Rounds)")

    for ds_name, ds_cfg in datasets:
        time.sleep(3)
        data = DatasetFactory.load(ds_name, ds_cfg)
        if not data: continue

        for s in strategies:
            print(f"\n>>> {ds_name} : {s}")
            torch.cuda.empty_cache()
            agent = CostAgent(data, ds_name, strategy=s)
            
            for r in range(30):
                if not agent.step(r, 20): break
            all_res.extend(agent.history)

    pd.DataFrame(all_res).to_csv("cal_log_full_benchmark_v2.csv", index=False)
    print("DONE. Saved to cal_log_full_benchmark_v2.csv")

if __name__ == "__main__":
    run_study()
```

:::danger Architectural Rationale
**Multi-Engine Deterministic Seeding**: Active learning evaluation requires strict stochastic control. Machine learning stochasticity operates at multiple independent execution levels: Python's standard `random`, NumPy vector shuffling, PyTorch CPU tensor initialization, and PyTorch CUDA kernel execution. Explicitly seeding all four engines guarantees absolute reproducibility—independent execution will yield identical F1 and Cost trace trajectories.

**Explicit VRAM Cache Flushing (`empty_cache`)**: Active learning simulations require cyclic allocation and deallocation of model parameters within VRAM. Over 30 rounds and 8 strategies, PyTorch's native memory allocator suffers from severe memory fragmentation. Explicitly flushing the CUDA cache at the strategy boundary structurally prevents `CUDA OutOfMemory` exceptions from destroying a 48-hour continuous benchmark.
:::
