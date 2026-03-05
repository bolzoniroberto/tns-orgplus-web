'use client'

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  type Node,
  type Edge,
  type EdgeProps,
  BackgroundVariant,
  ReactFlowProvider,
  useReactFlow,
  useViewport,
  BaseEdge,
  getSmoothStepPath,
  Position
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { Search, Users, X } from 'lucide-react'
import { useOrgStore } from '@/store/useOrgStore'
import type { Struttura } from '@/types'
import OrgNode from '@/components/orgchart/OrgNode'
import RecordDrawer from '@/components/shared/RecordDrawer'
import LayoutHUD from '@/components/orgchart/LayoutHUD'
import UnassignedPanel from '@/components/orgchart/UnassignedPanel'

const NODE_TYPES = { orgNode: OrgNode }

const H_GAP = 260
const V_GAP = 150
const GRID_COLS = 4          // fallback columns in multi-row grid layout

interface TreeNode {
  struttura: Struttura & { dipendenti_count: number }
  children: TreeNode[]
  depth: number
  x: number
  y: number
  _verticalStacked?: boolean
}

interface TreeMetrics {
  avgSpan: number
  maxDepth: number
  totalNodes: number
  dynamicGridCols: number
  useVerticalStacking: boolean
}

interface LayoutConfig {
  gridCols: number
  verticalStackingDepth: number | null
  forcedVerticalNodes: Set<string>
}

type NodeBox = { x: number; y: number; w: number; h: number }

function buildTree(
  strutture: (Struttura & { dipendenti_count: number })[],
  rootCodice: string | null
): TreeNode[] {
  const byParent = new Map<string | null, (Struttura & { dipendenti_count: number })[]>()

  strutture
    .filter((s) => !s.deleted_at)
    .forEach((s) => {
      const p = s.codice_padre ?? null
      if (!byParent.has(p)) byParent.set(p, [])
      byParent.get(p)!.push(s)
    })

  function build(parentCodice: string | null, depth: number): TreeNode[] {
    const children = byParent.get(parentCodice) ?? []
    return children.map((s) => ({
      struttura: s,
      children: build(s.codice, depth + 1),
      depth,
      x: 0,
      y: 0
    }))
  }

  return build(rootCodice, 0)
}

function getSubtreeDepth(node: TreeNode): number {
  if (node.children.length === 0) return 0
  return 1 + Math.max(...node.children.map(getSubtreeDepth))
}

function analyzeTree(nodes: TreeNode[]): TreeMetrics {
  let totalSpan = 0
  let spanCount = 0
  let maxDepth = 0
  let totalNodes = 0

  function dfs(node: TreeNode): void {
    totalNodes++
    if (node.depth > maxDepth) maxDepth = node.depth
    if (node.children.length > 0) {
      totalSpan += node.children.length
      spanCount++
    }
    node.children.forEach(dfs)
  }
  nodes.forEach(dfs)

  const avgSpan = spanCount > 0 ? totalSpan / spanCount : 0
  const dynamicGridCols = avgSpan > 8 ? Math.ceil(avgSpan / 2) : GRID_COLS
  const useVerticalStacking = maxDepth > 4

  return { avgSpan, maxDepth, totalNodes, dynamicGridCols, useVerticalStacking }
}

/**
 * Layout algorithm with multi-row grid support and optional vertical stacking.
 */
