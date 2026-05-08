---
sidebar_position: 99
title: Citations
---

# Academic & Technical Citations

All citations used in the CAL-Log codebase, organised by category.

## Published Research

```bibtex
@INPROCEEDINGS{11454245,
  author={Kariyakaranage, Vihanga Supasan and Athuraliya, Banuka},
  booktitle={2026 International Conference on Artificial Intelligence in Information and Communication (ICAIIC)}, 
  title={AL-X0: Cost-Aware Active Learning for Cloud-Scale NLP via Zero-Shot Proxy Valuation}, 
  year={2026},
  volume={},
  number={},
  pages={657-662},
  keywords={Cloud computing;Adaptation models;Uncertainty;Costs;Annotations;Active learning;Text categorization;Brain modeling;Calibration;Cost accounting;Active learning;cost-aware learning;text classification;annotation efficiency;cloud computing},
  doi={10.1109/ICAIIC68212.2026.11454245}}

@INPROCEEDINGS{11499970,
  author={Kariyakaranage, Vihanga Supasan and Athuraliya, Banuka},
  booktitle={2026 IEEE International Research Conference on Smart Computing and Systems Engineering (SCSE)}, 
  title={CAL-Log: Calibration-Aware Logarithmic Cost Modeling for Active Learning in Low-Resource NLP}, 
  year={2026},
  volume={9},
  number={},
  pages={1-6},
  keywords={Filtering;Filters;Active filters;Band-pass filters;Protocols;HTTP;Modulation;Radio access networks;Regional area networks;Communication systems;Active learning;cost-aware annotation;text classification;low-resource language;model calibration},
  doi={10.1109/SCSE70081.2026.11499970}}

@INPROCEEDINGS{11502457,
  author={Kariyakaranage, Vihanga Supasan and Athuraliya, Banuka},
  booktitle={2026 IEEE 15th International Conference on Communication Systems and Network Technologies (CSNT)}, 
  title={Boundary Conditions of Cost-Aware Active Learning: A Multi-Dataset Taxonomy of Calibration and Length-Variance Failure Modes}, 
  year={2026},
  volume={},
  number={},
  pages={1317-1322},
  keywords={Telemetry;Aerospace and electronic systems;Communication systems;Protocols;Telemetry;Data communication;HTTP;Diversity methods;Communications technology;Active learning;Active Learning;Natural Language Processing;Computer Vision and AI;Data Mining;Text Classification},
  doi={10.1109/CSNT69054.2026.11502457}}

@INPROCEEDINGS{acl2026srw_callog,
  author={Kariyakaranage, Vihanga Supasan and Athuraliya, Banuka},
  booktitle={Proceedings of the 64th Annual Meeting of the Association for Computational Linguistics: Student Research Workshop (ACL SRW)},
  title={CAL-Log: Cost-Aware Active Learning with Logarithmic Cognitive Effort Modeling and Online Adaptation to Human Annotation Behavior},
  year={2026},
  address={San Diego, California, United States}
}
```

---

## Python / Machine Learning

