import React from 'react';
import styles from './styles.module.css';

const publications = [
  {
    tag: 'IEEE ICAIIC 2026',
    tagColor: '#0077b6',
    title: 'AL-X0: Cost-Aware Active Learning for Cloud-Scale NLP via Zero-Shot Proxy Valuation',
    authors: 'V. S. Kariyakaranage, B. Athuraliya',
    venue: 'International Conference on Artificial Intelligence in Information and Communication',
    pages: 'pp. 657-662',
    year: '2026',
    doi: '10.1109/ICAIIC68212.2026.11454245',
    doiUrl: 'https://doi.org/10.1109/ICAIIC68212.2026.11454245',
    ieeeUrl: 'https://ieeexplore.ieee.org/document/11454245',
    abstract: 'Introduces AL-X0, a cost-aware active learning framework that uses zero-shot proxy models to estimate annotation value for cloud-scale NLP text classification, reducing total annotation cost while maintaining model accuracy.',
    keywords: ['Active Learning', 'Cost-Aware', 'Zero-Shot', 'Cloud Computing', 'NLP'],
    status: 'published',
  },
  {
    tag: 'IEEE SCSE 2026',
    tagColor: '#00838f',
    title: 'CAL-Log: Calibration-Aware Logarithmic Cost Modeling for Active Learning in Low-Resource NLP',
    authors: 'V. S. Kariyakaranage, B. Athuraliya',
    venue: 'IEEE International Research Conference on Smart Computing and Systems Engineering',
    pages: 'vol. 9, pp. 1-6',
    year: '2026',
    doi: '10.1109/SCSE70081.2026.11499970',
    doiUrl: 'https://doi.org/10.1109/SCSE70081.2026.11499970',
    ieeeUrl: 'https://ieeexplore.ieee.org/document/11499970',
    abstract: 'Proposes a calibration-aware logarithmic cost model for active learning that accounts for annotator reading speed and cognitive fatigue, demonstrating improved annotation efficiency in low-resource NLP settings.',
    keywords: ['Cost Modelling', 'Calibration', 'Low-Resource NLP', 'Active Learning', 'Annotation'],
    status: 'published',
  },
  {
    tag: 'IEEE CSNT 2026',
    tagColor: '#4a148c',
    title: 'Boundary Conditions of Cost-Aware Active Learning: A Multi-Dataset Taxonomy of Calibration and Length-Variance Failure Modes',
    authors: 'V. S. Kariyakaranage, B. Athuraliya',
    venue: 'IEEE 15th International Conference on Communication Systems and Network Technologies',
    pages: 'pp. 1317-1322',
    year: '2026',
    doi: '10.1109/CSNT69054.2026.11502457',
    doiUrl: 'https://doi.org/10.1109/CSNT69054.2026.11502457',
    ieeeUrl: 'https://ieeexplore.ieee.org/document/11502457',
    abstract: 'Systematically identifies boundary conditions and failure modes of cost-aware active learning across 10 datasets, providing a taxonomy of calibration errors and text-length variance effects that impact annotation efficiency.',
    keywords: ['Failure Modes', 'Calibration', 'Multi-Dataset', 'Taxonomy', 'Active Learning'],
    status: 'published',
  },
  {
    tag: 'ACL 2026 SRW',
    tagColor: '#c62828',
    title: 'CAL-Log: Cost-Aware Active Learning with Logarithmic Cognitive Effort Modeling and Online Adaptation to Human Annotation Behavior',
    authors: 'V. S. Kariyakaranage, B. Athuraliya',
    venue: '64th Annual Meeting of the Association for Computational Linguistics - Student Research Workshop',
    pages: 'San Diego, California, USA',
    year: '2026',
    doi: null,
    doiUrl: null,
    ieeeUrl: null,
    abstract: 'Presents the full CAL-Log framework with online adaptation to human annotation behaviour, incorporating real-time OLS regression for reading speed estimation and logarithmic cognitive effort modelling across diverse text classification tasks.',
    keywords: ['Cognitive Modelling', 'Online Adaptation', 'Human Annotation', 'ACL', 'Active Learning'],
    status: 'accepted',
  },
];

function PublicationCard({ pub }) {
  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <span className={styles.tag} style={{ backgroundColor: pub.tagColor }}>
          {pub.tag}
        </span>
        <span className={`${styles.status} ${pub.status === 'accepted' ? styles.statusAccepted : styles.statusPublished}`}>
          {pub.status === 'accepted' ? 'Accepted' : 'Published'}
        </span>
      </div>
      <h3 className={styles.cardTitle}>{pub.title}</h3>
      <p className={styles.authors}>{pub.authors}</p>
      <p className={styles.venue}>
        <span className={styles.venueIcon}>📄</span>
        {pub.venue}, {pub.pages} ({pub.year})
      </p>
      <p className={styles.abstract}>{pub.abstract}</p>
      <div className={styles.keywords}>
        {pub.keywords.map((kw, i) => (
          <span key={i} className={styles.keyword}>{kw}</span>
        ))}
      </div>
      <div className={styles.cardActions}>
        {pub.doiUrl && (
          <a href={pub.doiUrl} target="_blank" rel="noopener noreferrer" className={styles.btnDoi}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
            DOI: {pub.doi}
          </a>
        )}
        {pub.ieeeUrl && (
          <a href={pub.ieeeUrl} target="_blank" rel="noopener noreferrer" className={styles.btnIeee}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
            IEEE Xplore
          </a>
        )}
        {!pub.doiUrl && !pub.ieeeUrl && (
          <span className={styles.comingSoon}>Proceedings forthcoming</span>
        )}
      </div>
    </div>
  );
}

export default function PublicationCards() {
  return (
    <div className={styles.container}>
      <div className={styles.grid}>
        {publications.map((pub, i) => (
          <PublicationCard key={i} pub={pub} />
        ))}
      </div>
    </div>
  );
}