function layoutTree(
  nodes: TreeNode[],
  startX = 0,
  config: LayoutConfig = { gridCols: GRID_COLS, verticalStackingDepth: null, forcedVerticalNodes: new Set() }
): number {
  if (nodes.length === 0) return startX

  let x = startX

  for (const node of nodes) {
    node.y = node.depth * V_GAP
    const codice = node.struttura.codice

    const shouldStackVertically =
      config.forcedVerticalNodes.has(codice) ||
      (config.verticalStackingDepth !== null && node.depth >= config.verticalStackingDepth)

    if (node.children.length === 0) {
      node.x = x
      x += H_GAP
    } else if (shouldStackVertically) {
      // Vertical stacking: parent takes 1 column, children stack below with slight indent
      node.x = x
      let childY = (node.depth + 1) * V_GAP
      let maxChildRight = x + H_GAP  // track max width consumed by child subtrees
      for (const child of node.children) {
        child.x = x + H_GAP * 0.2
        child.y = childY
        const childRight = layoutTree(child.children, child.x, config)
        // Shift any grandchildren whose y was computed via depth*V_GAP (which may land
        // above this child when childY > child.depth * V_GAP for 2nd+ stacked child)
        const yDelta = childY - child.depth * V_GAP
        if (yDelta !== 0) {
          for (const desc of flattenTree(child.children)) {
            desc.y += yDelta
          }
        }
        if (childRight > maxChildRight) maxChildRight = childRight
        childY += (getSubtreeDepth(child) + 1) * V_GAP
      }
      x = maxChildRight  // advance past the widest child subtree
    } else if (node.children.length > GRID_COLS) {
      const n = node.children.length
      const actualCols = Math.min(config.gridCols, n)
      const gridWidth = actualCols * H_GAP
      const gridStartX = x

      node.x = gridStartX + gridWidth / 2 - H_GAP / 2

      for (let i = 0; i < n; i++) {
        const col = i % config.gridCols
        const row = Math.floor(i / config.gridCols)
        node.children[i].x = gridStartX + col * H_GAP
        node.children[i].y = (node.depth + 1 + row) * V_GAP
        // Recursively layout subtrees of non-leaf grid children
        if (node.children[i].children.length > 0) {
          layoutTree(node.children[i].children, node.children[i].x, config)
          const yDelta = node.children[i].y - node.children[i].depth * V_GAP
          if (yDelta !== 0) {
            for (const desc of flattenTree(node.children[i].children)) {
              desc.y += yDelta
            }
          }
        }
      }

      x = gridStartX + gridWidth
    } else {
      const subtreeStart = x
      x = layoutTree(node.children, x, config)
      node.x = (subtreeStart + x - H_GAP) / 2
    }
  }

  return x
}

function flattenTree(nodes: TreeNode[]): TreeNode[] {
  return nodes.flatMap((n) => [n, ...flattenTree(n.children)])
}

function getBoundingBox(nodes: TreeNode[]): { minX: number; maxX: number; minY: number; maxY: number } {
  const all = flattenTree(nodes)
  if (all.length === 0) return { minX: 0, maxX: 0, minY: 0, maxY: 0 }
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
  for (const n of all) {
    if (n.x < minX) minX = n.x
    if (n.x > maxX) maxX = n.x
    if (n.y < minY) minY = n.y
    if (n.y > maxY) maxY = n.y
  }
  return { minX, maxX, minY, maxY }
}

function findWidestHorizontalSubtree(nodes: TreeNode[]): TreeNode | null {
  const all = flattenTree(nodes)
  let best: TreeNode | null = null
  let bestChildren = 0
  for (const n of all) {
    // Only target nodes whose children are ALL leaves: this avoids y-position bugs
    // where grandchildren rendered via depth*V_GAP land above their stacked parent
    if (
      n.children.length > 0 &&
      !n._verticalStacked &&
      n.children.every(c => c.children.length === 0) &&
      n.children.length > bestChildren
    ) {
      best = n
      bestChildren = n.children.length
    }
  }
  return best
}

function buildAncestorPath(
  codice: string,
  strutture: (Struttura & { dipendenti_count: number })[]
): Set<string> {
  const path = new Set<string>()
  let cur: string | null = codice
  while (cur) {
    path.add(cur)
    const found = strutture.find(s => s.codice === cur)
    cur = found?.codice_padre ?? null
  }
  return path
}

function removeDescendants(
  codice: string,
  collapsed: Set<string>,
  strutture: (Struttura & { dipendenti_count: number })[]
): void {
  collapsed.delete(codice)
  strutture
    .filter(s => s.codice_padre === codice && !s.deleted_at)
    .forEach(child => removeDescendants(child.codice, collapsed, strutture))
}

// ── Smart Edge Routing ────────────────────────────────────────────────────────

function segmentIntersectsBox(
  x1: number, y1: number, x2: number, y2: number,
  box: NodeBox
): boolean {
  const bx1 = box.x, by1 = box.y, bx2 = box.x + box.w, by2 = box.y + box.h
  // Quick bounding box reject
  if (Math.max(x1, x2) < bx1 || Math.min(x1, x2) > bx2) return false
  if (Math.max(y1, y2) < by1 || Math.min(y1, y2) > by2) return false
  // Either endpoint inside the box
  if (x1 >= bx1 && x1 <= bx2 && y1 >= by1 && y1 <= by2) return true
  if (x2 >= bx1 && x2 <= bx2 && y2 >= by1 && y2 <= by2) return true
  // Test segment against each of the 4 box edges
  function segsIntersect(ax1: number, ay1: number, ax2: number, ay2: number,
                         cx1: number, cy1: number, cx2: number, cy2: number): boolean {
    const d1x = ax2 - ax1, d1y = ay2 - ay1
    const d2x = cx2 - cx1, d2y = cy2 - cy1
    const cross = d1x * d2y - d1y * d2x
    if (Math.abs(cross) < 1e-10) return false
    const t = ((cx1 - ax1) * d2y - (cy1 - ay1) * d2x) / cross
    const u = ((cx1 - ax1) * d1y - (cy1 - ay1) * d1x) / cross
    return t >= 0 && t <= 1 && u >= 0 && u <= 1
  }
  return (
    segsIntersect(x1, y1, x2, y2, bx1, by1, bx2, by1) ||
    segsIntersect(x1, y1, x2, y2, bx2, by1, bx2, by2) ||
    segsIntersect(x1, y1, x2, y2, bx2, by2, bx1, by2) ||
    segsIntersect(x1, y1, x2, y2, bx1, by2, bx1, by1)
  )
}

