import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Network, Loader2, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';

interface GraphNode {
  id: string;
  label: string;
  title: string;
}

interface GraphEdge {
  source: string;
  target: string;
  weight: number;
  type: string;
  label?: string;
}

interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export default function GraphPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [data, setData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [lastPos, setLastPos] = useState({ x: 0, y: 0 });

  // Node positions (simple force simulation)
  const [nodePositions, setNodePositions] = useState<Map<string, { x: number; y: number }>>(new Map());

  useEffect(() => {
    fetchGraphData();
  }, []);

  useEffect(() => {
    if (data && data.nodes.length > 0) {
      initializePositions();
    }
  }, [data]);

  useEffect(() => {
    if (nodePositions.size > 0) {
      drawGraph();
    }
  }, [nodePositions, zoom, offset, selectedNode]);

  const fetchGraphData = async () => {
    try {
      const res = await fetch('/api/advanced/knowledge-graph');
      if (res.ok) {
        setData(await res.json());
      }
    } catch (err) {
      console.error('Fetch graph error:', err);
    } finally {
      setLoading(false);
    }
  };

  const initializePositions = () => {
    if (!data || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(canvas.width, canvas.height) / 3;

    const positions = new Map<string, { x: number; y: number }>();
    data.nodes.forEach((node, i) => {
      const angle = (2 * Math.PI * i) / data.nodes.length;
      positions.set(node.id, {
        x: centerX + radius * Math.cos(angle) + (Math.random() - 0.5) * 50,
        y: centerY + radius * Math.sin(angle) + (Math.random() - 0.5) * 50
      });
    });

    setNodePositions(positions);

    // Simple force simulation
    simulateForces(positions);
  };

  const simulateForces = (positions: Map<string, { x: number; y: number }>) => {
    if (!data || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const newPositions = new Map(positions);

    // Run simulation iterations
    for (let iter = 0; iter < 50; iter++) {
      // Repulsion between nodes
      data.nodes.forEach((n1) => {
        const p1 = newPositions.get(n1.id);
        if (!p1) return;

        data.nodes.forEach((n2) => {
          if (n1.id === n2.id) return;
          const p2 = newPositions.get(n2.id);
          if (!p2) return;

          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = 5000 / (dist * dist);

          p1.x += (dx / dist) * force * 0.1;
          p1.y += (dy / dist) * force * 0.1;
        });
      });

      // Attraction along edges
      data.edges.forEach((edge) => {
        const p1 = newPositions.get(edge.source);
        const p2 = newPositions.get(edge.target);
        if (!p1 || !p2) return;

        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = dist * 0.01 * edge.weight;

        p1.x += (dx / dist) * force;
        p1.y += (dy / dist) * force;
        p2.x -= (dx / dist) * force;
        p2.y -= (dy / dist) * force;
      });

      // Keep nodes in bounds
      data.nodes.forEach((node) => {
        const p = newPositions.get(node.id);
        if (!p) return;

        p.x = Math.max(50, Math.min(canvas.width - 50, p.x));
        p.y = Math.max(50, Math.min(canvas.height - 50, p.y));
      });
    }

    setNodePositions(newPositions);
  };

  const drawGraph = () => {
    if (!canvasRef.current || !data) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Apply transformations
    ctx.save();
    ctx.translate(offset.x, offset.y);
    ctx.scale(zoom, zoom);

    // Draw edges
    data.edges.forEach((edge) => {
      const p1 = nodePositions.get(edge.source);
      const p2 = nodePositions.get(edge.target);
      if (!p1 || !p2) return;

      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.strokeStyle = edge.type === 'tag' ? '#fbbf24' : '#94a3b8';
      ctx.lineWidth = edge.weight * 2;
      ctx.globalAlpha = 0.5;
      ctx.stroke();
      ctx.globalAlpha = 1;
    });

    // Draw nodes
    data.nodes.forEach((node) => {
      const pos = nodePositions.get(node.id);
      if (!pos) return;

      const isSelected = selectedNode?.id === node.id;
      const radius = isSelected ? 12 : 8;

      // Node circle
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = isSelected ? '#0ea5e9' : '#3b82f6';
      ctx.fill();

      if (isSelected) {
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 3;
        ctx.stroke();
      }

      // Node label
      ctx.fillStyle = '#1f2937';
      ctx.font = isSelected ? 'bold 12px sans-serif' : '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(node.label, pos.x, pos.y + radius + 14);
    });

    ctx.restore();
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !data) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left - offset.x) / zoom;
    const y = (e.clientY - rect.top - offset.y) / zoom;

    // Find clicked node
    for (const node of data.nodes) {
      const pos = nodePositions.get(node.id);
      if (!pos) continue;

      const dist = Math.sqrt((x - pos.x) ** 2 + (y - pos.y) ** 2);
      if (dist < 15) {
        setSelectedNode(node);
        return;
      }
    }

    setSelectedNode(null);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setDragging(true);
    setLastPos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging) return;

    setOffset({
      x: offset.x + e.clientX - lastPos.x,
      y: offset.y + e.clientY - lastPos.y
    });
    setLastPos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    setDragging(false);
  };

  const resetView = () => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="animate-spin text-primary-600" size={40} />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-white flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Network size={24} />
            知识图谱
          </h1>
          <p className="text-sm text-gray-500">
            {data?.nodes.length || 0} 篇文章，{data?.edges.length || 0} 个关联
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setZoom(Math.min(zoom * 1.2, 3))}
            className="p-2 hover:bg-gray-100 rounded-lg"
            title="放大"
          >
            <ZoomIn size={20} />
          </button>
          <button
            onClick={() => setZoom(Math.max(zoom / 1.2, 0.3))}
            className="p-2 hover:bg-gray-100 rounded-lg"
            title="缩小"
          >
            <ZoomOut size={20} />
          </button>
          <button
            onClick={resetView}
            className="p-2 hover:bg-gray-100 rounded-lg"
            title="重置视图"
          >
            <Maximize2 size={20} />
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 relative bg-gray-50">
        <canvas
          ref={canvasRef}
          width={1200}
          height={800}
          className="w-full h-full cursor-move"
          onClick={handleCanvasClick}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        />

        {/* Selected node info */}
        {selectedNode && (
          <div className="absolute bottom-4 left-4 bg-white rounded-xl shadow-lg p-4 max-w-sm">
            <h3 className="font-semibold text-gray-900 mb-2">
              {selectedNode.title}
            </h3>
            <Link
              to={`/article/${selectedNode.id}`}
              className="text-sm text-primary-600 hover:underline"
            >
              查看文章 →
            </Link>
          </div>
        )}

        {/* Legend */}
        <div className="absolute top-4 right-4 bg-white rounded-lg shadow p-3 text-sm">
          <p className="font-medium text-gray-700 mb-2">图例</p>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-3 h-0.5 bg-gray-400" />
              <span className="text-gray-600">内容相关</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-0.5 bg-yellow-400" />
              <span className="text-gray-600">共同标签</span>
            </div>
          </div>
        </div>

        {data?.nodes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <Network className="mx-auto text-gray-300 mb-4" size={48} />
              <p className="text-gray-500">暂无文章关联数据</p>
              <p className="text-sm text-gray-400 mt-1">
                添加更多文章并使用AI分析功能来构建知识图谱
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
