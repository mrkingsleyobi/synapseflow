#!/bin/bash

# SynapseFlow Database Initialization Script
# Initializes PostgreSQL, Redis, Neo4j, and AgentDB

set -e

echo "🚀 Initializing SynapseFlow Databases..."

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Error: Docker is not running. Please start Docker and try again."
    exit 1
fi

# Start databases with Docker Compose
echo -e "${BLUE}Starting database services...${NC}"
cd "$(dirname "$0")/.."
docker-compose up -d postgres redis neo4j

# Wait for services to be ready
echo -e "${BLUE}Waiting for databases to be ready...${NC}"
sleep 10

# Initialize PostgreSQL
echo -e "${BLUE}Initializing PostgreSQL...${NC}"
docker-compose exec -T postgres psql -U postgres -d synapseflow <<-EOSQL
    -- Create pgvector extension
    CREATE EXTENSION IF NOT EXISTS vector;

    -- Create papers table
    CREATE TABLE IF NOT EXISTS papers (
        id VARCHAR(255) PRIMARY KEY,
        title TEXT NOT NULL,
        authors TEXT[] NOT NULL,
        abstract TEXT,
        year INTEGER,
        citations INTEGER DEFAULT 0,
        domains TEXT[],
        url TEXT,
        embedding vector(1024),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Create index on embedding for faster vector search
    CREATE INDEX IF NOT EXISTS papers_embedding_idx ON papers USING ivfflat (embedding vector_cosine_ops);

    -- Create users table
    CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Create research_queries table
    CREATE TABLE IF NOT EXISTS research_queries (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        query TEXT NOT NULL,
        domains TEXT[],
        results_count INTEGER,
        latency_ms INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Create indexes
    CREATE INDEX IF NOT EXISTS idx_papers_year ON papers(year);
    CREATE INDEX IF NOT EXISTS idx_papers_citations ON papers(citations);
    CREATE INDEX IF NOT EXISTS idx_research_queries_user_id ON research_queries(user_id);
    CREATE INDEX IF NOT EXISTS idx_research_queries_created_at ON research_queries(created_at);

    EOSQL

echo -e "${GREEN}✓ PostgreSQL initialized${NC}"

# Initialize Neo4j (citation graph)
echo -e "${BLUE}Initializing Neo4j...${NC}"
docker-compose exec -T neo4j cypher-shell -u neo4j -p password <<-EOCYPHER || true
    // Create constraints
    CREATE CONSTRAINT paper_id IF NOT EXISTS FOR (p:Paper) REQUIRE p.id IS UNIQUE;

    // Create indexes
    CREATE INDEX paper_title IF NOT EXISTS FOR (p:Paper) ON (p.title);
    CREATE INDEX paper_year IF NOT EXISTS FOR (p:Paper) ON (p.year);
EOCYPHER

echo -e "${GREEN}✓ Neo4j initialized${NC}"

# Initialize Redis
echo -e "${BLUE}Initializing Redis...${NC}"
docker-compose exec -T redis redis-cli PING

echo -e "${GREEN}✓ Redis initialized${NC}"

# Create AgentDB directory
echo -e "${BLUE}Creating AgentDB directory...${NC}"
mkdir -p data/agentdb
chmod -R 755 data

echo -e "${GREEN}✓ AgentDB directory created${NC}"

echo ""
echo -e "${GREEN}✅ All databases initialized successfully!${NC}"
echo ""
echo "Database URLs:"
echo "  PostgreSQL: postgresql://postgres:password@localhost:5432/synapseflow"
echo "  Redis:      redis://localhost:6379"
echo "  Neo4j:      bolt://localhost:7687 (user: neo4j, pass: password)"
echo "  AgentDB:    ./data/agentdb"
echo ""
echo "Next steps:"
echo "  1. Run 'npm run dev' from the backend directory"
echo "  2. Run 'npm run dev' from the frontend directory"
echo "  3. Run 'npm run dev' from the mcp-server directory"