function OrgEdge({ id, sourceX, sourceY, targetX, targetY, data, style }: EdgeProps) {
  const obstructed = (data as { nodeBoxes?: NodeBox[] } | undefined)?.nodeBoxes?.some(box =>
    segmentIntersectsBox(sourceX, sourceY, targetX, targetY, box)
  ) ?? false

  const [path] = getSmoothStepPath({
    sourceX, sourceY, sourcePosition: Position.Bottom,
    targetX, targetY, targetPosition: Position.Top,
    borderRadius: obstructed ? 8 : 5,
    ...(obstructed ? { offset: 40 } : {})
  })

  return <BaseEdge id={id} path={path} style={style} />
}

// ─────────────────────────────────────────────────────────────────────────────

type ColorMode = 'none' | 'dipendenti'
type ColorScheme = { border: string; bg: string }

const COLOR_DIPENDENTI_DIRETTI: ColorScheme  = { border: '#16a34a', bg: '#f0fdf4' }  // verde  — dipendenti diretti
const COLOR_DIPENDENTI_INDIRETTI: ColorScheme = { border: '#d97706', bg: '#fffbeb' } // giallo — solo in strutture figlie
const COLOR_NESSUN_DIPENDENTE: ColorScheme    = { border: '#9ca3af', bg: '#f9fafb' } // grigio — nessun dipendente


interface OrgCanvasProps {
  strutture: (Struttura & { dipendenti_count: number })[]
}

