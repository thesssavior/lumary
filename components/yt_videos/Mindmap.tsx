"use client";

import React, { useCallback, useEffect, useRef, useState } from 'react';
import ReactFlow, {
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Node,
  Edge,
  Position,
  ReactFlowProvider,
  useReactFlow,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Loader2, AlertTriangle, Brain } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslations } from 'next-intl';
interface MindmapProps {
  summary: string;
  mindmap: any | null;
  locale: string;
  summaryId: string;
  isActive: boolean | null;
  // transcript: string; // Transcript is not directly used for generation by this component anymore
}

const MindmapComponent: React.FC<MindmapProps> = ({ summary, mindmap, locale, summaryId, isActive }) => {
  const t = useTranslations();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isGenerated, setIsGenerated] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [reactFlowReady, setReactFlowReady] = useState(false);
  const { fitView } = useReactFlow();
  const hasFit = useRef(false);

  const onConnect = useCallback(
    (params: any) => setEdges((eds) => addEdge(params, eds)),
    [setEdges],
  );

  useEffect(() => {
    if (mindmap) {
      setNodes(mindmap.nodes);
      setEdges(mindmap.edges);
      setIsGenerated(true);
    }
  }, [mindmap]);
  
  // fitView runs after reactflow mounts and states are updated
  useEffect(() => {
    if (reactFlowReady && nodes.length && !hasFit.current && isActive) {
      requestAnimationFrame(() => {
        fitView();
      });
      hasFit.current = true;
    }
  }, [reactFlowReady, nodes]);
  

  const generateMindmap = async () => {
    if (!summary) {
      setError("No summary provided to generate mind map.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/mindmap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ summaryText: summary, locale: locale }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to fetch mindmap data');
      }

      const data = await response.json();
      if (data.nodes && data.edges) {
        const validatedNodes = data.nodes.map((node: Node) => ({
          ...node,
          position: node.position || { x: Math.random() * 400, y: Math.random() * 400 },
          sourcePosition: node.sourcePosition || Position.Right,
          targetPosition: node.targetPosition || Position.Left,
        }));
        setNodes(validatedNodes);
        setEdges(data.edges);
        setIsGenerated(true);
        setIsLoading(false);
        setIsSaving(true);

        // Save the mindmap to the database
        try {
          const saveResponse = await fetch('/api/mindmap', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ summaryId: summaryId, mindmap: { nodes: validatedNodes, edges: data.edges } }),
          });

          if (!saveResponse.ok) {
            const saveErrData = await saveResponse.json();
            console.error("Failed to save mindmap:", saveErrData.error || 'Failed to save mindmap to database');
            setError(saveErrData.error || 'Failed to save mindmap to database');
          }
        } finally {
          setIsSaving(false);
        }

      } else {
        throw new Error('Invalid data structure received from mindmap API');
      }
    } catch (err: any) {
      console.error("Error fetching mindmap data:", err);
      setError(err.message || 'An unknown error occurred');
      setIsLoading(false);
    }
  };

  if (!summary) {
    return (
      <div style={{ height: '600px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #eee', borderRadius: '8px' }}>
        <p className="text-gray-500">No summary available to generate a mind map.</p>
      </div>
    );
  }

  if (!isGenerated && !isLoading && !error && !isSaving) {
    return (
      <div style={{ height: '600px', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '1px solid #eee', borderRadius: '8px', gap: '1rem' }}>
        <Brain className="h-16 w-16 text-gray-400" />
        {/* <h3 className="text-xl font-semibold text-gray-700">{t('generateMindmap')}</h3> */}
        <p className="text-sm text-gray-500 text-center max-w-md">
          {t('Mindmap.generateMindmapDescription')}
        </p>
        <Button 
          onClick={generateMindmap}
          className="mt-2"
          size="lg"
        >
          {t('Mindmap.generateMindmapButton')}
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div style={{ height: '600px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #eee', borderRadius: '8px' }}>
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    );
  }

  if (error || nodes.length === 0) {
    return (
      <div style={{ height: '600px', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '1px solid #eee', borderRadius: '8px', padding: '20px' }}>
        <AlertTriangle className="h-10 w-10 text-red-500 mb-4" />
        <h3 className="text-lg font-semibold text-red-600">Error Generating Mind Map</h3>
        <p className="text-sm text-red-500 text-center">{error}</p>
        <Button 
          onClick={generateMindmap}
          className="mt-4"
          variant="outline"
        >
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div style={{ height: '600px', width: '100%', border: '1px solid #eee', borderRadius: '8px' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onInit={() => setReactFlowReady(true)}
        fitView
        attributionPosition="bottom-left"
      >
        {/* <MiniMap nodeStrokeWidth={3} zoomable pannable /> */}
        <Controls />
        <Background color="#f0f0f0" gap={16} />
      </ReactFlow>
    </div>
  );
};

const Mindmap: React.FC<MindmapProps> = (props) => (
  <ReactFlowProvider>
    <MindmapComponent {...props} />
  </ReactFlowProvider>
);

export default Mindmap;
