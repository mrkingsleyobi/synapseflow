'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useResearch, useResearchStore } from '@/lib/hooks'
import type { ResearchQuery } from '@/lib/api-client'
import { SearchInterface } from '@/components/SearchInterface'
import { PaperCard } from '@/components/PaperCard'
import { AgentStatus } from '@/components/AgentStatus'
import { CitationGraph } from '@/components/CitationGraph'
import { Loader2, AlertCircle, Sparkles, TrendingUp, Lightbulb, Network } from 'lucide-react'

export default function ResearchPage() {
  const searchParams = useSearchParams()
  const { mutate: research, isPending, data, error } = useResearch()
  const { setResults, setLoading, setError: setStoreError } = useResearchStore()

  const [activeTab, setActiveTab] = useState<'papers' | 'graph' | 'insights' | 'hypotheses'>('papers')

  useEffect(() => {
    const query = searchParams.get('q')
    const domainsParam = searchParams.get('domains')

    if (query) {
      const domains = domainsParam ? domainsParam.split(',') : []

      const researchQuery: ResearchQuery = {
        query,
        domains: domains.length > 0 ? domains : undefined,
        crossDomain: true,
        selfLearning: true,
        limit: 50,
      }

      setLoading(true)
      research(researchQuery, {
        onSuccess: (data) => {
          setResults(data)
          setLoading(false)
        },
        onError: (error) => {
          setStoreError(error as Error)
          setLoading(false)
        },
      })
    }
  }, [searchParams, research, setResults, setLoading, setStoreError])

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Search Interface */}
      <div className="mb-8">
        <SearchInterface />
      </div>

      {/* Loading State */}
      {isPending && (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
          <h3 className="text-xl font-semibold mb-2">Orchestrating 66 AI Agents...</h3>
          <p className="text-muted-foreground text-center max-w-md">
            Searching across 100M+ papers, analyzing cross-domain connections, and generating insights
          </p>
          <div className="mt-8 w-full max-w-2xl">
            <AgentStatus />
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="flex flex-col items-center justify-center py-20">
          <AlertCircle className="h-12 w-12 text-destructive mb-4" />
          <h3 className="text-xl font-semibold mb-2">Research Failed</h3>
          <p className="text-muted-foreground text-center max-w-md">
            {error.message || 'An error occurred during research. Please try again.'}
          </p>
        </div>
      )}

      {/* Results */}
      {data && !isPending && (
        <div className="space-y-8">
          {/* Summary Header */}
          <div className="p-6 rounded-lg bg-card border">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
              <div>
                <h2 className="text-2xl font-bold mb-2">Research Results</h2>
                <p className="text-muted-foreground">
                  Found {data.totalResults} papers in {data.latency}
                </p>
              </div>
              <div className="text-right">
                <div className="text-sm text-muted-foreground mb-1">Agents Used</div>
                <div className="flex flex-wrap gap-1">
                  {data.agentsUsed.map((agent) => (
                    <span
                      key={agent}
                      className="px-2 py-1 rounded-md bg-primary/10 text-primary text-xs font-medium"
                    >
                      {agent}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b">
            <div className="flex gap-4">
              <button
                onClick={() => setActiveTab('papers')}
                className={`px-4 py-2 border-b-2 font-medium transition-colors ${
                  activeTab === 'papers'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <span className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  Papers ({data.papers.length})
                </span>
              </button>

              <button
                onClick={() => setActiveTab('graph')}
                className={`px-4 py-2 border-b-2 font-medium transition-colors ${
                  activeTab === 'graph'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <span className="flex items-center gap-2">
                  <Network className="h-4 w-4" />
                  Citation Graph
                </span>
              </button>

              {data.crossDomainInsights && data.crossDomainInsights.length > 0 && (
                <button
                  onClick={() => setActiveTab('insights')}
                  className={`px-4 py-2 border-b-2 font-medium transition-colors ${
                    activeTab === 'insights'
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Cross-Domain Insights ({data.crossDomainInsights.length})
                  </span>
                </button>
              )}

              {data.hypotheses && data.hypotheses.length > 0 && (
                <button
                  onClick={() => setActiveTab('hypotheses')}
                  className={`px-4 py-2 border-b-2 font-medium transition-colors ${
                    activeTab === 'hypotheses'
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Lightbulb className="h-4 w-4" />
                    Hypotheses ({data.hypotheses.length})
                  </span>
                </button>
              )}
            </div>
          </div>

          {/* Tab Content */}
          <div>
            {activeTab === 'papers' && (
              <div className="space-y-4">
                {data.papers.map((paper, index) => (
                  <PaperCard key={paper.id} paper={paper} rank={index + 1} />
                ))}
              </div>
            )}

            {activeTab === 'graph' && (
              <div className="space-y-4">
                <div className="p-6 rounded-lg bg-card border">
                  <h3 className="text-xl font-semibold mb-4">Citation Network Visualization</h3>
                  <p className="text-muted-foreground mb-6">
                    Interactive force-directed graph showing citation relationships between papers.
                    Node size indicates citation count or PageRank. Drag nodes to explore connections.
                  </p>
                  <CitationGraph
                    papers={data.papers}
                    citationGraph={data.citationGraph}
                    width={1200}
                    height={800}
                  />
                </div>
              </div>
            )}

            {activeTab === 'insights' && data.crossDomainInsights && (
              <div className="space-y-4">
                {data.crossDomainInsights.map((insight, index) => (
                  <div
                    key={index}
                    className="p-6 rounded-lg bg-card border"
                  >
                    <h3 className="text-lg font-semibold mb-2">
                      Cross-Domain Connection #{index + 1}
                    </h3>
                    <pre className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {JSON.stringify(insight, null, 2)}
                    </pre>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'hypotheses' && data.hypotheses && (
              <div className="space-y-4">
                {data.hypotheses.map((hypothesis, index) => (
                  <div
                    key={index}
                    className="p-6 rounded-lg bg-card border hover:shadow-lg transition-shadow"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Lightbulb className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold mb-2">
                          Hypothesis #{index + 1}
                        </h3>
                        <p className="text-foreground">{hypothesis}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