function OrgCanvas({ strutture }: OrgCanvasProps) {
  const [collapsedSet, setCollapsedSet] = useState<Set<string>>(() => {
    const withChildren = new Set<string>()
    strutture.forEach(s => {
      if (strutture.some(c => c.codice_padre === s.codice && !c.deleted_at))
        withChildren.add(s.codice)
    })
    return withChildren
  })
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerRecord, setDrawerRecord] = useState<(Struttura & { dipendenti_count: number }) | null>(null)
  const [search, setSearch] = useState('')
  const [searchResults, setSearchResults] = useState<(Struttura & { dipendenti_count: number })[]>([])
  const [highlightedNode, setHighlightedNode] = useState<string | null>(null)
  const [colorMode, setColorMode] = useState<ColorMode>('none')
  const [focusedNode, setFocusedNode] = useState<string | null>(null)
  const [hoveredNode, setHoveredNode] = useState<string | null>(null)
  const prevVisibleIdsRef = useRef<Set<string>>(new Set())
  const compactModeRef = useRef(false)
  const [activeExpansion, setActiveExpansion] = useState<{
    nodeId: string
    snapshot: Set<string>
  } | null>(null)
  const { fitView, setCenter, getNodes } = useReactFlow()
  const { zoom } = useViewport()
  const { refreshAll } = useOrgStore()

  const [hideNoEmployees, setHideNoEmployees] = useState(false)
  const [unassignedPanelOpen, setUnassignedPanelOpen] = useState(false)

  const { dipendenti } = useOrgStore()

  const unassignedCount = useMemo(
    () => dipendenti.filter(d => !d.deleted_at && !d.codice_struttura?.trim()).length,
    [dipendenti]
  )

  const edgeTypes = useMemo(() => ({ orgEdge: OrgEdge }), [])

  // Always computed — used for both coloring and filtering
  const subtreeHasDipendenti = useMemo(() => {
    const strutMap = new Map(strutture.filter(s => !s.deleted_at).map(s => [s.codice, s]))
    const childrenOf = new Map<string, string[]>()
    strutMap.forEach(s => {
      const p = s.codice_padre ?? '__root__'
      if (!childrenOf.has(p)) childrenOf.set(p, [])
      childrenOf.get(p)!.push(s.codice)
    })
    const result = new Set<string>()
    const dfs = (codice: string): boolean => {
      const s = strutMap.get(codice)
      if (!s) return false
      const selfHas = s.dipendenti_count > 0
      // Must visit ALL children — do not short-circuit with .some()
      let childHas = false
      for (const c of (childrenOf.get(codice) ?? [])) {
        if (dfs(c)) childHas = true
      }
      if (selfHas || childHas) { result.add(codice); return true }
      return false
    }
    ;(childrenOf.get('__root__') ?? []).forEach(r => dfs(r))
    return result
  }, [strutture])

  const filteredStrutture = useMemo(
    () => hideNoEmployees
      ? strutture.filter(s => subtreeHasDipendenti.has(s.codice))
      : strutture,
    [strutture, hideNoEmployees, subtreeHasDipendenti]
  )

  const childCountMap = useMemo(() => {
    const map = new Map<string, number>()
    const root = buildTree(filteredStrutture, null)
    function count(nodes: TreeNode[]): void {
      for (const n of nodes) {
        map.set(n.struttura.codice, n.children.length)
        count(n.children)
      }
    }
    count(root)
    return map
  }, [filteredStrutture])

  const { visibleTree, treeMetrics, forcedVerticalCount } = useMemo(() => {
    // When accordion is active, compute which nodes should remain visible
    // (ancestor path to selected node + selected node's visible subtree)
    let accordionVisibleSet: Set<string> | null = null
    if (activeExpansion) {
      accordionVisibleSet = new Set<string>()
      // Walk ancestor path from selected node to root
      let cur: string | null = activeExpansion.nodeId
      while (cur) {
        accordionVisibleSet.add(cur)
        const found = filteredStrutture.find(s => s.codice === cur)
        cur = found?.codice_padre ?? null
      }
      // Add the visible subtree under the selected node (respecting collapsedSet)
      const addSubtree = (codice: string) => {
        accordionVisibleSet!.add(codice)
        if (!collapsedSet.has(codice)) {
          filteredStrutture
            .filter(s => s.codice_padre === codice && !s.deleted_at)
            .forEach(child => addSubtree(child.codice))
        }
      }
      addSubtree(activeExpansion.nodeId)
    }

    function filterTree(nodes: TreeNode[]): TreeNode[] {
      return nodes
        .filter(n => !accordionVisibleSet || accordionVisibleSet.has(n.struttura.codice))
        .map((n) => {
          const codice = n.struttura.codice
          if (collapsedSet.has(codice)) return { ...n, children: [] }
          return { ...n, children: filterTree(n.children) }
        })
    }

    const root = buildTree(filteredStrutture, null)
    const metrics = analyzeTree(root)
    const layoutConfig: LayoutConfig = {
      gridCols: metrics.dynamicGridCols,
      verticalStackingDepth: metrics.useVerticalStacking ? 4 : null,
      forcedVerticalNodes: new Set()
    }
    const filtered = filterTree(root)
    layoutTree(filtered, 0, layoutConfig)

    // Aspect ratio balancing — target 1.8:1, up to 5 iterations
    const TARGET_RATIO = 1.8
    const MAX_ITER = 5
    let iter = 0
    let bbox = getBoundingBox(filtered)
    let ratio = (bbox.maxX - bbox.minX) / Math.max(1, bbox.maxY - bbox.minY)

    while (ratio > TARGET_RATIO && iter < MAX_ITER && metrics.totalNodes > 10) {
      const target = findWidestHorizontalSubtree(filtered)
      if (!target) break
      target._verticalStacked = true
      layoutConfig.forcedVerticalNodes.add(target.struttura.codice)
      layoutTree(filtered, 0, layoutConfig)
      bbox = getBoundingBox(filtered)
      ratio = (bbox.maxX - bbox.minX) / Math.max(1, bbox.maxY - bbox.minY)
      iter++
    }

    return {
      visibleTree: flattenTree(filtered),
      treeMetrics: metrics,
      forcedVerticalCount: layoutConfig.forcedVerticalNodes.size
    }
  }, [filteredStrutture, collapsedSet, activeExpansion])

  // Compact mode with hysteresis: enter at >50 nodes, exit at <40 nodes or zoom>0.5
  const compactMode = useMemo(() => {
    const n = visibleTree.length
    if (!compactModeRef.current && n > 50) compactModeRef.current = true
    else if (compactModeRef.current && (zoom > 0.5 || n < 40)) compactModeRef.current = false
    return compactModeRef.current
  }, [visibleTree.length, zoom])

  const activeLayoutModes = useMemo(() => {
    const modes: string[] = []
    if (treeMetrics.avgSpan > 8) modes.push('Grid Layout')
    if (treeMetrics.maxDepth > 5) modes.push('Albero Profondo')
    if (compactMode) modes.push('Vista Compatta')
    if (forcedVerticalCount > 0) modes.push('Stacking Verticale')
    return modes
  }, [treeMetrics, compactMode, forcedVerticalCount])


  const focusPath = useMemo(() => {
    if (!focusedNode) return null
    const set = new Set<string>()
    let cur: string | null = focusedNode
    while (cur) {
      set.add(cur)
      cur = filteredStrutture.find((s) => s.codice === cur)?.codice_padre ?? null
    }
    filteredStrutture
      .filter((s) => s.codice_padre === focusedNode)
      .forEach((s) => set.add(s.codice))
    return set
  }, [focusedNode, filteredStrutture])

  const hoverPath = useMemo(() => {
    if (!hoveredNode) return null
    const set = new Set<string>()
    let cur: string | null = hoveredNode
    while (cur) {
      set.add(cur)
      cur = filteredStrutture.find(s => s.codice === cur)?.codice_padre ?? null
    }
    filteredStrutture.filter(s => s.codice_padre === hoveredNode).forEach(s => set.add(s.codice))
    return set
  }, [hoveredNode, filteredStrutture])

  // Click-focus has priority over hover; disabled in accordion mode (nodes are filtered out instead)
  const activePath = activeExpansion ? null : (focusPath ?? hoverPath)

  const focusedLabel = useMemo(() => {
    if (!focusedNode) return null
    return filteredStrutture.find((s) => s.codice === focusedNode)?.descrizione ?? focusedNode
  }, [focusedNode, filteredStrutture])

  const toggleCollapse = useCallback((codice: string) => {
    setCollapsedSet((prev) => {
      const next = new Set(prev)
      if (next.has(codice)) {
        next.delete(codice)
      } else {
        next.add(codice)
      }
      return next
    })
  }, [])

  const { nodes, edges } = useMemo(() => {
    const prevIds = prevVisibleIdsRef.current
    const newParentCount = new Map<string, number>()  // parent → counter of new siblings seen

    // Build nodeBoxes for smart edge routing
    const nodeBoxes: NodeBox[] = visibleTree.map(tn => ({
      x: tn.x, y: tn.y, w: 220, h: 90
    }))

    const treeNodes: Node[] = visibleTree.map((tn) => {
      const codice = tn.struttura.codice
      const totalChildren = childCountMap.get(codice) ?? 0
      const isCollapsed = collapsedSet.has(codice)
      const isOverflowed = false
      const hiddenCount = 0

      const colorScheme: ColorScheme | undefined = colorMode === 'dipendenti'
        ? tn.struttura.dipendenti_count > 0
          ? COLOR_DIPENDENTI_DIRETTI
          : subtreeHasDipendenti.has(codice)
            ? COLOR_DIPENDENTI_INDIRETTI
            : COLOR_NESSUN_DIPENDENTE
        : undefined
      const focusStyle: React.CSSProperties = activePath
        ? { opacity: activePath.has(codice) ? 1 : 0.25, transition: 'opacity 100ms' }
        : { transition: 'opacity 150ms' }

      // Staggered entrance: assign delay for nodes that are new in this render
      const isNew = !prevIds.has(codice)
      let entranceDelay: number | undefined
      if (isNew) {
        const parentKey = tn.struttura.codice_padre ?? '__root__'
        const sibIdx = newParentCount.get(parentKey) ?? 0
        newParentCount.set(parentKey, sibIdx + 1)
        entranceDelay = sibIdx * 40   // 0ms, 40ms, 80ms, 120ms…
      }

      const motionStyle: React.CSSProperties = isNew
        ? {}
        : { transition: 'transform 350ms cubic-bezier(0.4,0,0.2,1)' }

      return {
        id: codice,
        type: 'orgNode',
        position: { x: tn.x, y: tn.y },
        data: {
          struttura: tn.struttura,
          collapsed: isCollapsed,
          hasChildren: totalChildren > 0,
          childrenCount: totalChildren,
          depth: tn.depth,
          isOverflowed,
          hiddenCount,
          colorScheme,
          alertNoTitolare: !tn.struttura.titolare,
          alertNoDipendenti: tn.struttura.dipendenti_count === 0,
          entranceDelay,
          compact: compactMode,
          onExpand: () => toggleCollapse(codice),
          onExpandOverflow: () => {},
          onOpenDrawer: () => {
            setDrawerRecord(tn.struttura)
            setDrawerOpen(true)
            setFocusedNode(codice)
          }
        },
        className: highlightedNode === codice ? 'ring-2 ring-indigo-500 rounded-lg' : undefined,
        style: { ...focusStyle, ...motionStyle }
      }
    })

    const treeEdges: Edge[] = []
    visibleTree.forEach((tn) => {
      if (tn.struttura.codice_padre) {
        treeEdges.push({
          id: `${tn.struttura.codice_padre}-${tn.struttura.codice}`,
          source: tn.struttura.codice_padre,
          target: tn.struttura.codice,
          type: 'orgEdge',
          data: { nodeBoxes },
          style: { stroke: '#d1d5db', strokeWidth: 1.5 }
        })
      }
    })

    return { nodes: treeNodes, edges: treeEdges }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleTree, collapsedSet, childCountMap, highlightedNode,
      toggleCollapse, colorMode, subtreeHasDipendenti, focusPath, hoverPath, compactMode])

  // Track which nodes are visible for staggered entrance (must run before next render reads the ref)
  useEffect(() => {
    prevVisibleIdsRef.current = new Set(
      nodes.filter(n => n.type === 'orgNode').map(n => n.id)
    )
  }, [nodes])

  // Reset accordion and collapsed state when the employee filter changes
  useEffect(() => {
    setActiveExpansion(null)
    setFocusedNode(null)
    const withChildren = new Set(
      filteredStrutture.filter(s =>
        !s.deleted_at && filteredStrutture.some(c => c.codice_padre === s.codice && !c.deleted_at)
      ).map(s => s.codice)
    )
    setCollapsedSet(withChildren)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hideNoEmployees])

  // Fit view when data changes
  useEffect(() => {
    if (nodes.length > 0) {
      setTimeout(() => fitView({ padding: 0.15, duration: 400 }), 100)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [strutture])

  // When accordion expands: center on selected node + its children.
  // Depends on visibleTree so it fires AFTER the layout has been recomputed,
  // guaranteeing ReactFlow has the correct positions in its store.
  useEffect(() => {
    if (!activeExpansion) return
    const nodeId = activeExpansion.nodeId
    const selectedTN = visibleTree.find(n => n.struttura.codice === nodeId)
    if (!selectedTN) return

    const childrenTN = visibleTree.filter(n => n.struttura.codice_padre === nodeId)
    const fitNodes = [
      { id: nodeId },
      ...childrenTN.map(n => ({ id: n.struttura.codice }))
    ]

    // Short delay: visibleTree is already computed, we just need ReactFlow to
    // flush the new node positions into its internal store (one render cycle).
    const t = setTimeout(() => {
      fitView({ nodes: fitNodes, padding: 0.25, duration: 400 })
    }, 60)
    return () => clearTimeout(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeExpansion?.nodeId, visibleTree])

  // When collapsedSet changes outside accordion (expandAll/collapseAll/toggleCollapse)
  useEffect(() => {
    if (activeExpansion) return
    const t = setTimeout(() => fitView({ padding: 0.15, duration: 400 }), 400)
    return () => clearTimeout(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collapsedSet])

  // Fit view when side panels open/close
  useEffect(() => {
    setTimeout(() => fitView({ padding: 0.15, duration: 300 }), 50)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drawerOpen, unassignedPanelOpen])

  // Search
  useEffect(() => {
    if (!search) {
      setSearchResults([])
      return
    }
    const lower = search.toLowerCase()
    const results = strutture
      .filter(
        (s) =>
          s.descrizione?.toLowerCase().includes(lower) ||
          s.codice?.toLowerCase().includes(lower) ||
          s.titolare?.toLowerCase().includes(lower)
      )
      .slice(0, 8)
    setSearchResults(results)
  }, [search, strutture])

  const handleSelectSearchResult = useCallback(
    (s: Struttura & { dipendenti_count: number }) => {
      const codice = s.codice
      setSearch(s.descrizione ?? '')
      setSearchResults([])
      setHighlightedNode(codice)
      setTimeout(() => setHighlightedNode(null), 2500)

      // Expand accordion to make node visible: uncollapse ancestor path + the node itself
      const snapshot = activeExpansion?.snapshot ?? new Set(collapsedSet)
      const next = new Set(snapshot)
      // Uncollapse all ancestors
      let ancestor: string | null = filteredStrutture.find(fs => fs.codice === codice)?.codice_padre ?? null
      while (ancestor) {
        next.delete(ancestor)
        const found = filteredStrutture.find(fs => fs.codice === ancestor)
        ancestor = found?.codice_padre ?? null
      }
      // Uncollapse the node itself if it has children
      const hasChildren = (childCountMap.get(codice) ?? 0) > 0
      if (hasChildren) {
        next.delete(codice)
        setActiveExpansion({ nodeId: codice, snapshot })
        setFocusedNode(codice)
      }
      setCollapsedSet(next)

      // Center on node after layout settles
      setTimeout(() => {
        const n = getNodes().find(nd => nd.id === codice)
        if (n) setCenter(n.position.x + 110, n.position.y + 45, { duration: 500, zoom: 1 })
      }, 480)
    },
    [activeExpansion, collapsedSet, filteredStrutture, childCountMap, getNodes, setCenter]
  )

  const expandAll = useCallback(() => setCollapsedSet(new Set()), [])
  const collapseAll = useCallback(() => {
    const allCodes = new Set(strutture.filter(s => !s.deleted_at).map(s => s.codice))
    setCollapsedSet(allCodes)
    setActiveExpansion(null)
  }, [strutture])

  const handleNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    if (node.type !== 'orgNode') return
    const codice = node.id
    const hasChildren = (childCountMap.get(codice) ?? 0) > 0
    if (!hasChildren) return  // leaf node — no accordion

    // Helper: uncollapse ancestor path so the node is reachable in the tree
    const uncollapseAncestors = (target: string, next: Set<string>) => {
      let ancestor: string | null = filteredStrutture.find(s => s.codice === target)?.codice_padre ?? null
      while (ancestor) {
        next.delete(ancestor)
        const found = filteredStrutture.find(s => s.codice === ancestor)
        ancestor = found?.codice_padre ?? null
      }
    }

    if (activeExpansion?.nodeId === codice) {
      // 2nd click: collapse — restore snapshot
      setCollapsedSet(activeExpansion.snapshot)
      setActiveExpansion(null)
      return
    }

    // Different node or no active: restore snapshot, uncollapse ancestor path, expand node
    const snapshot = activeExpansion?.snapshot ?? new Set(collapsedSet)
    const next = new Set(snapshot)
    uncollapseAncestors(codice, next)
    next.delete(codice)  // expose direct children; their children stay collapsed
    setCollapsedSet(next)
    setActiveExpansion({ nodeId: codice, snapshot })
    setFocusedNode(codice)
  }, [activeExpansion, collapsedSet, childCountMap, filteredStrutture])

  const handlePaneClick = useCallback(() => {
    if (activeExpansion) {
      setCollapsedSet(activeExpansion.snapshot)
      setActiveExpansion(null)
    }
    setFocusedNode(null)
    setDrawerOpen(false)
  }, [activeExpansion])

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-2.5 bg-white border-b border-gray-200 flex-wrap">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            type="text"
            placeholder="Cerca struttura..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-md w-56 focus:outline-none focus:ring-1 focus:ring-indigo-400"
          />
          {searchResults.length > 0 && (
            <div className="absolute top-full left-0 mt-1 w-72 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
              {searchResults.map((s) => (
                <button
                  key={s.codice}
                  onClick={() => handleSelectSearchResult(s)}
                  className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm"
                >
                  <span className="font-medium text-gray-900">{s.descrizione}</span>
                  <span className="text-gray-400 ml-2 text-xs">{s.codice}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Unassigned employees toggle */}
        <button
          onClick={() => setUnassignedPanelOpen(v => !v)}
          className={[
            'relative text-sm px-2 py-1.5 rounded-md transition-colors border flex items-center gap-1.5',
            unassignedPanelOpen
              ? 'bg-amber-50 text-amber-700 border-amber-200 font-medium'
              : 'text-gray-500 border-gray-200 hover:bg-gray-50'
          ].join(' ')}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Senza struttura</span>
          {unassignedCount > 0 && (
            <span className="ml-0.5 text-xs bg-amber-500 text-white font-semibold px-1.5 py-0.5 rounded-full tabular-nums leading-none">
              {unassignedCount}
            </span>
          )}
        </button>

        <button
          onClick={expandAll}
          className="text-sm text-gray-500 hover:text-gray-700 px-2 py-1.5 hover:bg-gray-50 rounded-md transition-colors"
        >
          Espandi tutto
        </button>
        <button
          onClick={collapseAll}
          className="text-sm text-gray-500 hover:text-gray-700 px-2 py-1.5 hover:bg-gray-50 rounded-md transition-colors"
        >
          Comprimi tutto
        </button>

        <div className="flex-1" />

        {/* Focus indicator */}
        {focusedNode && (
          <div className="flex items-center gap-1.5 px-2 py-1 bg-indigo-50 rounded-md text-xs text-indigo-700">
            <span className="truncate max-w-[150px]">{focusedLabel}</span>
            <button onClick={() => setFocusedNode(null)}>
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Dipendenti color toggle */}
        <button
          onClick={() => setColorMode(m => m === 'dipendenti' ? 'none' : 'dipendenti')}
          className={[
            'text-sm px-2 py-1.5 rounded-md transition-colors border',
            colorMode === 'dipendenti'
              ? 'bg-indigo-50 text-indigo-700 border-indigo-200 font-medium'
              : 'text-gray-500 border-gray-200 hover:bg-gray-50'
          ].join(' ')}
        >
          Evidenzia dipendenti
        </button>

        {/* Filter: hide units with no employees anywhere */}
        <button
          onClick={() => setHideNoEmployees(v => !v)}
          className={[
            'text-sm px-2 py-1.5 rounded-md transition-colors border',
            hideNoEmployees
              ? 'bg-amber-50 text-amber-700 border-amber-200 font-medium'
              : 'text-gray-500 border-gray-200 hover:bg-gray-50'
          ].join(' ')}
        >
          {hideNoEmployees ? 'Mostra tutto' : 'Nascondi senza dipendenti'}
        </button>

        {/* LOD badge */}
        <span className="text-xs text-gray-400 px-2 py-1 bg-gray-50 rounded border border-gray-100 tabular-nums">
          {compactMode ? 'Compact' : zoom <= 0.4 ? 'Macro' : zoom <= 0.8 ? 'Standard' : 'Micro'}
        </span>
      </div>

      {/* Color legend */}
      {colorMode === 'dipendenti' && (
        <div className="flex gap-4 px-4 py-1.5 bg-gray-50 border-b border-gray-100">
          <span className="flex items-center gap-1 text-xs text-gray-600">
            <span className="w-3 h-3 rounded-sm" style={{ background: COLOR_DIPENDENTI_DIRETTI.border }} />
            Dipendenti diretti
          </span>
          <span className="flex items-center gap-1 text-xs text-gray-600">
            <span className="w-3 h-3 rounded-sm" style={{ background: COLOR_DIPENDENTI_INDIRETTI.border }} />
            Solo in strutture figlie
          </span>
          <span className="flex items-center gap-1 text-xs text-gray-600">
            <span className="w-3 h-3 rounded-sm" style={{ background: COLOR_NESSUN_DIPENDENTE.border }} />
            Nessun dipendente
          </span>
        </div>
      )}

      {/* Main area */}
      <div className="flex flex-1 min-h-0">
        {/* Unassigned panel */}
        {unassignedPanelOpen && (
          <UnassignedPanel
            strutture={strutture}
            onClose={() => setUnassignedPanelOpen(false)}
            onAssigned={refreshAll}
          />
        )}

        {/* Canvas */}
        <div className="flex-1 min-w-0 relative">
          {/* Accordion mode banner */}
          {activeExpansion && (
            <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10
                            bg-indigo-600 text-white text-xs px-3 py-1 rounded-full
                            flex items-center gap-2 shadow-md pointer-events-auto">
              <span>Vista contestuale attiva</span>
              <button onClick={handlePaneClick} className="underline">Ripristina</button>
            </div>
          )}
          {/* Layout mode HUD */}
          {activeLayoutModes.length > 0 && (
            <div className="absolute top-2 left-2 z-10 pointer-events-none">
              <LayoutHUD activeLayoutModes={activeLayoutModes} />
            </div>
          )}
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={NODE_TYPES}
            edgeTypes={edgeTypes}
            fitView
            fitViewOptions={{ padding: 0.15 }}
            minZoom={0.1}
            maxZoom={2}
            proOptions={{ hideAttribution: true }}
            onNodeClick={handleNodeClick}
            onPaneClick={handlePaneClick}
            onNodeMouseEnter={(_, node) => { if (node.type === 'orgNode') setHoveredNode(node.id) }}
            onNodeMouseLeave={() => setHoveredNode(null)}
          >
            <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#d1d5db" />
            <Controls
              position="bottom-right"
              className="!shadow-none !border !border-gray-200 !rounded-lg overflow-hidden"
            />
            <MiniMap
              position="bottom-left"
              className="!border !border-gray-200 !rounded-lg"
              style={{ width: 120, height: 80 }}
              nodeColor="#e5e7eb"
            />
          </ReactFlow>
        </div>

        {/* Side panel */}
        {drawerOpen && (
          <div className="w-[420px] flex-shrink-0 border-l border-gray-200 bg-white overflow-y-auto">
            <RecordDrawer
              variant="panel"
              open={drawerOpen}
              type="struttura"
              record={drawerRecord}
              initialMode="view"
              onClose={() => {
                setDrawerOpen(false)
                setFocusedNode(null)
              }}
              onSaved={refreshAll}
            />
          </div>
        )}
      </div>
    </div>
  )
}

export default function OrgChartView() {
  const { strutture } = useOrgStore()

  if (strutture.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <div className="text-gray-400 text-5xl mb-4">🏢</div>
        <p className="text-gray-500 font-medium">Nessuna struttura caricata</p>
        <p className="text-sm text-gray-400 mt-1">
          Vai su <strong>Import / Export</strong> per caricare il file XLS
        </p>
      </div>
    )
  }

  return (
    <ReactFlowProvider>
      <OrgCanvas strutture={strutture} />
    </ReactFlowProvider>
  )
}