| Library | Function | Purpose | Source |
|---------|----------|---------|--------|
| NumPy | `np.log1p()` | ln(1+x) with precision near zero | [numpy.log1p](https://numpy.org/doc/stable/reference/generated/numpy.log1p.html) |
| NumPy | `np.linalg.lstsq()` | OLS regression solver | [numpy.linalg.lstsq](https://numpy.org/doc/stable/reference/generated/numpy.linalg.lstsq.html) |
| NumPy | `np.mean()`, `np.std()` | Statistical aggregation | [numpy.mean](https://numpy.org/doc/stable/reference/generated/numpy.mean.html) |
| NumPy | `np.argsort()` | Indices for sorted array | [numpy.argsort](https://numpy.org/doc/stable/reference/generated/numpy.argsort.html) |
| NumPy | `np.argmax()` | Index of maximum value | [numpy.argmax](https://numpy.org/doc/stable/reference/generated/numpy.argmax.html) |
| NumPy | `np.column_stack()` | Build design matrix for OLS | [numpy.column_stack](https://numpy.org/doc/stable/reference/generated/numpy.column_stack.html) |
| scikit-learn | `HashingVectorizer` | Stateless text vectorisation | [HashingVectorizer](https://scikit-learn.org/stable/modules/generated/sklearn.feature_extraction.text.HashingVectorizer.html) |
| scikit-learn | `SGDClassifier` | Online logistic regression | [SGDClassifier](https://scikit-learn.org/stable/modules/generated/sklearn.linear_model.SGDClassifier.html) |
| scikit-learn | `partial_fit()` | Incremental/online learning | [SGDClassifier.partial_fit](https://scikit-learn.org/stable/modules/generated/sklearn.linear_model.SGDClassifier.html#sklearn.linear_model.SGDClassifier.partial_fit) |
| scikit-learn | `TfidfVectorizer` | Text-to-TF-IDF features | [TfidfVectorizer](https://scikit-learn.org/stable/modules/generated/sklearn.feature_extraction.text.TfidfVectorizer.html) |
| scikit-learn | `cosine_similarity()` | Pairwise text similarity | [cosine_similarity](https://scikit-learn.org/stable/modules/generated/sklearn.metrics.pairwise.cosine_similarity.html) |
| Flask | `@app.route()` | URL routing | [Flask Quickstart](https://flask.palletsprojects.com/en/latest/quickstart/#routing) |
| Flask | `jsonify()` | JSON response builder | [Flask jsonify](https://flask.palletsprojects.com/en/latest/api/#flask.json.jsonify) |
| Flask | `request.json` | Parse POST body | [Flask Request](https://flask.palletsprojects.com/en/latest/api/#flask.Request) |
| Flask-CORS | `CORS(app)` | Cross-origin requests | [Flask-CORS](https://flask-cors.readthedocs.io/) |

---

## Python Standard Library

| Module | Function | Purpose |
|--------|----------|---------|
| `logging` | `getLogger()` | Named logger per module |
| `json` | `json.load()`, `json.dump()` | JSON file I/O |
| `os.path` | `dirname()`, `abspath()`, `exists()` | File path resolution |
| `sys` | `sys.path.append()` | Module search path |
| `random` | `random.shuffle()`, `random.sample()` | Randomisation |
| `re` | `re.sub()` | Text preprocessing |
| `typing` | `List`, `Dict`, `Any` | Type hints |
| `traceback` | `format_exc()` | Exception logging |

---

## Node.js / Express

| Package | Function | Purpose | Source |
|---------|----------|---------|--------|
| Express | `express.json()` | JSON body parsing | [Express docs](https://expressjs.com/en/api.html) |
| Express | `app.use()` | Middleware mounting | [Express middleware](https://expressjs.com/en/guide/using-middleware.html) |
| Mongoose | `findOneAndUpdate()` | Atomic upsert | [Mongoose API](https://mongoosejs.com/docs/api/model.html#Model.findOneAndUpdate()) |
| Mongoose | `findOne()` | Single document query | [Mongoose API](https://mongoosejs.com/docs/api/model.html#Model.findOne()) |
| Mongoose | `deleteMany()` | Bulk delete | [Mongoose API](https://mongoosejs.com/docs/api/model.html#Model.deleteMany()) |
| Mongoose | `insertMany()` | Bulk insert | [Mongoose API](https://mongoosejs.com/docs/api/model.html#Model.insertMany()) |
| Mongoose | Schema validators | `enum`, `min`, `max`, `required` | [Mongoose Validation](https://mongoosejs.com/docs/validation.html) |
| Mongoose | `pre('save')` | Pre-save middleware | [Mongoose Middleware](https://mongoosejs.com/docs/middleware.html) |
| MongoDB | `$set`, `$push` | Atomic update operators | [MongoDB Update Operators](https://www.mongodb.com/docs/manual/reference/operator/update/) |
| cors | `cors()` | CORS middleware | [cors npm](https://www.npmjs.com/package/cors) |
| dotenv | `config()` | Environment variable loader | [dotenv npm](https://www.npmjs.com/package/dotenv) |

---

## React / Frontend

| Package | Function | Purpose | Source |
|---------|----------|---------|--------|
| React | `useState`, `useEffect`, `useRef`, `useCallback` | State & lifecycle hooks | [React Hooks](https://react.dev/reference/react/hooks) |
| React Router | `BrowserRouter`, `Routes`, `Route`, `Link` | Client-side routing | [React Router](https://reactrouter.com/) |
| Recharts | `LineChart`, `BarChart`, `ResponsiveContainer` | Data visualisation | [Recharts](https://recharts.org/) |
| Lucide React | Icon components | SVG icons | [Lucide](https://lucide.dev/) |
| react-joyride | `Joyride` | Onboarding tour | [react-joyride](https://docs.react-joyride.com/) |
| Vite | `import.meta.env` | Environment variables | [Vite Env](https://vitejs.dev/guide/env-and-mode.html) |

---

## Web APIs

| API | Function | Purpose | Source |
|-----|----------|---------|--------|
| Fetch API | `fetch()` | HTTP requests | [MDN Fetch](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API) |
| AbortController | `abort()` | Cancel network requests | [MDN AbortController](https://developer.mozilla.org/en-US/docs/Web/API/AbortController) |
| Web Storage | `localStorage` | Tour state persistence | [MDN localStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage) |
| Blob API | `new Blob()` | Client-side file generation | [MDN Blob](https://developer.mozilla.org/en-US/docs/Web/API/Blob) |
| URL API | `URL.createObjectURL()` | Download link creation | [MDN URL](https://developer.mozilla.org/en-US/docs/Web/API/URL/createObjectURL_static) |
| Date | `Date.now()` | Millisecond timestamps | [MDN Date.now](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/now) |

---

## Security

| Standard | Header/Technique | Purpose | Source |
|----------|-----------------|---------|--------|
| OWASP | `X-Content-Type-Options: nosniff` | Prevent MIME sniffing | [OWASP Secure Headers](https://owasp.org/www-project-secure-headers/) |
| OWASP | `X-Frame-Options: DENY` | Block clickjacking | [MDN X-Frame-Options](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Frame-Options) |
| OWASP | `Strict-Transport-Security` | Force HTTPS | [MDN HSTS](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Strict-Transport-Security) |
| CORS | Preflight OPTIONS | Cross-origin access control | [MDN Preflight](https://developer.mozilla.org/en-US/docs/Glossary/Preflight_request) |
