/**
 * Seed sample data for SynapseFlow
 * Adds sample research papers to PostgreSQL for testing
 */

import pg from 'pg';
const { Client } = pg;

const POSTGRES_URL = process.env.POSTGRES_URL || 'postgresql://postgres:password@localhost:5432/synapseflow';

const samplePapers = [
  {
    id: 'paper-001',
    title: 'Attention Is All You Need',
    authors: ['Ashish Vaswani', 'Noam Shazeer', 'Niki Parmar', 'Jakob Uszkoreit', 'Llion Jones', 'Aidan N. Gomez', 'Lukasz Kaiser', 'Illia Polosukhin'],
    abstract: 'The dominant sequence transduction models are based on complex recurrent or convolutional neural networks. We propose a new simple network architecture, the Transformer, based solely on attention mechanisms.',
    year: 2017,
    citations: 80000,
    domains: ['NLP', 'Deep Learning', 'AI'],
    url: 'https://arxiv.org/abs/1706.03762',
  },
  {
    id: 'paper-002',
    title: 'BERT: Pre-training of Deep Bidirectional Transformers for Language Understanding',
    authors: ['Jacob Devlin', 'Ming-Wei Chang', 'Kenton Lee', 'Kristina Toutanova'],
    abstract: 'We introduce a new language representation model called BERT, which stands for Bidirectional Encoder Representations from Transformers.',
    year: 2018,
    citations: 65000,
    domains: ['NLP', 'Deep Learning', 'Transfer Learning'],
    url: 'https://arxiv.org/abs/1810.04805',
  },
  {
    id: 'paper-003',
    title: 'AlphaFold: Improved protein structure prediction using potentials from deep learning',
    authors: ['Andrew W. Senior', 'Richard Evans', 'John Jumper', 'et al.'],
    abstract: 'We provide the first computational method that can regularly predict protein structures with atomic accuracy.',
    year: 2020,
    citations: 15000,
    domains: ['Biology', 'Deep Learning', 'Protein Folding'],
    url: 'https://www.nature.com/articles/s41586-019-1923-7',
  },
  {
    id: 'paper-004',
    title: 'Generative Pre-trained Transformers (GPT-3)',
    authors: ['Tom B. Brown', 'Benjamin Mann', 'Nick Ryder', 'et al.'],
    abstract: 'We train GPT-3, an autoregressive language model with 175 billion parameters, and test its performance in the few-shot setting.',
    year: 2020,
    citations: 45000,
    domains: ['NLP', 'Deep Learning', 'Language Models'],
    url: 'https://arxiv.org/abs/2005.14165',
  },
  {
    id: 'paper-005',
    title: 'Deep Residual Learning for Image Recognition',
    authors: ['Kaiming He', 'Xiangyu Zhang', 'Shaoqing Ren', 'Jian Sun'],
    abstract: 'We present a residual learning framework to ease the training of networks that are substantially deeper than those used previously.',
    year: 2015,
    citations: 120000,
    domains: ['Computer Vision', 'Deep Learning'],
    url: 'https://arxiv.org/abs/1512.03385',
  },
  {
    id: 'paper-006',
    title: 'Quantum Supremacy using a Programmable Superconducting Processor',
    authors: ['Frank Arute', 'Kunal Arya', 'Ryan Babbush', 'et al.'],
    abstract: 'The promise of quantum computers is that certain computational tasks might be executed exponentially faster on a quantum processor than on a classical processor.',
    year: 2019,
    citations: 8000,
    domains: ['Quantum Computing', 'Physics'],
    url: 'https://www.nature.com/articles/s41586-019-1666-5',
  },
  {
    id: 'paper-007',
    title: 'Reinforcement Learning: An Introduction',
    authors: ['Richard S. Sutton', 'Andrew G. Barto'],
    abstract: 'This textbook provides a clear and simple account of the key ideas and algorithms of reinforcement learning.',
    year: 2018,
    citations: 50000,
    domains: ['Reinforcement Learning', 'Machine Learning'],
    url: 'http://incompleteideas.net/book/the-book-2nd.html',
  },
  {
    id: 'paper-008',
    title: 'ImageNet Classification with Deep Convolutional Neural Networks',
    authors: ['Alex Krizhevsky', 'Ilya Sutskever', 'Geoffrey E. Hinton'],
    abstract: 'We trained a large, deep convolutional neural network to classify the 1.2 million high-resolution images in the ImageNet LSVRC-2010 contest.',
    year: 2012,
    citations: 95000,
    domains: ['Computer Vision', 'Deep Learning'],
    url: 'https://papers.nips.cc/paper/4824-imagenet-classification-with-deep-convolutional-neural-networks',
  },
  {
    id: 'paper-009',
    title: 'Graph Neural Networks: A Review of Methods and Applications',
    authors: ['Jie Zhou', 'Ganqu Cui', 'Shengding Hu', 'et al.'],
    abstract: 'We provide a comprehensive overview of graph neural networks (GNNs) in data mining and machine learning fields.',
    year: 2020,
    citations: 12000,
    domains: ['Graph Neural Networks', 'Machine Learning'],
    url: 'https://arxiv.org/abs/1812.08434',
  },
  {
    id: 'paper-010',
    title: 'CRISPR-Cas9: A Revolutionary Gene Editing Technology',
    authors: ['Jennifer A. Doudna', 'Emmanuelle Charpentier'],
    abstract: 'The CRISPR-Cas9 system enables precise genome editing and has revolutionized biological research.',
    year: 2014,
    citations: 30000,
    domains: ['Biology', 'Genetics', 'Biotechnology'],
    url: 'https://science.sciencemag.org/content/346/6213/1258096',
  },
];

