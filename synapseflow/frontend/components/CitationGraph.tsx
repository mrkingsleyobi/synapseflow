'use client'

import { useEffect, useRef, useState } from 'react'
import * as d3 from 'd3'
import { ZoomIn, ZoomOut, Maximize2, Download } from 'lucide-react'

interface Node extends d3.SimulationNodeDatum {
  id: string
  title: string
  year?: number
  citations?: number
  domains?: string[]
  pageRank?: number
  group?: number
}

interface Link extends d3.SimulationLinkDatum<Node> {
  source: string | Node
  target: string | Node
  value?: number
}

interface CitationGraphProps {
  papers: any[]
  citationGraph?: any
  width?: number
  height?: number
}

export function CitationGraph({ papers, citationGraph, width = 1200, height = 800 }: CitationGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [zoom, setZoom] = useState(1)
  const [selectedNode, setSelectedNode] = useState<Node | null>(null)

  useEffect(() => {
    if (!svgRef.current || !papers || papers.length === 0) return

    // Clear previous graph
    d3.select(svgRef.current).selectAll('*').remove()

    // Process data into nodes and links
    const { nodes, links } = processGraphData(papers, citationGraph)

    // Create SVG
    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', [0, 0, width, height])
      .attr('style', 'max-width: 100%; height: auto;')

    // Add zoom behavior
    const g = svg.append('g')

    const zoomBehavior = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform)
        setZoom(event.transform.k)
      })

    svg.call(zoomBehavior as any)

    // Define arrow markers for links
    svg.append('defs').selectAll('marker')
      .data(['citation'])
      .join('marker')
      .attr('id', d => `arrow-${d}`)
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 20)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('fill', '#999')
      .attr('d', 'M0,-5L10,0L0,5')

    // Create force simulation
    const simulation = d3.forceSimulation<Node>(nodes)
      .force('link', d3.forceLink<Node, Link>(links)
        .id(d => d.id)
        .distance(100))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(30))

    // Create links
    const link = g.append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('class', 'link')
      .attr('stroke', '#999')
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', d => Math.sqrt((d.value || 1)))
      .attr('marker-end', 'url(#arrow-citation)')

    // Create nodes
    const node = g.append('g')
      .attr('class', 'nodes')
      .selectAll('g')
      .data(nodes)
      .join('g')
      .attr('class', 'node')
      .call(drag(simulation) as any)

    // Node circles
    node.append('circle')
      .attr('r', d => getNodeRadius(d))
      .attr('fill', d => getNodeColor(d))
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)
      .style('cursor', 'pointer')
      .on('mouseover', handleMouseOver)
      .on('mouseout', handleMouseOut)
      .on('click', handleClick)

    // Node labels
    node.append('text')
      .text(d => truncateTitle(d.title, 30))
      .attr('x', 0)
      .attr('y', d => getNodeRadius(d) + 15)
      .attr('text-anchor', 'middle')
      .attr('font-size', '10px')
      .attr('fill', 'currentColor')
      .style('pointer-events', 'none')

    // PageRank indicator (if available)
    node.filter(d => d.pageRank && d.pageRank > 0.01)
      .append('circle')
      .attr('r', d => getNodeRadius(d) + 5)
      .attr('fill', 'none')
      .attr('stroke', '#FFD700')
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', '5,5')
      .style('pointer-events', 'none')

    // Tooltip
    const tooltip = d3.select('body')
      .append('div')
      .attr('class', 'graph-tooltip')
      .style('position', 'absolute')
      .style('visibility', 'hidden')
      .style('background-color', 'rgba(0, 0, 0, 0.8)')
      .style('color', 'white')
      .style('padding', '10px')
      .style('border-radius', '5px')
      .style('font-size', '12px')
      .style('z-index', '1000')
      .style('max-width', '300px')

    function handleMouseOver(event: any, d: Node) {
      // Highlight connected nodes
      const connectedNodeIds = new Set<string>()
      links.forEach(link => {
        const source = typeof link.source === 'object' ? link.source.id : link.source
        const target = typeof link.target === 'object' ? link.target.id : link.target
        if (source === d.id) connectedNodeIds.add(target)
        if (target === d.id) connectedNodeIds.add(source)
      })

      node.selectAll('circle')
        .transition()
        .duration(200)
        .style('opacity', (n: Node) =>
          n.id === d.id || connectedNodeIds.has(n.id) ? 1 : 0.2
        )

      link.transition()
        .duration(200)
        .style('opacity', (l: Link) => {
          const source = typeof l.source === 'object' ? l.source.id : l.source
          const target = typeof l.target === 'object' ? l.target.id : l.target
          return source === d.id || target === d.id ? 1 : 0.1
        })

      // Show tooltip
      tooltip
        .style('visibility', 'visible')
        .html(getTooltipContent(d))
        .style('left', (event.pageX + 10) + 'px')
        .style('top', (event.pageY - 10) + 'px')
    }

    function handleMouseOut() {
      node.selectAll('circle')
        .transition()
        .duration(200)
        .style('opacity', 1)

      link.transition()
        .duration(200)
        .style('opacity', 0.6)

      tooltip.style('visibility', 'hidden')
    }

    function handleClick(event: any, d: Node) {
      event.stopPropagation()
      setSelectedNode(d)
    }

    // Update positions on simulation tick
    simulation.on('tick', () => {
      link
        .attr('x1', d => (d.source as Node).x!)
        .attr('y1', d => (d.source as Node).y!)
        .attr('x2', d => (d.target as Node).x!)
        .attr('y2', d => (d.target as Node).y!)

      node.attr('transform', d => `translate(${d.x},${d.y})`)
    })

    // Cleanup
    return () => {
      simulation.stop()
      tooltip.remove()
    }
  }, [papers, citationGraph, width, height])

  // Drag behavior
  function drag(simulation: d3.Simulation<Node, undefined>) {
    function dragstarted(event: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart()
      event.subject.fx = event.subject.x
      event.subject.fy = event.subject.y
    }

    function dragged(event: any) {
      event.subject.fx = event.x
      event.subject.fy = event.y
    }

    function dragended(event: any) {
      if (!event.active) simulation.alphaTarget(0)
      event.subject.fx = null
      event.subject.fy = null
    }

    return d3.drag<SVGGElement, Node>()
      .on('start', dragstarted)
      .on('drag', dragged)
      .on('end', dragended)
  }

  // Helper functions
  function processGraphData(papers: any[], citationGraph?: any) {
    const nodes: Node[] = papers.map(paper => ({
      id: paper.id,
      title: paper.title,
      year: paper.year,
      citations: paper.citations,
      domains: paper.domains,
      pageRank: citationGraph?.nodes?.find((n: any) => n.id === paper.id)?.pageRank,
      group: paper.domains?.[0] ? hashCode(paper.domains[0]) % 10 : 0,
    }))

    const links: Link[] = []

    // Generate links from citation data or create sample links
    if (citationGraph?.edges) {
      citationGraph.edges.forEach((edge: any) => {
        links.push({
          source: edge.source,
          target: edge.target,
          value: edge.weight || 1,
        })
      })
    } else {
      // Create sample citation network
      for (let i = 0; i < papers.length - 1; i++) {
        // Each paper cites 1-3 previous papers
        const numCitations = Math.floor(Math.random() * 3) + 1
        for (let j = 0; j < numCitations && i + j + 1 < papers.length; j++) {
          links.push({
            source: papers[i].id,
            target: papers[i + j + 1].id,
            value: Math.random() * 2 + 1,
          })
        }
      }
    }

    return { nodes, links }
  }

  function getNodeRadius(node: Node): number {
    // Size based on citations (if available) or PageRank
    if (node.pageRank) {
      return 5 + (node.pageRank * 100)
    }
    if (node.citations) {
      return 5 + Math.log(node.citations + 1) * 2
    }
    return 8
  }

  function getNodeColor(node: Node): string {
    // Color based on domain/group
    const colors = [
      '#3B82F6', // blue
      '#10B981', // green
      '#F59E0B', // amber
      '#EF4444', // red
      '#8B5CF6', // purple
      '#EC4899', // pink
      '#14B8A6', // teal
      '#F97316', // orange
      '#6366F1', // indigo
      '#84CC16', // lime
    ]
    return colors[node.group || 0]
  }

  function getTooltipContent(node: Node): string {
    return `
      <div>
        <strong>${truncateTitle(node.title, 50)}</strong>
        ${node.year ? `<br/><small>Year: ${node.year}</small>` : ''}
        ${node.citations ? `<br/><small>Citations: ${node.citations.toLocaleString()}</small>` : ''}
        ${node.domains ? `<br/><small>Domains: ${node.domains.join(', ')}</small>` : ''}
        ${node.pageRank ? `<br/><small>PageRank: ${(node.pageRank * 100).toFixed(2)}%</small>` : ''}
      </div>
    `
  }

  function truncateTitle(title: string, maxLength: number): string {
    return title.length > maxLength ? title.slice(0, maxLength) + '...' : title
  }

  function hashCode(str: string): number {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash
    }
    return Math.abs(hash)
  }

  // Control functions
  const handleZoomIn = () => {
    const svg = d3.select(svgRef.current)
    svg.transition().call(
      (d3.zoom() as any).scaleBy as any,
      1.3
    )
  }

  const handleZoomOut = () => {
    const svg = d3.select(svgRef.current)
    svg.transition().call(
      (d3.zoom() as any).scaleBy as any,
      1 / 1.3
    )
  }

  const handleResetZoom = () => {
    const svg = d3.select(svgRef.current)
    svg.transition().call(
      (d3.zoom() as any).transform as any,
      d3.zoomIdentity
    )
  }

  const handleDownload = () => {
    const svgElement = svgRef.current
    if (!svgElement) return

    const serializer = new XMLSerializer()
    const svgString = serializer.serializeToString(svgElement)
    const blob = new Blob([svgString], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)

    const link = document.createElement('a')
    link.href = url
    link.download = 'citation-graph.svg'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="relative">
      {/* Controls */}
      <div className="absolute top-4 right-4 z-10 flex flex-col gap-2 bg-card border rounded-lg p-2 shadow-lg">
        <button
          onClick={handleZoomIn}
          className="p-2 hover:bg-accent rounded-md transition-colors"
          title="Zoom In"
        >
          <ZoomIn className="h-5 w-5" />
        </button>
        <button
          onClick={handleZoomOut}
          className="p-2 hover:bg-accent rounded-md transition-colors"
          title="Zoom Out"
        >
          <ZoomOut className="h-5 w-5" />
        </button>
        <button
          onClick={handleResetZoom}
          className="p-2 hover:bg-accent rounded-md transition-colors"
          title="Reset Zoom"
        >
          <Maximize2 className="h-5 w-5" />
        </button>
        <button
          onClick={handleDownload}
          className="p-2 hover:bg-accent rounded-md transition-colors"
          title="Download SVG"
        >
          <Download className="h-5 w-5" />
        </button>
      </div>

      {/* Zoom indicator */}
      <div className="absolute top-4 left-4 z-10 bg-card border rounded-lg px-3 py-2 text-sm shadow-lg">
        Zoom: {(zoom * 100).toFixed(0)}%
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 z-10 bg-card border rounded-lg p-3 shadow-lg">
        <div className="text-sm font-semibold mb-2">Legend</div>
        <div className="space-y-1 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-primary" />
            <span>Node size = Citations/PageRank</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full border-2 border-yellow-500" />
            <span>Gold ring = High PageRank</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-0.5 bg-foreground" />
            <span>Arrow = Citation link</span>
          </div>
          <div className="text-muted-foreground mt-2">
            Drag nodes • Scroll to zoom • Hover for details
          </div>
        </div>
      </div>

      {/* SVG Canvas */}
      <div className="rounded-lg border bg-card overflow-hidden">
        <svg ref={svgRef} className="w-full h-auto" />
      </div>

      {/* Selected Node Panel */}
      {selectedNode && (
        <div className="mt-4 p-4 rounded-lg bg-card border">
          <div className="flex justify-between items-start mb-2">
            <h3 className="font-semibold text-lg">{selectedNode.title}</h3>
            <button
              onClick={() => setSelectedNode(null)}
              className="text-muted-foreground hover:text-foreground"
            >
              ×
            </button>
          </div>
          <div className="text-sm space-y-1">
            {selectedNode.year && <p>Year: {selectedNode.year}</p>}
            {selectedNode.citations && (
              <p>Citations: {selectedNode.citations.toLocaleString()}</p>
            )}
            {selectedNode.domains && (
              <p>Domains: {selectedNode.domains.join(', ')}</p>}
            )}
            {selectedNode.pageRank && (
              <p>PageRank: {(selectedNode.pageRank * 100).toFixed(2)}%</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