async function seedData() {
  const client = new Client({
    connectionString: POSTGRES_URL,
  });

  try {
    await client.connect();
    console.log('✓ Connected to PostgreSQL');

    // Insert sample papers
    console.log('\n📄 Inserting sample papers...');

    for (const paper of samplePapers) {
      await client.query(
        `INSERT INTO papers (id, title, authors, abstract, year, citations, domains, url)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (id) DO NOTHING`,
        [
          paper.id,
          paper.title,
          paper.authors,
          paper.abstract,
          paper.year,
          paper.citations,
          paper.domains,
          paper.url,
        ]
      );
      console.log(`  ✓ Inserted: ${paper.title}`);
    }

    // Insert sample user
    console.log('\n👤 Inserting sample user...');
    await client.query(
      `INSERT INTO users (email, name)
       VALUES ($1, $2)
       ON CONFLICT (email) DO NOTHING`,
      ['demo@synapseflow.ai', 'Demo User']
    );
    console.log('  ✓ Inserted demo user');

    // Insert sample queries
    console.log('\n🔍 Inserting sample research queries...');
    const sampleQueries = [
      'transformer applications in biology',
      'quantum computing in cryptography',
      'reinforcement learning for robotics',
      'graph neural networks for drug discovery',
    ];

    for (const query of sampleQueries) {
      await client.query(
        `INSERT INTO research_queries (user_id, query, domains, results_count, latency_ms)
         VALUES (1, $1, $2, $3, $4)`,
        [query, ['AI', 'Biology'], Math.floor(Math.random() * 1000) + 100, Math.floor(Math.random() * 500) + 200]
      );
      console.log(`  ✓ Inserted query: ${query}`);
    }

    // Get stats
    const paperCount = await client.query('SELECT COUNT(*) FROM papers');
    const userCount = await client.query('SELECT COUNT(*) FROM users');
    const queryCount = await client.query('SELECT COUNT(*) FROM research_queries');

    console.log('\n✅ Seed data inserted successfully!');
    console.log(`\nDatabase stats:`);
    console.log(`  Papers: ${paperCount.rows[0].count}`);
    console.log(`  Users: ${userCount.rows[0].count}`);
    console.log(`  Queries: ${queryCount.rows[0].count}`);
  } catch (error) {
    console.error('❌ Error seeding data:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

seedData();
